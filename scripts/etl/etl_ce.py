"""ETL: OPAIS 340B covered entity JSON -> Supabase ce table."""

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
    "Edit Date": "last_updated_by_hrsa",
}

SCHEMA_COLUMNS = list(COLUMN_MAP.values())

TABLE_NAME = "ce"
PRIMARY_KEY = "opais_id"
UPSERT_BATCH_SIZE = 1000
ALLOWED_ENTITY_TYPES = {"CH", "FQHCLA"}
DATE_COLUMNS = ("participating_start_date", "termination_date", "last_updated_by_hrsa")


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
        "last_updated_by_hrsa": record.get("editDate"),
    }


def normalize_records(records: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not records:
        return []

    sample = records[0]
    if "340B ID" in sample or "Entity Type" in sample:
        return [
            {COLUMN_MAP[key]: record.get(key) for key in COLUMN_MAP}
            for record in records
        ]

    if "id340B" in sample or "entityType" in sample:
        return [flatten_api_record(record) for record in records]

    raise ValueError(
        "Unsupported JSON record format. Expected flat OPAIS export keys or API camelCase keys."
    )


def parse_boolean(value: Any) -> bool:
    if value is None or (isinstance(value, float) and math.isnan(value)) or pd.isna(value):
        return False
    if isinstance(value, bool):
        return value
    normalized = str(value).strip().lower()
    if normalized in {"yes", "true", "1", "y"}:
        return True
    if normalized in {"no", "false", "0", "n"}:
        return False
    return False


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

    records = normalize_records(extract_records(payload))
    df = pd.DataFrame(records, columns=SCHEMA_COLUMNS)

    df["entity_type"] = df["entity_type"].map(clean_string)
    df = df[df["entity_type"].isin(ALLOWED_ENTITY_TYPES)].copy()

    df["grant_number"] = df["grant_number"].map(clean_string)
    df = df[df["grant_number"].notna()].copy()
    df = df.drop_duplicates(subset=["grant_number"], keep="first")

    df["opais_id"] = df["opais_id"].map(clean_string)
    df["ce_id"] = df["ce_id"].map(clean_string)
    df["entity_name"] = df["entity_name"].map(clean_string)
    df["npi"] = df["npi"].map(clean_string)
    df["address_line_1"] = df["address_line_1"].map(clean_string)
    df["city"] = df["city"].map(clean_string)
    df["state"] = df["state"].map(clean_string)
    df["zip_code"] = df["zip_code"].map(clean_string)

    df = df[df["opais_id"].notna()].copy()
    df = df[df["entity_name"].notna()].copy()
    df = df.drop_duplicates(subset=[PRIMARY_KEY], keep="first")

    df["is_participating"] = df["is_participating"].map(parse_boolean)
    for column in DATE_COLUMNS:
        df[column] = df[column].map(parse_date)

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


def upsert_in_batches(supabase_client, records: list[dict[str, Any]], batch_size: int = UPSERT_BATCH_SIZE) -> None:
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
    print(f"Prepared {len(records)} covered entity records for upsert.")

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    upsert_in_batches(client, records)

    print("ETL complete.")


if __name__ == "__main__":
    main()
