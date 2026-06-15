"""OSM-only geocoding worker driven by public.geocode_queue.

Pulls due jobs (status 'queued', or 'failed' past its backoff), geocodes the
linked location via Nominatim respecting the ~1 req/s usage policy, and writes
the result back to public.location:

  - success  -> latitude/longitude + geocode_status='ok' (+ source, geocoded_at)
  - not found -> retried with backoff; after MAX_ATTEMPTS the location is marked
                 'needs_review' and the job 'failed'

A coordinate is NEVER used as a flag: failures leave latitude/longitude NULL.

Usage:
    python -m scripts.geocode.run_geocode_queue [--limit N]
    python -m scripts.geocode.run_geocode_queue --state FL
    python -m scripts.geocode.run_geocode_queue --state FL --resource-type both
    python -m scripts.geocode.run_geocode_queue --state FL --resource-type site --limit 50
"""

from __future__ import annotations

import argparse
import sys
import time
from datetime import datetime, timedelta, timezone

import requests

from scripts.db import get_client

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "MedicBridges/2.0 (eduardogoncalvez00@gmail.com)"
RATE_LIMIT_SECONDS = 1.1
MAX_ATTEMPTS = 3
FETCH_BATCH = 100
ID_CHUNK = 150
PAGE_SIZE = 1000
RETRY_BACKOFF = timedelta(days=1)

QUEUE_SELECT = "id,attempts,status,location:location_id(id,address_line_1,city,state,zip)"


