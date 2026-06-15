"""Shared Supabase client + staging-load helpers for the v2 ETL.

All ETL writes go through the service-role key so RLS never silently blocks
inserts or etl_run logging. Source rows are loaded verbatim into the private
`staging` schema via SECURITY DEFINER RPCs, then a transform RPC upserts the
curated public tables.
"""

from __future__ import annotations

import math
import os
from typing import Any, Iterable

from dotenv import load_dotenv

from scripts._supabase_py import Client, create_client
from scripts.paths import ROOT

STAGE_BATCH_SIZE = 1000


def normalize_supabase_url(url: str) -> str:
    """Return the base project URL expected by the Supabase Python client."""
    return url.rstrip("/").removesuffix("/rest/v1")


def get_client() -> Client:
    """Create a service-role Supabase client from the .env file."""
    load_dotenv(ROOT / ".env")
    url = os.getenv("SUPABASE_URL")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_KEY")
    if not url or not key:
        raise ValueError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY) must be set in .env"
        )
    return create_client(normalize_supabase_url(url), key)


def clean_value(value: Any) -> Any:
    """Coerce NaN / pandas-NA to None and stringify everything else for staging."""
    if value is None:
        return None
    if isinstance(value, float) and math.isnan(value):
        return None
    try:
        import pandas as pd  # local import keeps this usable without pandas

        if pd.isna(value):
            return None
    except (ImportError, ValueError, TypeError):
        pass
    if isinstance(value, str):
        text = value.strip()
        return text or None
    return value


def clean_records(records: Iterable[dict[str, Any]]) -> list[dict[str, Any]]:
    return [{k: clean_value(v) for k, v in row.items()} for row in records]


def _chunks(records: list[dict[str, Any]], size: int):
    for start in range(0, len(records), size):
        yield records[start : start + size]


def load_staging(
    client: Client,
    table: str,
    stage_rpc: str,
    records: list[dict[str, Any]],
    *,
    source_file: str | None = None,
    run_id: str | None = None,
    batch_size: int = STAGE_BATCH_SIZE,
) -> int:
    """Reset a staging table, then append cleaned records in batches via RPC."""
    client.rpc("reset_staging", {"p_table": table}).execute()
    rows = clean_records(records)
    loaded = 0
    for index, batch in enumerate(_chunks(rows, batch_size), start=1):
        client.rpc(
            stage_rpc,
            {"p_rows": batch, "p_source": source_file, "p_run": run_id},
        ).execute()
        loaded += len(batch)
        print(f"  staged batch {index}: {loaded}/{len(rows)} rows into staging.{table}")
    return loaded


def call_transform(client: Client, rpc: str, params: dict[str, Any] | None = None) -> Any:
    """Invoke a transform/reconcile RPC and return its scalar result."""
    response = client.rpc(rpc, params or {}).execute()
    return response.data


def enqueue_geocodes(client: Client) -> Any:
    """Queue all geocodable, not-yet-resolved locations."""
    return call_transform(client, "enqueue_pending_geocodes")
