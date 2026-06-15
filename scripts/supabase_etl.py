"""ETL run logging and freshness helpers for Supabase pipelines."""

from __future__ import annotations

from contextlib import contextmanager
from datetime import datetime, timezone
from typing import Any, Iterator


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@contextmanager
def etl_run(client, pipeline_name: str, source_file: str | None = None) -> Iterator[Any]:
    """Record pipeline execution in etl_run. Yields run_id (or None if logging fails)."""
    run_id: str | None = None
    started_at = utc_now_iso()
    try:
        response = (
            client.table("etl_run")
            .insert(
                {
                    "pipeline_name": pipeline_name,
                    "started_at": started_at,
                    "status": "running",
                    "source_file": source_file,
                }
            )
            .execute()
        )
        if response.data:
            run_id = response.data[0]["run_id"]
    except Exception as exc:
        print(f"Warning: could not create etl_run record ({exc})")

    rows_affected = 0
    error: Exception | None = None

    class RunContext:
        def add_rows(self, count: int) -> None:
            nonlocal rows_affected
            rows_affected += count

    ctx = RunContext()
    try:
        yield ctx
        status = "success"
    except Exception as exc:
        error = exc
        status = "failed"
        raise
    finally:
        if run_id is not None:
            payload: dict = {
                "finished_at": utc_now_iso(),
                "status": status,
                "rows_affected": rows_affected or None,
                "error_message": str(error) if error else None,
            }
            try:
                client.table("etl_run").update(payload).eq("run_id", run_id).execute()
            except Exception as exc:
                print(f"Warning: could not finalize etl_run record ({exc})")


def stamp_last_refreshed(records: list[dict], refreshed_at: str | None = None) -> list[dict]:
    """Add last_refreshed_at to each record dict (in place)."""
    timestamp = refreshed_at or utc_now_iso()
    for record in records:
        record["last_refreshed_at"] = timestamp
    return records
