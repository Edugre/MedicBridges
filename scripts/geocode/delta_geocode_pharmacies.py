"""Delta geocoding: fill missing coordinates on ce_contract_pharmacy via Nominatim.

Processes one state at a time:

    python -m scripts.geocode.delta_geocode_pharmacies --state FL
"""

from __future__ import annotations

import argparse
import os
import sys
import time
from typing import Any
import requests
from dotenv import load_dotenv
from supabase import Client, create_client

from scripts.paths import ROOT

PAGE_SIZE = 1000
TABLE_NAME = "ce_contract_pharmacy"
PRIMARY_KEY = "pharmacy_id"
NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
USER_AGENT = "HealthcareClinicFinderApp/1.0 (eduardogoncalvez00@gmail.com)"
DEAD_COORDINATE = 0.0
RATE_LIMIT_SECONDS = 2.0

SELECT_COLUMNS = (
    "pharmacy_id",
    "pharmacy_name",
    "address_line_1",
    "city",
    "state",
    "zip_code",
)


def normalize_supabase_url(url: str) -> str:
    """Return the base project URL expected by the Supabase Python client."""
    return url.rstrip("/").removesuffix("/rest/v1")


def build_address(record: dict[str, Any]) -> str:
    """Concatenate address fields, omitting empty or null values."""
    parts: list[str] = []
    for field in ("address_line_1", "city", "state", "zip_code"):
        value = record.get(field)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            parts.append(text)
    return ", ".join(parts)


def iter_incomplete_record_pages(client: Client, state: str):
    """Yield pages of NULL-latitude pharmacies for a state until none remain."""
    page = 0
    while True:
        response = (
            client.table(TABLE_NAME)
            .select(",".join(SELECT_COLUMNS))
            .eq("state", state)
            .is_("latitude", "null")
            .order(PRIMARY_KEY)
            .range(0, PAGE_SIZE - 1)
            .execute()
        )
        records = response.data or []
        if not records:
            break
        page += 1
        print(
            f"Fetched page {page} ({state}): "
            f"{len(records)} pharmacy record(s) with missing coordinates."
        )
        yield records


class RateLimitError(RuntimeError):
    """Raised when Nominatim keeps returning 429 after extended backoff."""


def geocode_address(address: str) -> tuple[float, float] | None:
    """Return (latitude, longitude) from Nominatim, or None if not found."""
    max_retries = 10
    for attempt in range(max_retries):
        response = requests.get(
            NOMINATIM_URL,
            params={"q": address, "format": "json", "limit": 1},
            headers={"User-Agent": USER_AGENT},
            timeout=30,
        )
        if response.status_code == 429:
            header_wait = int(response.headers.get("Retry-After", 0) or 0)
            wait = max(header_wait, 60 * (attempt + 1))
            print(f"Nominatim rate limited; retrying in {wait}s...")
            time.sleep(wait)
            continue
        response.raise_for_status()
        results = response.json()
        time.sleep(RATE_LIMIT_SECONDS)

        if not results:
            return None

        first = results[0]
        return float(first["lat"]), float(first["lon"])

    raise RateLimitError(f"Nominatim rate limit exceeded after {max_retries} retries")


def patch_coordinates(
    client: Client,
    pharmacy_id: str,
    latitude: float,
    longitude: float,
) -> None:
    max_retries = 5
    for attempt in range(max_retries):
        try:
            (
                client.table(TABLE_NAME)
                .update({"latitude": latitude, "longitude": longitude})
                .eq(PRIMARY_KEY, pharmacy_id)
                .execute()
            )
            return
        except Exception as exc:
            if attempt == max_retries - 1:
                raise
            wait = 2**attempt
            print(f"Supabase update failed ({exc}); retrying in {wait}s...")
            time.sleep(wait)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", required=True, help="Two-letter state code (e.g. FL)")
    args = parser.parse_args()
    state = args.state.upper()

    load_dotenv(ROOT / ".env")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    print(f"Geocoding NULL-latitude pharmacies in {state}...")

    geocoded = 0
    flagged_dead = 0
    processed = 0

    for page_num, records in enumerate(iter_incomplete_record_pages(client, state), start=1):
        page_total = len(records)
        for index, record in enumerate(records, start=1):
            processed += 1
            pharmacy_id = record["pharmacy_id"]
            pharmacy_name = record.get("pharmacy_name") or "(unnamed)"
            address = build_address(record)
            label = f"[{state} page {page_num} {index}/{page_total} | total {processed}]"

            if not address:
                latitude, longitude = DEAD_COORDINATE, DEAD_COORDINATE
                flagged_dead += 1
                print(
                    f"{label} No address fields for {pharmacy_name} "
                    f"-> flagged dead (Lat: {latitude}, Lng: {longitude})"
                )
            else:
                coords = geocode_address(address)
                if coords is None:
                    latitude, longitude = DEAD_COORDINATE, DEAD_COORDINATE
                    flagged_dead += 1
                    print(
                        f"{label} Address not found for {pharmacy_name} "
                        f"({address}) -> flagged dead (Lat: {latitude}, Lng: {longitude})"
                    )
                else:
                    latitude, longitude = coords
                    geocoded += 1
                    print(
                        f"{label} Geocoded {pharmacy_name} ({address}) "
                        f"-> Lat: {latitude}, Lng: {longitude}"
                    )

            patch_coordinates(client, pharmacy_id, latitude, longitude)

    if processed == 0:
        print(f"No pharmacies with null latitude found in {state}. Nothing to geocode.")
        return

    print(
        f"\nDone ({state}). Geocoded: {geocoded}, flagged dead: {flagged_dead}, "
        f"total processed: {processed}."
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nInterrupted by user.", file=sys.stderr)
        sys.exit(130)
    except RateLimitError as exc:
        print(f"\n{exc}. Stopping without marking remaining records as dead.", file=sys.stderr)
        sys.exit(1)
