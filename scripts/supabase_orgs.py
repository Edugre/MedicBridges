"""Shared helpers for the health_center_org table."""

from __future__ import annotations

from typing import Any

import pandas as pd

from scripts.supabase_etl import utc_now_iso

ORG_TABLE = "health_center_org"
GRANT_COLUMN = "grant_number"
ORG_UPSERT_BATCH_SIZE = 500


def most_common_non_null(values: pd.Series) -> str | None:
    cleaned = values.dropna().astype(str).str.strip()
    cleaned = cleaned[cleaned != ""]
    if cleaned.empty:
        return None
    return cleaned.mode().iloc[0]



def build_org_records(sites_df: pd.DataFrame, refreshed_at: str | None = None) -> list[dict[str, Any]]:
    """Derive one org row per HRSA grant number from active site records."""
    timestamp = refreshed_at or utc_now_iso()
    grouped = sites_df.dropna(subset=["hcp_merged_grant_lal_key"]).groupby(
        "hcp_merged_grant_lal_key", sort=True
    )
    records: list[dict[str, Any]] = []
    for grant_number, group in grouped:
        records.append(
            {
                "grant_number": str(grant_number).strip(),
                "org_name": most_common_non_null(group["site_name"]),
                "org_state": most_common_non_null(group["site_state_abbr"]),
                "org_url": most_common_non_null(group["site_url"]),
                "last_refreshed_at": timestamp,
            }
        )
    return records


def upsert_orgs(client, records: list[dict[str, Any]], batch_size: int = ORG_UPSERT_BATCH_SIZE) -> None:
    total = len(records)
    for start in range(0, total, batch_size):
        batch = records[start : start + batch_size]
        client.table(ORG_TABLE).upsert(batch, on_conflict=GRANT_COLUMN).execute()
        end = min(start + batch_size, total)
        print(f"Upserted org rows {start + 1}-{end} of {total}")


def fetch_org_id_map(client, grant_numbers: list[str]) -> dict[str, str]:
    """Return {grant_number: org_id} for the given grants."""
    mapping: dict[str, str] = {}
    chunk_size = 200
    for start in range(0, len(grant_numbers), chunk_size):
        chunk = grant_numbers[start : start + chunk_size]
        response = (
            client.table(ORG_TABLE)
            .select("org_id,grant_number")
            .in_(GRANT_COLUMN, chunk)
            .execute()
        )
        for row in response.data or []:
            mapping[row["grant_number"]] = row["org_id"]
    return mapping


def attach_org_ids(
    client,
    sites_df: pd.DataFrame,
    refreshed_at: str | None = None,
) -> pd.DataFrame:
    """Upsert org rows and add org_id to the sites dataframe."""
    org_records = build_org_records(sites_df, refreshed_at=refreshed_at)
    upsert_orgs(client, org_records)

    grants = sites_df["hcp_merged_grant_lal_key"].dropna().astype(str).str.strip().unique().tolist()
    org_id_map = fetch_org_id_map(client, grants)

    df = sites_df.copy()
    df["org_id"] = df["hcp_merged_grant_lal_key"].astype(str).str.strip().map(org_id_map)
    missing = df["org_id"].isna().sum()
    if missing:
        raise ValueError(f"{missing} site rows could not be mapped to health_center_org.")
    return df
