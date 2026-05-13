import uuid
from typing import TYPE_CHECKING

from geoalchemy2 import Geography
from geoalchemy2.elements import WKBElement
from sqlalchemy import ForeignKey, Index, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.organization import Organization


class Site(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Physical clinic location. PostGIS-enabled for geospatial queries.
    bhcmis_id is HRSA's stable site identifier — used as the upsert key
    when re-ingesting HRSA data.
    """

    __tablename__ = "sites"

    organization_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    bhcmis_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    site_name: Mapped[str] = mapped_column(Text, nullable=False)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    city: Mapped[str | None] = mapped_column(Text, nullable=True)
    state: Mapped[str | None] = mapped_column(String(2), nullable=True)
    zip_code: Mapped[str | None] = mapped_column(String(10), nullable=True)
    phone: Mapped[str | None] = mapped_column(Text, nullable=True)
    npi: Mapped[str | None] = mapped_column(String(10), nullable=True, index=True)
    org_npi: Mapped[str | None] = mapped_column(String(10), nullable=True)

    location: Mapped[WKBElement | None] = mapped_column(
        Geography(geometry_type="POINT", srid=4326, spatial_index=False),
        nullable=True,
    )

    organization: Mapped["Organization"] = relationship(back_populates="sites")

    __table_args__ = (
        Index("ix_sites_zip_code", "zip_code"),
        Index("ix_sites_location", "location", postgresql_using="gist"),
        Index(
            "ix_sites_site_name_trgm",
            "site_name",
            postgresql_using="gin",
            postgresql_ops={"site_name": "gin_trgm_ops"},
        ),
    )