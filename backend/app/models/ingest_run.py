from datetime import datetime
from typing import Any

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    DateTime,
    Index,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UUIDPrimaryKeyMixin


class IngestRun(UUIDPrimaryKeyMixin, Base):
    """Operational catalog of every ingest attempt.

    Records what was ingested, when, and whether it succeeded. Survives
    --replace wipes of the staging tables, so the history of ingests is
    preserved even when the raw rows they produced have been cleared.

    This is the *operational* catalog, not a regulatory archive: it is
    queryable from the application DB and is intended to be short- to
    medium-lived. When compliance retention is introduced, the immutable
    byte-level copy of the source artifact should live in a separate trust
    boundary (object storage with WORM is the recommended shape) and be
    referenced from this row via a future ``archive_uri`` column.
    """

    __tablename__ = "ingest_runs"

    source_file: Mapped[str] = mapped_column(Text, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    status: Mapped[str] = mapped_column(Text, nullable=False)
    row_count: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rows_read: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rows_passed_filter: Mapped[int | None] = mapped_column(Integer, nullable=True)
    bytes: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    file_sha256: Mapped[str | None] = mapped_column(String(64), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    stats: Mapped[dict[str, Any] | None] = mapped_column(JSONB, nullable=True)

    __table_args__ = (
        CheckConstraint(
            "status in ('running', 'completed', 'failed')",
            name="status_valid",
        ),
        Index(
            "ix_ingest_runs_source_file_completed_at",
            "source_file",
            "completed_at",
        ),
        Index(
            "ix_ingest_runs_source_file_started_at",
            "source_file",
            "started_at",
        ),
    )
