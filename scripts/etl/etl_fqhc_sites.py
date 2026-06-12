"""ETL: Health Center sites CSV -> Supabase fqhc_site table."""

from __future__ import annotations

import math
import os

import pandas as pd
from dotenv import load_dotenv
from supabase import create_client

from scripts.paths import HRSA_SITES_CSV, ROOT

COLUMN_MAP = {
    "BPHC Assigned Number": "bphc_site_num",
    "Health Center Number": "hcp_merged_grant_lal_key",
    "Site Name": "site_name",
    "Site Address": "site_address",
    "Site City": "site_city",
    "Site State Abbreviation": "site_state_abbr",
    "Site Postal Code": "site_zip_cd",
    "Site Telephone Number": "site_phone_num",
    "Site Web Address": "site_url",
    "Operating Hours per Week": "tot_oper_hr_per_week",
    "Site Status Description": "hcc_status_desc",
    "Health Center Type Description": "hcc_typ_desc",
    "Health Center Location Type Description": "hcc_loc_desc",
    "Health Center Service Delivery Site Location Setting Description": "hcc_loc_setting_desc",
    "FQHC Site NPI Number": "fqhc_site_npi_num",
    "Geocoding Artifact Address X": "longitude",
    "Geocoding Artifact Address Y": "latitude",
}

# HRSA export uses longer geocoding header names for the same fields.
GEOCODING_HEADER_ALIASES = {
    "Geocoding Artifact Address Primary X Coordinate": "Geocoding Artifact Address X",
    "Geocoding Artifact Address Primary Y Coordinate": "Geocoding Artifact Address Y",
}

TABLE_NAME = "fqhc_site"
UPSERT_BATCH_SIZE = 1000
PRIMARY_KEY = "bphc_site_num"


def normalize_supabase_url(url: str) -> str:
    """Return the base project URL expected by the Supabase Python client."""
    return url.rstrip("/").removesuffix("/rest/v1")


def load_and_transform(csv_path) -> pd.DataFrame:
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    df = df.replace("", pd.NA)
    df = df.rename(columns=GEOCODING_HEADER_ALIASES)

    df = df[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)

    df = df[df["hcc_status_desc"] == "Active"].copy()

    df["accepts_sliding_scale"] = True

    df["tot_oper_hr_per_week"] = pd.to_numeric(df["tot_oper_hr_per_week"], errors="coerce")
    df["latitude"] = pd.to_numeric(df["latitude"], errors="coerce")
    df["longitude"] = pd.to_numeric(df["longitude"], errors="coerce")

    df["site_phone_num"] = df["site_phone_num"].str.slice(0, 20)

    df = df.dropna(subset=[PRIMARY_KEY])
    df = df.drop_duplicates(subset=[PRIMARY_KEY], keep="last")

    return df


def records_from_dataframe(df: pd.DataFrame) -> list[dict]:
    records: list[dict] = []
    for row in df.to_dict(orient="records"):
        cleaned: dict = {}
        for key, value in row.items():
            if value is None or (isinstance(value, float) and math.isnan(value)):
                cleaned[key] = None
            elif pd.isna(value):
                cleaned[key] = None
            else:
                cleaned[key] = value
        records.append(cleaned)
    return records


def upsert_in_batches(supabase_client, records: list[dict], batch_size: int = UPSERT_BATCH_SIZE) -> None:
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

    if not HRSA_SITES_CSV.exists():
        raise FileNotFoundError(f"CSV file not found: {HRSA_SITES_CSV}")

    df = load_and_transform(HRSA_SITES_CSV)
    records = records_from_dataframe(df)

    print(f"Prepared {len(records)} active site records for upsert.")

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    upsert_in_batches(client, records)

    print("ETL complete.")


if __name__ == "__main__":
    main()
