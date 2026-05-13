from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import and_, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.models import IngestRun, NpiMatchCandidate, RawNppesProvider, Site
from app.services.npi_promotion import promote_single_candidate

router = APIRouter(prefix="/review", tags=["review"])

_NPPES_SOURCE_LIKE = "npidata_pfile_%"
_REVIEWABLE_STATUSES = {"requires_review", "pending", "conflict", "accepted"}


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class CandidateItem(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    candidate_npi: str
    status: str
    match_score: float
    match_tier: int
    matched_on: dict[str, Any]
    created_at: datetime

    site_npi: str | None
    org_npi: str | None
    bhcmis_id: str | None
    site_name: str
    address: str | None
    city: str | None
    state: str | None
    zip_code: str | None
    phone: str | None

    nppes_name: str | None
    nppes_address_1: str | None
    nppes_address_2: str | None
    nppes_city: str | None
    nppes_state: str | None
    nppes_zip: str | None
    nppes_entity_type: str | None
    nppes_enumeration_date: str | None
    nppes_deactivation_date: str | None
    nppes_primary_taxonomy: str | None


class QueueResponse(BaseModel):
    items: list[CandidateItem]
    total_count: int
    page: int
    page_size: int


class CountsResponse(BaseModel):
    requires_review: int
    pending: int


class ActionResponse(BaseModel):
    id: uuid.UUID
    site_id: uuid.UUID
    candidate_npi: str
    status: str
    updated_at: datetime


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

async def _latest_nppes_run_id(db: AsyncSession) -> uuid.UUID | None:
    return await db.scalar(
        select(IngestRun.id)
        .where(IngestRun.source_file.like(_NPPES_SOURCE_LIKE))
        .where(IngestRun.status == "completed")
        .order_by(IngestRun.completed_at.desc())
        .limit(1)
    )


def _extract_primary_taxonomy(raw_data: dict[str, Any]) -> str | None:
    for i in range(1, 16):
        if raw_data.get(f"Healthcare Provider Primary Taxonomy Switch_{i}") == "Y":
            return raw_data.get(f"Healthcare Provider Taxonomy Code_{i}")
    return None


def _nppes_fields(raw_data: dict[str, Any] | None) -> dict[str, Any]:
    if not raw_data:
        return {
            "nppes_name": None,
            "nppes_address_1": None,
            "nppes_address_2": None,
            "nppes_city": None,
            "nppes_state": None,
            "nppes_zip": None,
            "nppes_entity_type": None,
            "nppes_enumeration_date": None,
            "nppes_deactivation_date": None,
            "nppes_primary_taxonomy": None,
        }
    return {
        "nppes_name": raw_data.get("Provider Organization Name (Legal Business Name)"),
        "nppes_address_1": raw_data.get("Provider First Line Business Practice Location Address"),
        "nppes_address_2": raw_data.get("Provider Second Line Business Practice Location Address") or None,
        "nppes_city": raw_data.get("Provider Business Practice Location Address City Name"),
        "nppes_state": raw_data.get("Provider Business Practice Location Address State Name"),
        "nppes_zip": raw_data.get("Provider Business Practice Location Address Postal Code"),
        "nppes_entity_type": raw_data.get("Entity Type Code"),
        "nppes_enumeration_date": raw_data.get("Provider Enumeration Date") or None,
        "nppes_deactivation_date": raw_data.get("NPI Deactivation Date") or None,
        "nppes_primary_taxonomy": _extract_primary_taxonomy(raw_data),
    }


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/counts", response_model=CountsResponse)
async def get_counts(db: AsyncSession = Depends(get_db)) -> CountsResponse:
    rr = await db.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .where(NpiMatchCandidate.status == "requires_review")
    ) or 0
    pending = await db.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .where(NpiMatchCandidate.status == "pending")
    ) or 0
    return CountsResponse(requires_review=rr, pending=pending)


