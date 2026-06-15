"""Medication reference service (Postgres cache).

Typeahead and lookup are served from `public.medication`, kept fresh by
`scripts/etl/etl_medications.py`. Keeping this in Postgres makes autocomplete
sub-100ms and isolates the medication routes from external API latency/outages.
"""

from __future__ import annotations

from typing import Any

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.schemas.medications import (
    MedicationDetail,
    MedicationSearchResponse,
    MedicationSuggestion,
)


def _detail_from_row(row: dict[str, Any]) -> MedicationDetail:
    return MedicationDetail(
        rxcui=row.get("rxcui") or "",
        name=row.get("name") or "",
        tty=row.get("tty"),
        generic_name=row.get("generic_name"),
        synonyms=row.get("synonyms") or [],
        ndcs=row.get("ndcs") or [],
        source=row.get("source"),
    )


def autocomplete(client: Client, query: str, limit: int) -> list[MedicationSuggestion]:
    q = (query or "").strip()
    if len(q) < 2:
        return []
    try:
        resp = client.rpc(
            "search_medications", {"p_q": q, "p_limit": limit}
        ).execute()
    except Exception as exc:
        raise UpstreamError(f"search_medications RPC failed: {exc}") from exc
    return [
        MedicationSuggestion(
            rxcui=row.get("rxcui") or "",
            name=row.get("name") or "",
            tty=row.get("tty"),
            generic_name=row.get("generic_name"),
        )
        for row in (resp.data or [])
    ]


def get_by_rxcui(client: Client, rxcui: str) -> MedicationDetail | None:
    try:
        resp = client.table("medication").select("*").eq("rxcui", rxcui).limit(1).execute()
    except Exception as exc:
        raise UpstreamError(f"select medication failed: {exc}") from exc
    rows = resp.data or []
    return _detail_from_row(rows[0]) if rows else None


def search(client: Client, query: str, limit: int) -> MedicationSearchResponse:
    q = (query or "").strip()
    results: list[MedicationDetail] = []
    if len(q) >= 2:
        # Name match via the trigram RPC, then hydrate full detail rows.
        suggestions = autocomplete(client, q, limit)
        rxcuis = [s.rxcui for s in suggestions if s.rxcui]
        if rxcuis:
            try:
                resp = client.table("medication").select("*").in_("rxcui", rxcuis).execute()
            except Exception as exc:
                raise UpstreamError(f"select medication failed: {exc}") from exc
            by_rxcui = {r["rxcui"]: r for r in (resp.data or [])}
            results = [_detail_from_row(by_rxcui[rx]) for rx in rxcuis if rx in by_rxcui]

    # NDC fallback: digits-only query that didn't match by name.
    if not results and q.replace("-", "").isdigit():
        ndc = q.replace("-", "")
        try:
            resp = client.table("medication").select("*").contains("ndcs", [ndc]).limit(limit).execute()
        except Exception as exc:
            raise UpstreamError(f"select medication by ndc failed: {exc}") from exc
        results = [_detail_from_row(r) for r in (resp.data or [])]

    return MedicationSearchResponse(query=q, results=results)
