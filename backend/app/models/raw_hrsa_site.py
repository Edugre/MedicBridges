import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UUIDPrimaryKeyMixin


class RawHrsaSite(UUIDPrimaryKeyMixin, Base):
    """
    Verbatim staging table for HRSA CSV rows. Stored as JSONB so the
    transform pipeline can be replayed without re-fetching source files.
    ``ingest_run_id`` identifies the ingest batch; ``ingested_at`` remains the
    wall-clock stamp for that load (same as the run's ``started_at`` today).
    """

    __tablename__ = "raw_hrsa_sites"

    source_file: Mapped[str] = mapped_column(Text, nullable=False)
    ingest_run_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("ingest_runs.id", ondelete="RESTRICT"),
        nullable=False,
    )
    ingested_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    raw_data: Mapped[dict[str, Any]] = mapped_column(JSONB, nullable=False)

    __table_args__ = (
        Index(
            "ix_raw_hrsa_sites_source_ingested",
            "source_file",
            "ingested_at",
        ),
        Index(
            "ix_raw_hrsa_sites_source_ingest_run",
            "source_file",
            "ingest_run_id",
        ),
    )