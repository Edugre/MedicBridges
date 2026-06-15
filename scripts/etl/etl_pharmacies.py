"""ETL: OPAIS 340B contract pharmacies -> staging.opais_contract_pharmacy -> contract_pharmacy.

Staging-first. The transform RPC keeps ONLY pharmacies whose covered entity is
in scope (present in public.covered_entity), which is what makes the hard FK
contract_pharmacy.opais_id -> covered_entity possible. Run this AFTER etl_ce.

Usage:
    python -m scripts.etl.etl_pharmacies
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from scripts.db import enqueue_geocodes, get_client, load_staging
from scripts.etl.etl_ce import extract_records, resolve_json_path
from scripts.supabase_etl import etl_run, utc_now_iso

STAGING_TABLE = "opais_contract_pharmacy"
STAGE_RPC = "stage_opais_contract_pharmacy"

FLAT_PHARMACY_COLUMN_MAP = {
    "Pharmacy ID": "pharmacy_id",
    "Pharmacy Name": "pharmacy_name",
    "Contract Begin Date": "contract_begin_date",
    "Contract Termination Date": "contract_term_date",
    "Contract Term Date": "contract_term_date",
    "Street Address 1": "address_line_1",
    "Address Line 1": "address_line_1",
    "City": "city",
    "State": "state",
    "Zip Code": "zip_code",
    "Phone Number": "phone_number",
    "Phone": "phone_number",
}

PHARMACY_ARRAY_KEYS = ("contractPharmacies", "Contract Pharmacies", "contract_pharmacies")


def get_entity_opais_id(entity: dict[str, Any]) -> str | None:
    for key in ("340B ID", "id340B", "opais_id"):
        value = entity.get(key)
        if value is not None and str(value).strip():
            return str(value).strip()
    return None


def get_pharmacy_array(entity: dict[str, Any]) -> list[dict[str, Any]]:
    for key in PHARMACY_ARRAY_KEYS:
        value = entity.get(key)
        if isinstance(value, list):
            return value
    return []


def flatten_api_pharmacy(opais_id: str | None, record: dict[str, Any]) -> dict[str, Any]:
    address = record.get("address") or {}
    pharmacy_id = record.get("pharmacyId") or record.get("pharmacy_id")
    return {
        "pharmacy_id": str(pharmacy_id) if pharmacy_id is not None else None,
        "opais_id": opais_id,
        "pharmacy_name": record.get("name") or record.get("pharmacyName"),
        "contract_begin_date": record.get("beginDate") or record.get("contractBeginDate"),
        "contract_term_date": record.get("terminationDate") or record.get("contractTermDate"),
        "address_line_1": address.get("addressLine1") or record.get("addressLine1"),
        "city": address.get("city") or record.get("city"),
        "state": address.get("state") or record.get("state"),
        "zip_code": address.get("zip") or record.get("zip"),
        "phone_number": record.get("phoneNumber") or record.get("phone"),
    }


def flatten_flat_pharmacy(opais_id: str | None, record: dict[str, Any]) -> dict[str, Any]:
    mapped: dict[str, Any] = {"opais_id": opais_id}
    for source_key, target_key in FLAT_PHARMACY_COLUMN_MAP.items():
        if source_key in record and target_key not in mapped:
            mapped[target_key] = record.get(source_key)
    if "pharmacy_id" not in mapped:
        pharmacy_id = record.get("Pharmacy ID") or record.get("pharmacyId")
        mapped["pharmacy_id"] = str(pharmacy_id) if pharmacy_id is not None else None
    if "pharmacy_name" not in mapped:
        mapped["pharmacy_name"] = record.get("Pharmacy Name") or record.get("name")
    return mapped


def detect_pharmacy_format(pharmacy: dict[str, Any]) -> str:
    if "pharmacyId" in pharmacy or "beginDate" in pharmacy or "address" in pharmacy:
        return "api"
    if "Pharmacy ID" in pharmacy or "Pharmacy Name" in pharmacy:
        return "flat"
    return "api"


def extract_pharmacy_records(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for entity in entities:
        opais_id = get_entity_opais_id(entity)
        pharmacies = get_pharmacy_array(entity)
        if not pharmacies:
            continue
        flatten = flatten_api_pharmacy if detect_pharmacy_format(pharmacies[0]) == "api" else flatten_flat_pharmacy
        for pharmacy in pharmacies:
            if isinstance(pharmacy, dict):
                records.append(flatten(opais_id, pharmacy))
    return records


def load_source(json_path: Path) -> list[dict[str, Any]]:
    with json_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)
    return extract_pharmacy_records(extract_records(payload))


def main() -> None:
    json_path = resolve_json_path()
    client = get_client()
    records = load_source(json_path)
    print(f"Read {len(records)} contract pharmacy records from {json_path.name}")

    with etl_run(client, "etl_pharmacies", source_file=json_path.name) as run:
        run_ts = utc_now_iso()
        staged = load_staging(
            client, STAGING_TABLE, STAGE_RPC, records, source_file=json_path.name,
        )
        print(f"Staged {staged} rows; running transform (in-scope only)...")
        upserted = client.rpc("transform_contract_pharmacies", {"p_ts": run_ts}).execute().data
        queued = enqueue_geocodes(client)
        print(f"Contract pharmacies (in-scope) upserted: {upserted}")
        print(f"Locations queued for geocoding: {queued}")
        run.add_rows(int(upserted or 0))

    print("ETL complete.")


if __name__ == "__main__":
    main()
