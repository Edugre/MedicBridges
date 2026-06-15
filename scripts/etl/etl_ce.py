"""ETL: OPAIS 340B covered entity JSON -> staging.opais_covered_entity -> covered_entity.

Staging-first. The transform RPC applies the health-center scope filter
(CH / FQHCLA), upserts by opais_id, links/dedups locations, and soft-deactivates
entities that dropped out of the latest export.

Usage:
    python -m scripts.etl.etl_ce
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.db import enqueue_geocodes, get_client, load_staging
from scripts.paths import resolve_opais_json
from scripts.supabase_etl import etl_run, utc_now_iso

# Flat OPAIS export header -> staging column.
COLUMN_MAP = {
    "340B ID": "opais_id",
    "CE ID": "ce_id",
    "Entity Type": "entity_type",
    "Entity Name": "entity_name",
    "Grant Number": "grant_number",
    "NPI": "npi",
    "Participating": "is_participating",
    "Participating Start Date": "participating_start_date",
    "Termination Date": "termination_date",
    "Street Address 1": "address_line_1",
    "City": "city",
    "State": "state",
    "Zip Code": "zip_code",
    "Edit Date": "hrsa_edit_date",
}

STAGING_TABLE = "opais_covered_entity"
STAGE_RPC = "stage_opais_covered_entity"


def resolve_json_path() -> Path:
    return resolve_opais_json()


def extract_records(data: Any) -> list[dict[str, Any]]:
    """Find the list of covered-entity records inside the JSON root."""
    if isinstance(data, list):
        return data
    if isinstance(data, dict):
        for key in ("CoveredEntities", "coveredEntities", "covered_entities", "data", "records"):
            value = data.get(key)
            if isinstance(value, list):
                return value
        list_values = [value for value in data.values() if isinstance(value, list)]
        if len(list_values) == 1:
            return list_values[0]
        if list_values:
            return max(list_values, key=len)
    raise ValueError("Could not find covered entity records in JSON root.")


def flatten_api_record(record: dict[str, Any]) -> dict[str, Any]:
    street_address = record.get("streetAddress") or {}
    npi_numbers = record.get("npiNumbers") or []
    npi = npi_numbers[0].get("npiNumber") if npi_numbers else None
    ce_id = record.get("ceId")
    return {
        "opais_id": record.get("id340B"),
        "ce_id": str(ce_id) if ce_id is not None else None,
        "entity_type": record.get("entityType"),
        "entity_name": record.get("name"),
        "grant_number": record.get("grantNumber"),
        "npi": npi,
        "is_participating": record.get("participating"),
        "participating_start_date": record.get("participatingStartDate"),
        "termination_date": record.get("terminationDate"),
        "address_line_1": street_address.get("addressLine1"),
        "city": street_address.get("city"),
        "state": street_address.get("state"),
        "zip_code": street_address.get("zip"),
        "hrsa_edit_date": record.get("editDate"),
    }


def normalize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        return []
    sample = records[0]
    if "340B ID" in sample or "Entity Type" in sample:
        return [{COLUMN_MAP[key]: record.get(key) for key in COLUMN_MAP} for record in records]
    if "id340B" in sample or "entityType" in sample:
        return [flatten_api_record(record) for record in records]
    raise ValueError(
        "Unsupported JSON record format. Expected flat OPAIS export keys or API camelCase keys."
    )


def load_source(json_path: Path) -> list[dict[str, Any]]:
    with json_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return normalize_records(extract_records(payload))


def main() -> None:
    json_path = resolve_json_path()
    client = get_client()
    records = load_source(json_path)
    print(f"Read {len(records)} covered entity records from {json_path.name}")

    with etl_run(client, "etl_ce", source_file=json_path.name) as run:
        run_ts = utc_now_iso()
        staged = load_staging(
            client, STAGING_TABLE, STAGE_RPC, records, source_file=json_path.name,
        )
        print(f"Staged {staged} rows; running transform...")
        upserted = client.rpc("transform_covered_entities", {"p_ts": run_ts}).execute().data
        queued = enqueue_geocodes(client)
        print(f"Covered entities (in-scope) upserted: {upserted}")
        print(f"Locations queued for geocoding: {queued}")
        run.add_rows(int(upserted or 0))

    print("ETL complete.")


if __name__ == "__main__":
    main()
