"""ETL: OPAIS shipping addresses -> ce_shipping_address, plus in-house 340B
pharmacy flags on site_services.

1. Loads shipping addresses for every covered entity present in the `ce` table
   from the OPAIS daily export JSON into `ce_shipping_address` (idempotent:
   existing rows for those entities are replaced).
2. Matches covered-entity 340B street/shipping addresses against `fqhc_site`
   addresses in the target state and records service_id 13
   (Pharmacy / 340B Dispensary) in `site_services`. When another source already
   claims the service for that site, the row is marked verified instead.
3. Reports health center orgs in the state that have no 340B covered entity.

Usage:
    python -m scripts.etl.etl_340b_pharmacy [--state FL]
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from supabase import create_client

from scripts.address import address_match_key
from scripts.etl.etl_ce import extract_records, resolve_json_path
from scripts.paths import ROOT
from scripts.scrape.scrape_site_services import normalize_supabase_url

PHARMACY_SERVICE_ID = 13
DATA_SOURCE = "OPAIS 340B (address match)"
SOURCE_URL = "https://340bopais.hrsa.gov/coveredentitysearch"
BATCH_SIZE = 500


def load_shipping_addresses(known_opais_ids: set[str]) -> list[dict]:
    json_path = resolve_json_path()
    print(f"Parsing {json_path.name} ...")
    with json_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    records = extract_records(payload)

    rows: list[dict] = []
    for record in records:
        opais_id = record.get("id340B") or record.get("340B ID")
        if not opais_id or opais_id not in known_opais_ids:
            continue
        for shipping in record.get("shippingAddresses") or []:
            address_line_1 = (shipping.get("addressLine1") or "").strip()
            if not address_line_1:
                continue
            rows.append(
                {
                    "opais_id": opais_id,
                    "shipping_organization": (shipping.get("organization") or "").strip() or None,
                    "address_line_1": address_line_1[:255],
                    "city": (shipping.get("city") or "").strip() or None,
                    "state": (shipping.get("state") or "").strip() or None,
                    "zip_code": (shipping.get("zip") or "").strip() or None,
                }
            )
    return rows


def fetch_all(client, table: str, columns: str, filters=None) -> list[dict]:
    rows: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        query = client.table(table).select(columns)
        if filters:
            query = filters(query)
        response = query.range(offset, offset + page_size - 1).execute()
        batch = response.data or []
        rows.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return rows


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", default="FL")
    args = parser.parse_args()
    state = args.state.upper()

    load_dotenv(ROOT / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")
    client = create_client(normalize_supabase_url(supabase_url), supabase_key)

    ce_rows = fetch_all(client, "ce", "opais_id,grant_number,entity_name,address_line_1,zip_code,state")
    known_ids = {row["opais_id"] for row in ce_rows}
    print(f"{len(ce_rows)} covered entities in ce table")

    shipping_rows = load_shipping_addresses(known_ids)
    print(f"Extracted {len(shipping_rows)} shipping addresses")

    opais_ids = sorted({row["opais_id"] for row in shipping_rows})
    for start in range(0, len(opais_ids), 200):
        chunk = opais_ids[start : start + 200]
        client.table("ce_shipping_address").delete().in_("opais_id", chunk).execute()
    for start in range(0, len(shipping_rows), BATCH_SIZE):
        batch = shipping_rows[start : start + BATCH_SIZE]
        client.table("ce_shipping_address").insert(batch).execute()
        print(f"Inserted shipping rows {start + 1}-{min(start + BATCH_SIZE, len(shipping_rows))}")

    # Build the set of 340B dispensing-location address keys for the state:
    # CE street addresses plus their shipping addresses.
    state_ce = [row for row in ce_rows if (row.get("state") or "").upper() == state]
    state_ce_ids = {row["opais_id"] for row in state_ce}
    address_keys: set[str] = set()
    for row in state_ce:
        key = address_match_key(row.get("address_line_1"), row.get("zip_code"))
        if key:
            address_keys.add(key)
    for row in shipping_rows:
        if row["opais_id"] in state_ce_ids and (row.get("state") or "").upper() == state:
            key = address_match_key(row.get("address_line_1"), row.get("zip_code"))
            if key:
                address_keys.add(key)
    print(f"{len(address_keys)} distinct 340B address keys in {state}")

    sites = fetch_all(
        client,
        "fqhc_site",
        "bphc_site_num,site_address,site_zip_cd,hcp_merged_grant_lal_key,hcc_typ_desc",
        filters=lambda q: q.eq("site_state_abbr", state),
    )
    pharmacy_sites = [
        site
        for site in sites
        if "Service Delivery" in (site.get("hcc_typ_desc") or "")
        and address_match_key(site.get("site_address"), site.get("site_zip_cd")) in address_keys
    ]
    print(f"{len(pharmacy_sites)} sites match a 340B dispensing address")

    site_nums = [site["bphc_site_num"] for site in pharmacy_sites]
    existing: dict[str, dict] = {}
    for start in range(0, len(site_nums), 200):
        chunk = site_nums[start : start + 200]
        response = (
            client.table("site_services")
            .select("bphc_site_num,data_source,is_verified")
            .eq("service_id", PHARMACY_SERVICE_ID)
            .in_("bphc_site_num", chunk)
            .execute()
        )
        for row in response.data or []:
            existing[row["bphc_site_num"]] = row

    extracted_at = datetime.now(timezone.utc).isoformat()
    to_insert: list[dict] = []
    to_verify: list[str] = []
    for site in pharmacy_sites:
        current = existing.get(site["bphc_site_num"])
        if current is None or current["data_source"] == "Federal Mandate Assumption":
            to_insert.append(
                {
                    "bphc_site_num": site["bphc_site_num"],
                    "service_id": PHARMACY_SERVICE_ID,
                    "data_source": DATA_SOURCE,
                    "is_verified": False,
                    "source_url": SOURCE_URL,
                    "confidence": None,
                    "extracted_at": extracted_at,
                }
            )
        elif current["data_source"] != DATA_SOURCE and not current["is_verified"]:
            to_verify.append(site["bphc_site_num"])

    print(f"Inserting {len(to_insert)} pharmacy service rows; verifying {len(to_verify)}")
    for start in range(0, len(to_insert), BATCH_SIZE):
        client.table("site_services").upsert(
            to_insert[start : start + BATCH_SIZE], on_conflict="bphc_site_num,service_id"
        ).execute()
    for start in range(0, len(to_verify), 200):
        chunk = to_verify[start : start + 200]
        (
            client.table("site_services")
            .update({"is_verified": True})
            .eq("service_id", PHARMACY_SERVICE_ID)
            .in_("bphc_site_num", chunk)
            .execute()
        )

    # Orgs with sites in the state but no linked 340B covered entity.
    state_grants = {site["hcp_merged_grant_lal_key"] for site in sites if site.get("hcp_merged_grant_lal_key")}
    state_orgs: list[dict] = []
    if state_grants:
        state_orgs = fetch_all(
            client,
            "health_center_org",
            "grant_number,org_name,opais_id",
            filters=lambda q: q.in_("grant_number", sorted(state_grants)),
        )
    unlinked = sorted(
        f"{org['grant_number']} ({org.get('org_name') or 'unknown'})"
        for org in state_orgs
        if org.get("grant_number") in state_grants and org.get("opais_id") is None
    )
    print(f"{state} orgs without a 340B covered entity link: {unlinked or 'none'}")
    print("340B ETL complete.")


if __name__ == "__main__":
    main()
