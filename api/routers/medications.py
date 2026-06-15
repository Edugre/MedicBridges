"""Medication reference: typeahead + lookup over the Postgres RxNorm/openFDA cache.

No spatial logic. Isolated from the resources router.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from scripts._supabase_py import Client

from api.deps import get_anon_client
from api.errors import NotFoundError
from api.schemas.medications import (
    AutocompleteResponse,
    MedicationDetail,
    MedicationSearchResponse,
)
from api.services import medications

router = APIRouter(prefix="/api/v1/medications", tags=["medications"])


@router.get("/autocomplete", response_model=AutocompleteResponse)
def autocomplete(
    q: Annotated[str, Query(min_length=2, description="Partial drug name")],
    limit: Annotated[int, Query(ge=1, le=25)] = 10,
    client: Client = Depends(get_anon_client),
) -> AutocompleteResponse:
    suggestions = medications.autocomplete(client, q, limit)
    return AutocompleteResponse(query=q.strip(), suggestions=suggestions)


@router.get("/search", response_model=MedicationSearchResponse)
def search(
    q: Annotated[str, Query(min_length=2, description="Drug name or NDC")],
    limit: Annotated[int, Query(ge=1, le=50)] = 20,
    client: Client = Depends(get_anon_client),
) -> MedicationSearchResponse:
    return medications.search(client, q, limit)


@router.get("/{rxcui}", response_model=MedicationDetail)
def detail(
    rxcui: str,
    client: Client = Depends(get_anon_client),
) -> MedicationDetail:
    med = medications.get_by_rxcui(client, rxcui)
    if med is None:
        raise NotFoundError("Medication not found", resource="medication")
    return med
