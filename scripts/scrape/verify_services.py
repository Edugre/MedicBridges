"""Cross-verify site_services against the FACHC member directory.

The Florida Association of Community Health Centers publishes a per-location
directory (with a Services column) at https://fachc.org/find-a-health-center/.
This script:

1. Downloads and parses the directory table (~520 FL locations).
2. Matches FACHC locations to `fqhc_site` rows by street number + ZIP, with a
   name+city fallback.
3. Maps the FACHC services text onto `service_catalog` ids.
4. Sets `is_verified = true` where FACHC agrees with an existing row from an
   independent source (HRSA UDS or website extraction).
5. Inserts FACHC-only services with data_source='FACHC directory'.
6. Writes a discrepancy/match report to data/output/fachc_verification_report.csv.

Note: AHCA FloridaHealthFinder was evaluated as a second verification source,
but its facility locator is a JS application with no bulk export, and FQHCs are
generally exempt from AHCA health care clinic licensure, so it provides no
usable per-site service data. Pharmacy presence is independently corroborated
by OPAIS 340B data in etl_340b_pharmacy.py.

Usage:
    python -m scripts.scrape.verify_services [--state FL]
"""

from __future__ import annotations

import argparse
import csv
import difflib
import os
import re
from datetime import datetime, timezone

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from supabase import create_client

from scripts.paths import FACHC_CACHE, FACHC_REPORT_CSV, ROOT, ensure_data_dirs
from scripts.scrape.scrape_site_services import PATTERNS, normalize_supabase_url

FACHC_URL = "https://fachc.org/find-a-health-center/"
DATA_SOURCE = "FACHC directory"
USER_AGENT = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)


def fetch_directory_html() -> str:
    if FACHC_CACHE.exists():
        return FACHC_CACHE.read_text(encoding="utf-8", errors="ignore")
    ensure_data_dirs()
    response = requests.get(FACHC_URL, headers={"User-Agent": USER_AGENT}, timeout=60)
    response.raise_for_status()
    FACHC_CACHE.write_text(response.text, encoding="utf-8")
    return response.text


def parse_directory(html: str) -> list[dict]:
    soup = BeautifulSoup(html, "lxml")
    table = soup.find("table")
    if table is None:
        raise ValueError("FACHC directory table not found on page.")
    headers = [th.get_text(strip=True).lower() for th in table.find_all("th")]
    rows: list[dict] = []
    for tr in table.find("tbody").find_all("tr"):
        cells = [td.get_text(" ", strip=True) for td in tr.find_all("td")]
        if len(cells) != len(headers):
            continue
        row = dict(zip(headers, cells))
        rows.append(
            {
                "name": row.get("location name", ""),
                "street": row.get("street address", ""),
                "city": row.get("city, state", "").split(",")[0].strip(),
                "zip": row.get("zip", "")[:5],
                "services_text": row.get("services", ""),
            }
        )
    return rows


def services_from_text(text: str) -> set[int]:
    found: set[int] = set()
    for service_id, (strong, weak) in PATTERNS.items():
        if any(p.search(text) for p in strong) or any(p.search(text) for p in weak):
            found.add(service_id)
    return found


def street_key(address: str | None) -> tuple[str, str] | None:
    """(street number, first street-name token) for fuzzy-free matching."""
    if not address:
        return None
    cleaned = re.sub(r"[^a-z0-9 ]", " ", address.lower())
    match = re.match(r"\s*(\d+)\s+(?:[nsew]w?\s+)?([a-z0-9]+)", cleaned)
    if not match:
        return None
    return match.group(1), match.group(2)


