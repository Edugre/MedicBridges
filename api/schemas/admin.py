"""Admin / ingestion monitoring schemas (read-only in v1)."""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field


class PipelineStatus(BaseModel):
    pipeline_name: str
    last_run_id: str | None = None
    status: str | None = None
    started_at: datetime | None = None
    finished_at: datetime | None = None
    rows_affected: int | None = None
    source_file: str | None = None
    error_message: str | None = None


class PipelineStatusResponse(BaseModel):
    pipelines: list[PipelineStatus] = Field(default_factory=list)
    data_quality: dict = Field(default_factory=dict)


class PipelineRun(BaseModel):
    run_id: str
    pipeline_name: str
    status: str
    started_at: datetime | None = None
    finished_at: datetime | None = None
    rows_affected: int | None = None
    source_file: str | None = None
    error_message: str | None = None


class PipelineRunsResponse(BaseModel):
    runs: list[PipelineRun] = Field(default_factory=list)
    count: int = 0
    limit: int = 50
    offset: int = 0
