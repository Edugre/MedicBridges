"""ETL: OPAIS shipping addresses -> staging -> shipping_address, then reconcile
covered entities to HRSA organizations.

Run this AFTER etl_ce and etl_fqhc_sites so both ID universes exist:
1. Loads shipping addresses for in-scope covered entities (transform filters by FK).
2. Reconciles each covered_entity to an organization by grant_number -> NPI ->
   shared address, recording match_method + match_confidence.

Usage:
    python -m scripts.etl.etl_340b_pharmacy
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.db import enqueue_geocodes, get_client, load_staging
from scripts.etl.etl_ce import extract_records, resolve_json_path
from scripts.supabase_etl import etl_run, utc_now_iso

STAGING_TABLE = "opais_shipping_address"
STAGE_RPC = "stage_opais_shipping_address"


def extract_shipping_records(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    for entity in entities:
        opais_id = entity.get("id340B") or entity.get("340B ID") or entity.get("opais_id")
        if not opais_id:
            continue
        for shipping in entity.get("shippingAddresses") or entity.get("shipping_addresses") or []:
            if not isinstance(shipping, dict):
                continue
            rows.append(
                {
                    "opais_id": str(opais_id).strip(),
                    "shipping_organization": shipping.get("organization") or shipping.get("shipping_organization"),
                    "address_line_1": shipping.get("addressLine1") or shipping.get("address_line_1"),
                    "city": shipping.get("city"),
                    "state": shipping.get("state"),
                    "zip_code": shipping.get("zip") or shipping.get("zip_code"),
                }
            )
    return rows


def load_source(json_path: Path) -> list[dict[str, Any]]:
    with json_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return extract_shipping_records(extract_records(payload))


def main() -> None:
    json_path = resolve_json_path()
    client = get_client()
    records = load_source(json_path)
    print(f"Read {len(records)} shipping address records from {json_path.name}")

    with etl_run(client, "etl_shipping_and_reconcile", source_file=json_path.name) as run:
        run_ts = utc_now_iso()
        staged = load_staging(
            client, STAGING_TABLE, STAGE_RPC, records, source_file=json_path.name,
        )
        print(f"Staged {staged} rows; running transform...")
        shipping = client.rpc("transform_shipping_addresses", {"p_ts": run_ts}).execute().data
        print(f"Shipping addresses (in-scope) upserted: {shipping}")

        linked = client.rpc("reconcile_covered_entities", {}).execute().data
        print(f"Covered entities linked to an organization: {linked}")

        queued = enqueue_geocodes(client)
        print(f"Locations queued for geocoding: {queued}")
        run.add_rows(int(shipping or 0))

    print("ETL complete.")


if __name__ == "__main__":
    main()
