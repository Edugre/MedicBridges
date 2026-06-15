"""Shared response envelopes."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ErrorEnvelope(BaseModel):
    error: str
    detail: str | None = None

    model_config = {"extra": "allow"}


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str
    supabase_configured: bool
