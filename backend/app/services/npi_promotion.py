from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import func, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import NpiMatchCandidate, Site


async def promote_single_candidate(
    session: AsyncSession,
    candidate_id: uuid.UUID,
    site_id: uuid.UUID,
    candidate_npi: str,
    *,
    reviewed_at: datetime | None = None,
    reviewed_by: str | None = None,
) -> None:
    """Write candidate_npi to sites.npi and mark the candidate as promoted.

    Pass reviewed_at and reviewed_by to record manual UI provenance.
    Caller is responsible for committing the transaction.
    """
    await session.execute(
        update(Site)
        .where(Site.id == site_id)
        .values(org_npi=candidate_npi, updated_at=func.now())
    )
    candidate_values: dict[str, Any] = {"status": "promoted", "updated_at": func.now()}
    if reviewed_at is not None:
        candidate_values["reviewed_at"] = reviewed_at
    if reviewed_by is not None:
        candidate_values["reviewed_by"] = reviewed_by
    await session.execute(
        update(NpiMatchCandidate)
        .where(NpiMatchCandidate.id == candidate_id)
        .values(**candidate_values)
    )
