"""Medication reference schemas (RxNorm / openFDA, served from the Postgres cache)."""

from __future__ import annotations

from pydantic import BaseModel, Field


class MedicationSuggestion(BaseModel):
    rxcui: str
    name: str
    tty: str | None = None
    generic_name: str | None = None


class AutocompleteResponse(BaseModel):
    query: str
    suggestions: list[MedicationSuggestion] = Field(default_factory=list)


class MedicationDetail(BaseModel):
    rxcui: str
    name: str
    tty: str | None = None
    generic_name: str | None = None
    synonyms: list[str] = Field(default_factory=list)
    ndcs: list[str] = Field(default_factory=list)
    source: str | None = None


class MedicationSearchResponse(BaseModel):
    query: str
    results: list[MedicationDetail] = Field(default_factory=list)
