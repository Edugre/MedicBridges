from typing import TYPE_CHECKING

from sqlalchemy import Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.db.types import TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.site import Site


class Organization(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    """
    Top-level entity representing a healthcare organization.
    Sites are the physical locations belonging to an organization.
    """

    __tablename__ = "organizations"

    legal_name: Mapped[str] = mapped_column(Text, nullable=False)
    npi: Mapped[str | None] = mapped_column(String(10), unique=True, nullable=True)
    opais_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)
    bhcmis_org_id: Mapped[str | None] = mapped_column(Text, unique=True, nullable=True)

    sites: Mapped[list["Site"]] = relationship(
        back_populates="organization",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )

    __table_args__ = (
        Index(
            "ix_organizations_legal_name_trgm",
            "legal_name",
            postgresql_using="gin",
            postgresql_ops={"legal_name": "gin_trgm_ops"},
        ),
    )