class RateLimitError(RuntimeError):
    """Raised when Nominatim keeps returning 429 after extended backoff."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def normalize_state(state: str | None) -> str | None:
    if not state:
        return None
    code = state.strip().upper()
    if len(code) != 2 or not code.isalpha():
        raise ValueError(f"Invalid state code: {state!r} (expected 2-letter code, e.g. FL)")
    return code


def build_address(loc: dict) -> str:
    parts = [loc.get(f) for f in ("address_line_1", "city", "state", "zip")]
    return ", ".join(str(p).strip() for p in parts if p and str(p).strip())


def geocode(address: str) -> tuple[float, float] | None:
    """Return (lat, lon) from Nominatim, None if not found. Retries on 429."""
    for attempt in range(10):
        response = requests.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1, "countrycodes": "us"},
            headers={"User-Agent": USER_AGENT},
            timeout=30,
        )
        if response.status_code == 429:
            wait = max(int(response.headers.get("Retry-After", 0) or 0), 60 * (attempt + 1))
            print(f"  rate limited; waiting {wait}s")
            time.sleep(wait)
            continue
        response.raise_for_status()
        results = response.json()
        time.sleep(RATE_LIMIT_SECONDS)
        if not results:
            return None
        return float(results[0]["lat"]), float(results[0]["lon"])
    raise RateLimitError(f"Nominatim still rate limiting after retries for: {address}")


def _active_location_ids(client, table: str, state: str | None) -> set[str]:
    """Collect location ids linked to active rows in site or contract_pharmacy."""
    ids: set[str] = set()
    offset = 0
    while True:
        query = (
            client.table(table)
            .select("location_id, location!inner(state)")
            .eq("is_active", True)
            .not_.is_("location_id", "null")
        )
        if state:
            query = query.eq("location.state", state)
        response = query.range(offset, offset + PAGE_SIZE - 1).execute()
        rows = response.data or []
        for row in rows:
            loc_id = row.get("location_id")
            if loc_id:
                ids.add(loc_id)
        if len(rows) < PAGE_SIZE:
            break
        offset += PAGE_SIZE
    return ids


def resolve_location_ids(
    client,
    *,
    state: str | None,
    resource_type: str | None,
) -> frozenset[str] | None:
    """Return scoped location ids, or None when no resource-type filter applies."""
    if not resource_type:
        return None

    ids: set[str] = set()
    if resource_type in ("site", "both"):
        ids |= _active_location_ids(client, "site", state)
    if resource_type in ("pharmacy", "both"):
        ids |= _active_location_ids(client, "contract_pharmacy", state)
    return frozenset(ids)


def fetch_due_jobs(
    client,
    limit: int,
    *,
    state: str | None = None,
    location_ids: frozenset[str] | None = None,
) -> list[dict]:
    now_iso = utc_now().isoformat()

    if location_ids is not None and not location_ids:
        return []

    def base_query():
        return (
            client.table("geocode_queue")
            .select(QUEUE_SELECT)
            .in_("status", ["queued", "failed"])
            .lte("next_attempt_at", now_iso)
            .order("next_attempt_at")
        )

    if location_ids is not None:
        jobs: list[dict] = []
        id_list = list(location_ids)
        for start in range(0, len(id_list), ID_CHUNK):
            chunk = id_list[start : start + ID_CHUNK]
            remaining = None if limit is None else max(limit - len(jobs), 0)
            if remaining == 0:
                break
            query = base_query().in_("location_id", chunk)
            if remaining is not None:
                query = query.limit(remaining)
            response = query.execute()
            jobs.extend(j for j in (response.data or []) if j.get("location"))
            if limit is not None and len(jobs) >= limit:
                return jobs[:limit]
        return jobs

    query = base_query()
    if state:
        query = query.eq("location.state", state)
    if limit is not None:
        query = query.limit(limit)
    response = query.execute()
    return [j for j in (response.data or []) if j.get("location")]


def mark_success(client, job: dict, lat: float, lon: float) -> None:
    loc_id = job["location"]["id"]
    client.table("location").update(
        {
            "latitude": lat,
            "longitude": lon,
            "geocode_status": "ok",
            "geocode_source": "nominatim",
            "geocoded_at": utc_now().isoformat(),
        }
    ).eq("id", loc_id).execute()
    client.table("geocode_queue").update(
        {"status": "done", "attempts": job["attempts"] + 1, "last_attempt_at": utc_now().isoformat(), "error": None}
    ).eq("id", job["id"]).execute()


def mark_failure(client, job: dict, reason: str) -> None:
    attempts = job["attempts"] + 1
    loc_id = job["location"]["id"]
    if attempts >= MAX_ATTEMPTS:
        # give up: never store a sentinel coordinate -> leave NULL, flag for review
        client.table("location").update(
            {"latitude": None, "longitude": None, "geocode_status": "needs_review", "geocode_source": "nominatim"}
        ).eq("id", loc_id).execute()
        client.table("geocode_queue").update(
            {"status": "failed", "attempts": attempts, "last_attempt_at": utc_now().isoformat(), "error": reason}
        ).eq("id", job["id"]).execute()
    else:
        next_at = (utc_now() + RETRY_BACKOFF).isoformat()
        client.table("geocode_queue").update(
            {"status": "queued", "attempts": attempts, "last_attempt_at": utc_now().isoformat(),
             "next_attempt_at": next_at, "error": reason}
        ).eq("id", job["id"]).execute()


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--limit", type=int, default=None, help="Max jobs to process this run")
    parser.add_argument(
        "--state",
        type=str,
        default=None,
        help="Only geocode locations in this US state (2-letter code, e.g. FL)",
    )
    parser.add_argument(
        "--resource-type",
        choices=("site", "pharmacy", "both"),
        default=None,
        help="Only geocode locations linked to active sites and/or contract pharmacies",
    )
    args = parser.parse_args(argv)

    state = normalize_state(args.state)
    client = get_client()
    location_ids = resolve_location_ids(client, state=state, resource_type=args.resource_type)

    if state or args.resource_type:
        scope = []
        if state:
            scope.append(f"state={state}")
        if args.resource_type:
            scope.append(f"resource_type={args.resource_type}")
        print(f"Scope: {', '.join(scope)}")
        if location_ids is not None:
            print(f"  {len(location_ids)} location(s) linked to selected resource type(s)")

    processed = succeeded = failed = 0

    while True:
        remaining = None if args.limit is None else args.limit - processed
        if remaining is not None and remaining <= 0:
            break
        batch_size = FETCH_BATCH if remaining is None else min(FETCH_BATCH, remaining)
        jobs = fetch_due_jobs(
            client,
            batch_size,
            state=state if location_ids is None else None,
            location_ids=location_ids,
        )
        if not jobs:
            break

        for job in jobs:
            processed += 1
            address = build_address(job["location"])
            if not address:
                mark_failure(client, job, "no address")
                failed += 1
                print(f"[{processed}] no address -> needs_review/backoff")
                continue
            coords = geocode(address)
            if coords is None:
                mark_failure(client, job, "not found")
                failed += 1
                print(f"[{processed}] not found: {address}")
            else:
                mark_success(client, job, *coords)
                succeeded += 1
                print(f"[{processed}] ok: {address} -> {coords[0]:.5f},{coords[1]:.5f}")

    print(f"\nDone. processed={processed} ok={succeeded} failed/deferred={failed}")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.", file=sys.stderr)
        sys.exit(130)
    except RateLimitError as exc:
        print(f"\n{exc}", file=sys.stderr)
        sys.exit(1)
    except ValueError as exc:
        print(f"\n{exc}", file=sys.stderr)
        sys.exit(2)
