"""Ingestion monitoring service (read-only).

Reads the service-role-only `etl_run` table and `v_data_quality_summary`. Callers
must pass a service-role client (see api.deps.require_admin).
"""

from __future__ import annotations

from typing import Any

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.schemas.admin import (
    PipelineRun,
    PipelineRunsResponse,
    PipelineStatus,
    PipelineStatusResponse,
)


def _safe(client: Client, fn, what: str):
    try:
        return fn()
    except Exception as exc:
        raise UpstreamError(f"{what} failed: {exc}") from exc


def pipeline_status(client: Client) -> PipelineStatusResponse:
    # Most recent runs first; reduce to latest per pipeline_name in Python.
    runs = _safe(
        client,
        lambda: client.table("etl_run")
        .select("*")
        .order("started_at", desc=True)
        .limit(500)
        .execute(),
        "select etl_run",
    ).data or []

    latest: dict[str, dict[str, Any]] = {}
    for row in runs:
        name = row.get("pipeline_name")
        if name and name not in latest:
            latest[name] = row

    pipelines = [
        PipelineStatus(
            pipeline_name=name,
            last_run_id=row.get("run_id"),
            status=row.get("status"),
            started_at=row.get("started_at"),
            finished_at=row.get("finished_at"),
            rows_affected=row.get("rows_affected"),
            source_file=row.get("source_file"),
            error_message=row.get("error_message"),
        )
        for name, row in sorted(latest.items())
    ]

    dq_rows = _safe(
        client,
        lambda: client.table("v_data_quality_summary").select("*").limit(1).execute(),
        "select v_data_quality_summary",
    ).data or []
    data_quality = dq_rows[0] if dq_rows else {}

    return PipelineStatusResponse(pipelines=pipelines, data_quality=data_quality)


def pipeline_runs(
    client: Client,
    *,
    pipeline_name: str | None = None,
    limit: int = 50,
    offset: int = 0,
) -> PipelineRunsResponse:
    def _query():
        q = client.table("etl_run").select("*", count="exact")
        if pipeline_name:
            q = q.eq("pipeline_name", pipeline_name)
        return q.order("started_at", desc=True).range(offset, offset + limit - 1).execute()

    resp = _safe(client, _query, "select etl_run")
    rows = resp.data or []
    count = getattr(resp, "count", None) or len(rows)

    runs = [
        PipelineRun(
            run_id=row.get("run_id"),
            pipeline_name=row.get("pipeline_name"),
            status=row.get("status"),
            started_at=row.get("started_at"),
            finished_at=row.get("finished_at"),
            rows_affected=row.get("rows_affected"),
            source_file=row.get("source_file"),
            error_message=row.get("error_message"),
        )
        for row in rows
    ]
    return PipelineRunsResponse(runs=runs, count=count, limit=limit, offset=offset)