@router.get("/queue", response_model=QueueResponse)
async def get_queue(
    status: str = Query(default="requires_review"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> QueueResponse:
    if status not in _REVIEWABLE_STATUSES:
        raise HTTPException(
            400,
            f"status must be one of: {', '.join(sorted(_REVIEWABLE_STATUSES))}",
        )

    nppes_run_id = await _latest_nppes_run_id(db)

    total_count = await db.scalar(
        select(func.count())
        .select_from(NpiMatchCandidate)
        .where(NpiMatchCandidate.status == status)
    ) or 0

    if total_count == 0:
        return QueueResponse(items=[], total_count=0, page=page, page_size=page_size)

    if nppes_run_id is not None:
        nppes_cond = and_(
            RawNppesProvider.raw_data["NPI"].astext == NpiMatchCandidate.candidate_npi,
            RawNppesProvider.ingest_run_id == nppes_run_id,
        )
    else:
        nppes_cond = text("1=0")  # No NPPES data staged; LEFT JOIN yields NULLs

    stmt = (
        select(
            NpiMatchCandidate.id,
            NpiMatchCandidate.site_id,
            NpiMatchCandidate.candidate_npi,
            NpiMatchCandidate.status,
            NpiMatchCandidate.match_score,
            NpiMatchCandidate.match_tier,
            NpiMatchCandidate.matched_on,
            NpiMatchCandidate.created_at,
            Site.npi.label("site_npi"),
            Site.org_npi,
            Site.bhcmis_id,
            Site.site_name,
            Site.address,
            Site.city,
            Site.state,
            Site.zip_code,
            Site.phone,
            RawNppesProvider.raw_data,
        )
        .join(Site, NpiMatchCandidate.site_id == Site.id)
        .outerjoin(RawNppesProvider, nppes_cond)
        .where(NpiMatchCandidate.status == status)
        .order_by(NpiMatchCandidate.created_at)
        .offset((page - 1) * page_size)
        .limit(page_size)
    )

    rows = (await db.execute(stmt)).all()

    items = [
        CandidateItem(
            id=row.id,
            site_id=row.site_id,
            candidate_npi=row.candidate_npi,
            status=row.status,
            match_score=float(row.match_score),
            match_tier=row.match_tier,
            matched_on=row.matched_on,
            created_at=row.created_at,
            site_npi=row.site_npi,
            org_npi=row.org_npi,
            bhcmis_id=row.bhcmis_id,
            site_name=row.site_name,
            address=row.address,
            city=row.city,
            state=row.state,
            zip_code=row.zip_code,
            phone=row.phone,
            **_nppes_fields(row.raw_data),
        )
        for row in rows
    ]

    return QueueResponse(items=items, total_count=total_count, page=page, page_size=page_size)


@router.post("/{candidate_id}/accept", response_model=ActionResponse)
async def accept_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ActionResponse:
    cand = await db.scalar(
        select(NpiMatchCandidate).where(NpiMatchCandidate.id == candidate_id)
    )
    if cand is None:
        raise HTTPException(404, "candidate not found")
    if cand.status == "promoted":
        raise HTTPException(409, "candidate already promoted")

    await promote_single_candidate(
        db, cand.id, cand.site_id, cand.candidate_npi,
        reviewed_at=datetime.now(timezone.utc),
        reviewed_by="manual_ui",
    )
    await db.commit()
    await db.refresh(cand)

    return ActionResponse(
        id=cand.id,
        site_id=cand.site_id,
        candidate_npi=cand.candidate_npi,
        status=cand.status,
        updated_at=cand.updated_at,
    )


@router.post("/{candidate_id}/reject", response_model=ActionResponse)
async def reject_candidate(
    candidate_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> ActionResponse:
    cand = await db.scalar(
        select(NpiMatchCandidate).where(NpiMatchCandidate.id == candidate_id)
    )
    if cand is None:
        raise HTTPException(404, "candidate not found")
    if cand.status in ("promoted", "rejected"):
        raise HTTPException(409, f"candidate already {cand.status}")

    await db.execute(
        update(NpiMatchCandidate)
        .where(NpiMatchCandidate.id == candidate_id)
        .values(
            status="rejected",
            updated_at=func.now(),
            reviewed_at=datetime.now(timezone.utc),
            reviewed_by="manual_ui",
        )
    )
    await db.commit()
    await db.refresh(cand)

    return ActionResponse(
        id=cand.id,
        site_id=cand.site_id,
        candidate_npi=cand.candidate_npi,
        status=cand.status,
        updated_at=cand.updated_at,
    )
