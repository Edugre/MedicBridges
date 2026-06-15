"""Admin / ingestion monitoring (read-only, secured by X-Admin-Key)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from scripts._supabase_py import Client

from api.deps import require_admin
from api.schemas.admin import PipelineRunsResponse, PipelineStatusResponse
from api.services import pipeline

router = APIRouter(prefix="/api/v1/admin", tags=["admin"])


@router.get("/pipeline/status", response_model=PipelineStatusResponse)
def pipeline_status(client: Client = Depends(require_admin)) -> PipelineStatusResponse:
    return pipeline.pipeline_status(client)


@router.get("/pipeline/runs", response_model=PipelineRunsResponse)
def pipeline_runs(
    pipeline_name: Annotated[str | None, Query()] = None,
    limit: Annotated[int, Query(ge=1, le=200)] = 50,
    offset: Annotated[int, Query(ge=0)] = 0,
    client: Client = Depends(require_admin),
) -> PipelineRunsResponse:
    return pipeline.pipeline_runs(
        client, pipeline_name=pipeline_name, limit=limit, offset=offset
    )
