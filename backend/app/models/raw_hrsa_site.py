from datetime import datetime
from typing import Any

from sqlalchemy import DateTime, Index, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base
from app.db.types import UUIDPrimaryKeyMixin


class RawHrsaSite(UUIDPrimaryKeyMixin, Base):
    """
    Verbatim staging table for HRSA CSV rows. Stored as JSONB so the
    transform pipeline can be replayed without re-fetching source files.
    No timestamp mixin — only ingested_at matters here.
    """

    __tablename__ = "raw_hrsa_sites"

    source_file: Mapped[str] = mapped_column(Text, nullable=False)
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
    )