"""ETL: OPAIS 340B contract pharmacy JSON -> Supabase ce_contract_pharmacy table."""

from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

from scripts.paths import ROOT, resolve_opais_json

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

SCHEMA_COLUMNS = (
    "pharmacy_id",
    "opais_id",
    "pharmacy_name",
    "contract_begin_date",
    "contract_term_date",
    "address_line_1",
    "city",
    "state",
    "zip_code",
    "phone_number",
    "latitude",
    "longitude",
)

TABLE_NAME = "ce_contract_pharmacy"
PRIMARY_KEY = "pharmacy_id"
UPSERT_BATCH_SIZE = 1000
DATE_COLUMNS = ("contract_begin_date", "contract_term_date")

PHARMACY_ARRAY_KEYS = (
    "contractPharmacies",
    "Contract Pharmacies",
    "contract_pharmacies",
)


def normalize_supabase_url(url: str) -> str:
    """Return the base project URL expected by the Supabase Python client."""
    return url.rstrip("/").removesuffix("/rest/v1")


def resolve_json_path() -> Path:
    return resolve_opais_json()


def extract_records(data: Any) -> list[dict[str, Any]]:
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


def flatten_api_pharmacy(entity_opais_id: str | None, record: dict[str, Any]) -> dict[str, Any]:
    address = record.get("address") or {}
    pharmacy_id = record.get("pharmacyId") or record.get("pharmacy_id")

    return {
        "pharmacy_id": str(pharmacy_id) if pharmacy_id is not None else None,
        "opais_id": entity_opais_id,
        "pharmacy_name": record.get("name") or record.get("pharmacyName"),
        "contract_begin_date": record.get("beginDate") or record.get("contractBeginDate"),
        "contract_term_date": record.get("terminationDate") or record.get("contractTermDate"),
        "address_line_1": address.get("addressLine1") or record.get("addressLine1"),
        "city": address.get("city") or record.get("city"),
        "state": address.get("state") or record.get("state"),
        "zip_code": address.get("zip") or record.get("zip"),
        "phone_number": record.get("phoneNumber") or record.get("phone"),
        "latitude": None,
        "longitude": None,
    }


def flatten_flat_pharmacy(entity_opais_id: str | None, record: dict[str, Any]) -> dict[str, Any]:
    mapped: dict[str, Any] = {
        "opais_id": entity_opais_id,
        "latitude": None,
        "longitude": None,
    }

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
    if "name" in pharmacy and ("contractId" in pharmacy or "phoneNumber" in pharmacy):
        return "api"
    return "api"


def extract_pharmacy_records(entities: list[dict[str, Any]]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []

    for entity in entities:
        entity_opais_id = get_entity_opais_id(entity)
        pharmacies = get_pharmacy_array(entity)
        if not pharmacies:
            continue

        sample = pharmacies[0]
        pharmacy_format = detect_pharmacy_format(sample)
        flatten = flatten_api_pharmacy if pharmacy_format == "api" else flatten_flat_pharmacy

        for pharmacy in pharmacies:
            if not isinstance(pharmacy, dict):
                continue
            records.append(flatten(entity_opais_id, pharmacy))

    return records


def parse_date(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and math.isnan(value)):
        return None
    if isinstance(value, str) and not value.strip():
        return None
    if pd.isna(value):
        return None

    parsed = pd.to_datetime(value, errors="coerce")
    if pd.isna(parsed):
        return None
    return parsed.strftime("%Y-%m-%d")


def clean_string(value: Any) -> str | None:
    if value is None or (isinstance(value, float) and math.isnan(value)) or pd.isna(value):
        return None
    text = str(value).strip()
    return text or None


def load_and_transform(json_path: Path) -> pd.DataFrame:
    with json_path.open("r", encoding="utf-8") as handle:
        payload = json.load(handle)

    entities = extract_records(payload)
    records = extract_pharmacy_records(entities)
    df = pd.DataFrame(records, columns=SCHEMA_COLUMNS)

    df["pharmacy_id"] = df["pharmacy_id"].map(clean_string)
    df["pharmacy_name"] = df["pharmacy_name"].map(clean_string)
    df["opais_id"] = df["opais_id"].map(clean_string)
    df["address_line_1"] = df["address_line_1"].map(clean_string)
    df["city"] = df["city"].map(clean_string)
    df["state"] = df["state"].map(clean_string)
    df["zip_code"] = df["zip_code"].map(clean_string)
    df["phone_number"] = df["phone_number"].map(clean_string).str.slice(0, 20)

    df = df[df["pharmacy_id"].notna()].copy()
    df = df[df["pharmacy_name"].notna()].copy()
    df = df.drop_duplicates(subset=[PRIMARY_KEY], keep="first")

    for column in DATE_COLUMNS:
        df[column] = df[column].map(parse_date)

    df["latitude"] = None
    df["longitude"] = None

    return df


def records_from_dataframe(df: pd.DataFrame) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for row in df.to_dict(orient="records"):
        cleaned: dict[str, Any] = {}
        for key, value in row.items():
            if value is None or (isinstance(value, float) and math.isnan(value)) or pd.isna(value):
                cleaned[key] = None
            else:
                cleaned[key] = value
        records.append(cleaned)
    return records


def upsert_in_batches(
    supabase_client,
    records: list[dict[str, Any]],
    batch_size: int = UPSERT_BATCH_SIZE,
) -> None:
    total = len(records)
    for start in range(0, total, batch_size):
        batch = records[start : start + batch_size]
        supabase_client.table(TABLE_NAME).upsert(
            batch,
            on_conflict=PRIMARY_KEY,
        ).execute()
        end = min(start + batch_size, total)
        print(f"Upserted rows {start + 1}-{end} of {total}")


def main() -> None:
    load_dotenv(ROOT / ".env")

    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")

    json_path = resolve_json_path()
    df = load_and_transform(json_path)
    records = records_from_dataframe(df)

    print(f"Loaded source file: {json_path.name}")
    print(f"Prepared {len(records)} contract pharmacy records for upsert.")

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    upsert_in_batches(client, records)

    print("ETL complete.")


if __name__ == "__main__":
    main()
