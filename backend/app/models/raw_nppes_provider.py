import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, ForeignKey, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UUIDPrimaryKeyMixin


class RawNppesProvider(UUIDPrimaryKeyMixin, Base):
    """
    Verbatim staging table for filtered NPPES CSV rows. Only Entity Type 2
    (organizations) with taxonomy 261QF0400X (FQHC) and no deactivation date
    are stored. Stored as JSONB so the transform pipeline can be replayed
    without re-fetching the source file.
    """

    __tablename__ = "raw_nppes_providers"

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
            "ix_raw_nppes_providers_source_ingested",
            "source_file",
            "ingested_at",
        ),
        Index(
            "ix_raw_nppes_providers_source_ingest_run",
            "source_file",
            "ingest_run_id",
        ),
    )
