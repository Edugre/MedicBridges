"""ETL: HRSA UDS Table 5 -> staging.uds_org_service -> site_service.

Downloads the public per-awardee UDS workbooks (H80 + LAL), derives which
services each organization offers from Table 5 staffing/utilization lines, and
loads (grant_number, service_id) pairs into staging. The transform RPC then
propagates them to each organization's active service-delivery sites (the
canonical service grain), preserving any independent verification already set.

Usage:
    python -m scripts.etl.etl_uds_services
"""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import requests

from scripts.db import get_client, load_staging
from scripts.paths import UDS_DIR, ensure_data_dirs
from scripts.supabase_etl import etl_run, utc_now_iso

UDS_FILES = {
    "H80": "https://data.hrsa.gov/DataDownload/StaticDocuments/H80-2024.xlsx",
    "LAL": "https://data.hrsa.gov/DataDownload/StaticDocuments/LAL-2024.xlsx",
}

DATA_SOURCE = "HRSA UDS 2024 Table 5 (org-level)"
STAGING_TABLE = "uds_org_service"
STAGE_RPC = "stage_uds_org_service"

# service.service_id -> Table 5 columns that indicate the service.
# A service is offered when any mapped column is numeric and > 0.
SERVICE_COLUMN_MAP: dict[int, list[str]] = {
    1: ["T5_L15_Ca", "T5_L15_Cb", "T5_L15_Cb2", "T5_L15_Cc"],
    2: ["T5_L15_Ca", "T5_L15_Cb", "T5_L15_Cb2", "T5_L15_Cc"],
    3: ["T5_L5_Ca", "T5_L5_Cb", "T5_L5_Cb2"],
    4: ["T5_L4_Ca", "T5_L4_Cb", "T5_L4_Cb2"],
    5: ["T5_L19_Ca", "T5_L19_Cb", "T5_L19_Cb2", "T5_L19_Cc"],
    7: ["T5_L20_Ca", "T5_L20_Cb", "T5_L20_Cb2", "T5_L20_Cc"],
    8: ["T5_L20a_Ca", "T5_L20a_Cb", "T5_L20a_Cb2"],
    9: ["T5_L21_Ca", "T5_L21_Cb", "T5_L21_Cb2", "T5_L21_Cc"],
    10: ["T5_L13_Ca"],
    11: ["T5_L14_Ca"],
    12: ["T5_L22d_Ca", "T5_L22d_Cb", "T5_L22d_Cb2", "T5_L22d_Cc"],
    13: ["T5_L23_Ca"],
    14: ["T5_L24_Ca", "T5_L24_Cb", "T5_L24_Cb2"],
    15: ["T5_L27b_Ca"],
    16: ["T5_L27_Ca"],
}

ALL_T5_COLUMNS = sorted({col for cols in SERVICE_COLUMN_MAP.values() for col in cols})


def download_workbooks() -> dict[str, Path]:
    ensure_data_dirs()
    paths: dict[str, Path] = {}
    for label, url in UDS_FILES.items():
        path = UDS_DIR / url.rsplit("/", 1)[-1]
        if not path.exists():
            print(f"Downloading {url} ...")
            response = requests.get(url, timeout=120)
            response.raise_for_status()
            path.write_bytes(response.content)
        paths[label] = path
    return paths


def load_org_services(workbook_path: Path, source_url: str) -> dict[str, dict]:
    """Return {grant_number: {"services": set[int], "suppressed": bool, "source_url": str}}."""
    table5 = pd.read_excel(workbook_path, sheet_name="Table5", dtype=str)
    table5 = table5.iloc[1:].copy()  # row 0 holds human-readable labels
    table5 = table5[table5["GrantNumber"].notna()]

    missing = [col for col in ALL_T5_COLUMNS if col not in table5.columns]
    if missing:
        raise ValueError(f"{workbook_path.name} Table5 missing expected columns: {missing}")

    numeric = table5[ALL_T5_COLUMNS].apply(pd.to_numeric, errors="coerce")
    orgs: dict[str, dict] = {}
    for idx, grant_number in table5["GrantNumber"].items():
        row = numeric.loc[idx]
        if row.isna().all():
            orgs[grant_number.strip()] = {"services": set(), "suppressed": True, "source_url": source_url}
            continue
        services = {
            service_id
            for service_id, cols in SERVICE_COLUMN_MAP.items()
            if row[cols].fillna(0).gt(0).any()
        }
        orgs[grant_number.strip()] = {"services": services, "suppressed": False, "source_url": source_url}
    return orgs


def build_staging_rows(org_services: dict[str, dict]) -> list[dict]:
    rows: list[dict] = []
    for grant_number, info in org_services.items():
        if info["suppressed"]:
            continue
        for service_id in sorted(info["services"]):
            rows.append(
                {
                    "grant_number": grant_number,
                    "service_id": str(service_id),
                    "source_url": info["source_url"],
                }
            )
    return rows


def main() -> None:
    paths = download_workbooks()
    org_services: dict[str, dict] = {}
    for label, path in paths.items():
        loaded = load_org_services(path, UDS_FILES[label])
        print(f"{label}: parsed Table 5 for {len(loaded)} organizations")
        org_services.update(loaded)

    rows = build_staging_rows(org_services)
    suppressed = sum(1 for info in org_services.values() if info["suppressed"])
    print(f"Prepared {len(rows)} org-service rows ({suppressed} orgs suppressed/no UDS consent)")

    client = get_client()
    with etl_run(client, "etl_uds_services", source_file=DATA_SOURCE) as run:
        run_ts = utc_now_iso()
        staged = load_staging(client, STAGING_TABLE, STAGE_RPC, rows, source_file=DATA_SOURCE)
        print(f"Staged {staged} rows; propagating to sites...")
        site_rows = client.rpc(
            "transform_uds_services", {"p_ts": run_ts, "p_data_source": DATA_SOURCE}
        ).execute().data
        print(f"Site-service rows upserted: {site_rows}")
        run.add_rows(int(site_rows or 0))

    print("ETL complete.")


if __name__ == "__main__":
    main()
