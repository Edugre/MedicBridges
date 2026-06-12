"""ETL: HRSA UDS Table 5 (org-level services) -> Supabase site_services.

Downloads the public per-awardee UDS workbooks (H80 awardees + LAL look-alikes),
derives which services each health center organization offers from Table 5
staffing/utilization lines, and propagates those services to the organization's
active service-delivery sites in `fqhc_site`.

Usage:
    python -m scripts.etl.etl_uds_services [--state FL]
"""

from __future__ import annotations

import argparse
import os
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd
import requests
from dotenv import load_dotenv
from supabase import create_client

from scripts.paths import ROOT, UDS_DIR, ensure_data_dirs

UDS_FILES = {
    "H80": "https://data.hrsa.gov/DataDownload/StaticDocuments/H80-2024.xlsx",
    "LAL": "https://data.hrsa.gov/DataDownload/StaticDocuments/LAL-2024.xlsx",
}

DATA_SOURCE = "HRSA UDS 2024 Table 5 (org-level)"
UPSERT_BATCH_SIZE = 500

# service_catalog.service_id -> Table 5 columns that indicate the service.
# A service is considered offered when any mapped column is numeric and > 0.
# Pediatric Dentistry (6) is not derivable from Table 5 and is left to the
# website-scraping pass.
SERVICE_COLUMN_MAP: dict[int, list[str]] = {
    # Primary Care / Preventive Health <- Total Medical Care Services (L15)
    1: ["T5_L15_Ca", "T5_L15_Cb", "T5_L15_Cb2", "T5_L15_Cc"],
    2: ["T5_L15_Ca", "T5_L15_Cb", "T5_L15_Cb2", "T5_L15_Cc"],
    # Pediatrics <- Pediatricians (L5)
    3: ["T5_L5_Ca", "T5_L5_Cb", "T5_L5_Cb2"],
    # OB/GYN <- Obstetrician/Gynecologists (L4)
    4: ["T5_L4_Ca", "T5_L4_Cb", "T5_L4_Cb2"],
    # General Dentistry <- Total Dental Services (L19)
    5: ["T5_L19_Ca", "T5_L19_Cb", "T5_L19_Cb2", "T5_L19_Cc"],
    # Mental Health Counseling <- Total Mental Health Services (L20)
    7: ["T5_L20_Ca", "T5_L20_Cb", "T5_L20_Cb2", "T5_L20_Cc"],
    # Psychiatry <- Psychiatrists (L20a)
    8: ["T5_L20a_Ca", "T5_L20a_Cb", "T5_L20a_Cb2"],
    # Substance Use Disorder Treatment <- SUD Services (L21)
    9: ["T5_L21_Ca", "T5_L21_Cb", "T5_L21_Cb2", "T5_L21_Cc"],
    # Diagnostic Laboratory <- Laboratory Personnel (L13)
    10: ["T5_L13_Ca"],
    # Diagnostic Radiology <- X-ray Personnel (L14)
    11: ["T5_L14_Ca"],
    # Optometry & Vision Care <- Total Vision Services (L22d)
    12: ["T5_L22d_Ca", "T5_L22d_Cb", "T5_L22d_Cb2", "T5_L22d_Cc"],
    # Pharmacy / 340B Dispensary <- Pharmacy Personnel (L23)
    13: ["T5_L23_Ca"],
    # Case Management <- Case Managers (L24)
    14: ["T5_L24_Ca", "T5_L24_Cb", "T5_L24_Cb2"],
    # Translation & Interpretation <- Interpretation Personnel (L27b)
    15: ["T5_L27b_Ca"],
    # Patient Transportation <- Transportation Personnel (L27)
    16: ["T5_L27_Ca"],
}

ALL_T5_COLUMNS = sorted({col for cols in SERVICE_COLUMN_MAP.values() for col in cols})


def normalize_supabase_url(url: str) -> str:
    return url.rstrip("/").removesuffix("/rest/v1")


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
    """Return {grant_number: {"services": set[int], "suppressed": bool}}."""
    table5 = pd.read_excel(workbook_path, sheet_name="Table5", dtype=str)
    # Row 0 holds human-readable column labels; data starts at row 1.
    table5 = table5.iloc[1:].copy()
    table5 = table5[table5["GrantNumber"].notna()]

    missing = [col for col in ALL_T5_COLUMNS if col not in table5.columns]
    if missing:
        raise ValueError(f"{workbook_path.name} Table5 missing expected columns: {missing}")

    numeric = table5[ALL_T5_COLUMNS].apply(pd.to_numeric, errors="coerce")

    orgs: dict[str, dict] = {}
    for idx, grant_number in table5["GrantNumber"].items():
        row = numeric.loc[idx]
        # Orgs that did not consent to release Table 5 have all values suppressed
        # ('---' -> NaN); treat them as "no data" rather than "no services".
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


