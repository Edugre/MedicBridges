import uuid
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    CheckConstraint,
    ForeignKey,
    Index,
    Numeric,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import TimestampMixin, UUIDPrimaryKeyMixin


class NpiMatchCandidate(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    One candidate NPI match per (site, npi) pair. Populated by the NPPES
    matching pipeline; reviewed and promoted in Stage 4.

    updated_at is not refreshed by ORM saves — upserts must include
    "updated_at": func.now() in the set_ dict explicitly.
    """

    __tablename__ = "npi_match_candidates"

    site_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("sites.id", ondelete="CASCADE"),
        nullable=False,
    )
    ingest_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingest_runs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    candidate_npi: Mapped[str] = mapped_column(String(10), nullable=False)
    match_tier: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    match_score: Mapped[Decimal] = mapped_column(Numeric(5, 4), nullable=False)
    matched_on: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)
    nppes_legal_name: Mapped[str] = mapped_column(Text, nullable=False)
    nppes_address: Mapped[str] = mapped_column(Text, nullable=False)
    nppes_city: Mapped[str] = mapped_column(Text, nullable=False)
    nppes_state: Mapped[str] = mapped_column(Text, nullable=False)
    nppes_zip5: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(Text, nullable=False)

    __table_args__ = (
        UniqueConstraint("site_id", "candidate_npi"),
        CheckConstraint("match_tier IN (1, 2, 3)", name="tier_valid"),
        CheckConstraint("match_score >= 0 AND match_score <= 1", name="score_range"),
        CheckConstraint(
            "status IN ('accepted', 'pending', 'rejected', 'promoted', 'conflict', 'requires_review')",
            name="status_valid",
        ),
        Index("ix_npi_match_candidates_status", "status"),
        Index("ix_npi_match_candidates_site_id", "site_id"),
        Index("ix_npi_match_candidates_candidate_npi", "candidate_npi"),
    )