def fetch_sites(client, state: str) -> list[dict]:
    sites: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        response = (
            client.table("fqhc_site")
            .select("bphc_site_num,site_name,site_address,site_city,site_zip_cd")
            .eq("site_state_abbr", state)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        sites.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return sites


def match_locations(fachc_rows: list[dict], sites: list[dict]) -> list[tuple[dict, dict, str]]:
    """Return (fachc_row, site, match_method) pairs."""
    by_zip_street: dict[tuple, list[dict]] = {}
    by_city: dict[str, list[dict]] = {}
    for site in sites:
        zip5 = (site.get("site_zip_cd") or "")[:5]
        key = street_key(site.get("site_address"))
        if zip5 and key:
            by_zip_street.setdefault((zip5, key[0]), []).append(site)
        city = (site.get("site_city") or "").strip().lower()
        by_city.setdefault(city, []).append(site)

    matches: list[tuple[dict, dict, str]] = []
    for row in fachc_rows:
        key = street_key(row["street"])
        candidates = by_zip_street.get((row["zip"], key[0]), []) if key else []
        if len(candidates) == 1:
            matches.append((row, candidates[0], "address"))
            continue
        if len(candidates) > 1 and key:
            named = [
                s for s in candidates
                if (street_key(s.get("site_address")) or ("", ""))[1] == key[1]
            ]
            if len(named) >= 1:
                matches.append((row, named[0], "address"))
                continue
        # Fallback: best name match within the same city.
        city_sites = by_city.get(row["city"].lower(), [])
        best, best_score = None, 0.0
        for site in city_sites:
            score = difflib.SequenceMatcher(
                None, row["name"].lower(), (site.get("site_name") or "").lower()
            ).ratio()
            if score > best_score:
                best, best_score = site, score
        if best is not None and best_score >= 0.85:
            matches.append((row, best, "name"))
    return matches


def fetch_existing_services(client, site_nums: list[str]) -> dict[tuple[str, int], dict]:
    existing: dict[tuple[str, int], dict] = {}
    chunk_size = 50
    page_size = 1000
    for start in range(0, len(site_nums), chunk_size):
        chunk = site_nums[start : start + chunk_size]
        offset = 0
        while True:
            response = (
                client.table("site_services")
                .select("bphc_site_num,service_id,data_source,is_verified")
                .in_("bphc_site_num", chunk)
                .range(offset, offset + page_size - 1)
                .execute()
            )
            rows = response.data or []
            for row in rows:
                existing[(row["bphc_site_num"], row["service_id"])] = row
            if len(rows) < page_size:
                break
            offset += page_size
    return existing


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", default="FL")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")
    client = create_client(normalize_supabase_url(supabase_url), supabase_key)

    fachc_rows = parse_directory(fetch_directory_html())
    print(f"FACHC directory: {len(fachc_rows)} locations")

    sites = fetch_sites(client, args.state.upper())
    matches = match_locations(fachc_rows, sites)
    print(f"Matched {len(matches)} FACHC locations to fqhc_site rows")

    matched_site_nums = [site["bphc_site_num"] for _, site, _ in matches]
    existing = fetch_existing_services(client, matched_site_nums)

    extracted_at = datetime.now(timezone.utc).isoformat()
    to_verify: list[tuple[str, int]] = []
    to_insert: dict[tuple[str, int], dict] = {}
    report_rows: list[dict] = []

    for fachc_row, site, method in matches:
        service_ids = services_from_text(fachc_row["services_text"])
        for service_id in sorted(service_ids):
            pair = (site["bphc_site_num"], service_id)
            current = existing.get(pair)
            if current is None or current["data_source"] == "Federal Mandate Assumption":
                to_insert[pair] = {
                    "bphc_site_num": site["bphc_site_num"],
                    "service_id": service_id,
                    "data_source": DATA_SOURCE,
                    "is_verified": False,
                    "source_url": FACHC_URL,
                    "confidence": None,
                    "extracted_at": extracted_at,
                }
                status = "fachc_only"
            elif current["data_source"] != DATA_SOURCE:
                if not current["is_verified"] and pair not in to_verify:
                    to_verify.append(pair)
                status = f"verified_against:{current['data_source']}"
            else:
                status = "already_fachc"
            report_rows.append(
                {
                    "bphc_site_num": site["bphc_site_num"],
                    "site_name": site.get("site_name"),
                    "fachc_name": fachc_row["name"],
                    "match_method": method,
                    "service_id": service_id,
                    "status": status,
                }
            )

    matched_fachc = {id(row) for row, _, _ in matches}
    for row in fachc_rows:
        if id(row) not in matched_fachc:
            report_rows.append(
                {
                    "bphc_site_num": "",
                    "site_name": "",
                    "fachc_name": f"{row['name']} | {row['street']}, {row['city']} {row['zip']}",
                    "match_method": "unmatched",
                    "service_id": "",
                    "status": "fachc_location_not_matched",
                }
            )

    print(f"Marking {len(to_verify)} (site, service) pairs verified")
    by_service: dict[int, list[str]] = {}
    for site_num, service_id in to_verify:
        by_service.setdefault(service_id, []).append(site_num)
    for service_id, site_nums in by_service.items():
        for start in range(0, len(site_nums), 200):
            chunk = site_nums[start : start + 200]
            (
                client.table("site_services")
                .update({"is_verified": True})
                .eq("service_id", service_id)
                .in_("bphc_site_num", chunk)
                .execute()
            )

    insert_rows = list(to_insert.values())
    print(f"Inserting {len(insert_rows)} FACHC-only service rows")
    for start in range(0, len(insert_rows), 500):
        batch = insert_rows[start : start + 500]
        client.table("site_services").upsert(batch, on_conflict="bphc_site_num,service_id").execute()

    with FACHC_REPORT_CSV.open("w", newline="") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=["bphc_site_num", "site_name", "fachc_name", "match_method", "service_id", "status"],
        )
        writer.writeheader()
        writer.writerows(report_rows)
    print(f"Report written to {FACHC_REPORT_CSV}")
    print("Verification complete.")


if __name__ == "__main__":
    main()