def fetch_target_sites(client, state: str) -> list[dict]:
    """Active service-delivery sites (admin-only sites excluded) for the state."""
    sites: list[dict] = []
    page_size = 1000
    offset = 0
    while True:
        response = (
            client.table("fqhc_site")
            .select("bphc_site_num,hcp_merged_grant_lal_key,hcc_typ_desc")
            .eq("site_state_abbr", state)
            .range(offset, offset + page_size - 1)
            .execute()
        )
        batch = response.data or []
        sites.extend(batch)
        if len(batch) < page_size:
            break
        offset += page_size
    return [
        site
        for site in sites
        if site.get("hcp_merged_grant_lal_key")
        and "Service Delivery" in (site.get("hcc_typ_desc") or "")
    ]


def fetch_existing_pairs(client, site_nums: list[str]) -> dict[tuple[str, int], dict]:
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


def build_rows(
    sites: list[dict],
    org_services: dict[str, dict],
    existing: dict[tuple[str, int], dict],
) -> tuple[list[dict], dict]:
    extracted_at = datetime.now(timezone.utc).isoformat()
    rows: list[dict] = []
    stats = {"matched_orgs": set(), "unmatched_orgs": set(), "suppressed_orgs": set(), "sites": 0}

    for site in sites:
        key = site["hcp_merged_grant_lal_key"].strip()
        org = org_services.get(key)
        if org is None:
            stats["unmatched_orgs"].add(key)
            continue
        if org["suppressed"]:
            stats["suppressed_orgs"].add(key)
            continue
        stats["matched_orgs"].add(key)
        stats["sites"] += 1
        for service_id in sorted(org["services"]):
            current = existing.get((site["bphc_site_num"], service_id))
            # A pair already claimed by an independent (non-HRSA, non-assumption)
            # source is corroborated by UDS -> verified. Never un-verify.
            independent = (
                current is not None
                and not current["data_source"].startswith("HRSA")
                and current["data_source"] != "Federal Mandate Assumption"
            )
            verified = bool(current and (current["is_verified"] or independent))
            rows.append(
                {
                    "bphc_site_num": site["bphc_site_num"],
                    "service_id": service_id,
                    "data_source": DATA_SOURCE,
                    "is_verified": verified,
                    "source_url": org["source_url"],
                    "confidence": None,
                    "extracted_at": extracted_at,
                }
            )
    return rows, stats


def upsert_in_batches(client, rows: list[dict], batch_size: int = UPSERT_BATCH_SIZE) -> None:
    total = len(rows)
    for start in range(0, total, batch_size):
        batch = rows[start : start + batch_size]
        client.table("site_services").upsert(
            batch,
            on_conflict="bphc_site_num,service_id",
        ).execute()
        print(f"Upserted rows {start + 1}-{min(start + batch_size, total)} of {total}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--state", default="FL", help="Two-letter state code (default: FL)")
    args = parser.parse_args()

    load_dotenv(ROOT / ".env")
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    if not supabase_url or not supabase_key:
        raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set in the .env file.")

    paths = download_workbooks()
    org_services: dict[str, dict] = {}
    for label, path in paths.items():
        loaded = load_org_services(path, UDS_FILES[label])
        print(f"{label}: parsed Table 5 for {len(loaded)} organizations")
        org_services.update(loaded)

    client = create_client(normalize_supabase_url(supabase_url), supabase_key)
    sites = fetch_target_sites(client, args.state.upper())
    print(f"{len(sites)} active service-delivery sites in {args.state.upper()}")

    existing = fetch_existing_pairs(client, [site["bphc_site_num"] for site in sites])
    rows, stats = build_rows(sites, org_services, existing)
    print(
        f"Orgs matched: {len(stats['matched_orgs'])}, "
        f"suppressed (no UDS consent): {len(stats['suppressed_orgs'])}, "
        f"not in UDS files: {len(stats['unmatched_orgs'])}"
    )
    if stats["unmatched_orgs"]:
        print("Unmatched org keys:", ", ".join(sorted(stats["unmatched_orgs"])))
    if stats["suppressed_orgs"]:
        print("Suppressed org keys:", ", ".join(sorted(stats["suppressed_orgs"])))
    print(f"Prepared {len(rows)} site-service rows across {stats['sites']} sites.")

    upsert_in_batches(client, rows)
    print("ETL complete.")


if __name__ == "__main__":
    main()
