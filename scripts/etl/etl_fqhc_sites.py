"""ETL: HRSA Health Center sites CSV -> staging.hrsa_site -> organization + site.

Staging-first: the CSV is loaded verbatim into staging.hrsa_site, then the
transform RPCs derive organizations (one per grant) and sites, link/dedup
locations, and queue any new addresses for geocoding.

Usage:
    python -m scripts.etl.etl_fqhc_sites
"""

from __future__ import annotations

import pandas as pd

from scripts.db import enqueue_geocodes, get_client, load_staging
from scripts.paths import HRSA_SITES_CSV
from scripts.supabase_etl import etl_run, utc_now_iso

# CSV header -> staging.hrsa_site column.
COLUMN_MAP = {
    "BPHC Assigned Number": "bphc_assigned_number",
    "Health Center Number": "health_center_number",
    "Site Name": "site_name",
    "Site Address": "site_address",
    "Site City": "site_city",
    "Site State Abbreviation": "site_state_abbr",
    "Site Postal Code": "site_postal_code",
    "Site Telephone Number": "site_phone_num",
    "Site Web Address": "site_url",
    "Operating Hours per Week": "operating_hours",
    "Site Status Description": "site_status_desc",
    "Health Center Type Description": "center_type_desc",
    "Health Center Location Type Description": "location_type_desc",
    "Health Center Service Delivery Site Location Setting Description": "location_setting_desc",
    "FQHC Site NPI Number": "site_npi",
    "Geocoding Artifact Address X": "longitude",
    "Geocoding Artifact Address Y": "latitude",
}

# HRSA sometimes uses longer geocoding header names for the same fields.
GEOCODING_HEADER_ALIASES = {
    "Geocoding Artifact Address Primary X Coordinate": "Geocoding Artifact Address X",
    "Geocoding Artifact Address Primary Y Coordinate": "Geocoding Artifact Address Y",
}

STAGING_TABLE = "hrsa_site"
STAGE_RPC = "stage_hrsa_site"


def load_source(csv_path) -> list[dict]:
    df = pd.read_csv(csv_path, dtype=str, keep_default_na=False)
    df = df.replace("", pd.NA)
    df = df.rename(columns=GEOCODING_HEADER_ALIASES)
    missing = [col for col in COLUMN_MAP if col not in df.columns]
    if missing:
        raise ValueError(f"HRSA sites CSV missing expected columns: {missing}")
    df = df[list(COLUMN_MAP.keys())].rename(columns=COLUMN_MAP)
    return df.to_dict(orient="records")


def main() -> None:
    if not HRSA_SITES_CSV.exists():
        raise FileNotFoundError(f"CSV file not found: {HRSA_SITES_CSV}")

    client = get_client()
    records = load_source(HRSA_SITES_CSV)
    print(f"Read {len(records)} rows from {HRSA_SITES_CSV.name}")

    with etl_run(client, "etl_fqhc_sites", source_file=str(HRSA_SITES_CSV)) as run:
        run_ts = utc_now_iso()
        staged = load_staging(
            client, STAGING_TABLE, STAGE_RPC, records,
            source_file=HRSA_SITES_CSV.name,
        )
        print(f"Staged {staged} rows; running transforms...")

        orgs = client.rpc("transform_organizations", {"p_ts": run_ts}).execute().data
        sites = client.rpc("transform_sites", {"p_ts": run_ts}).execute().data
        queued = enqueue_geocodes(client)

        print(f"Organizations upserted: {orgs}")
        print(f"Sites upserted: {sites}")
        print(f"Locations queued for geocoding: {queued}")
        run.add_rows(int(sites or 0))

    print("ETL complete.")


if __name__ == "__main__":
    main()
