from __future__ import annotations

import uuid

from geoalchemy2.types import Geometry
from fastapi import APIRouter, HTTPException
from sqlalchemy import cast, func, select

from app.api.v1.schemas import OrganizationResponse, SiteResponse
from app.db.session import SessionLocal
from app.models import Organization, Site

router = APIRouter(prefix="/organizations", tags=["organizations"])


@router.get("/{org_id}", response_model=OrganizationResponse)
async def get_organization(org_id: uuid.UUID) -> OrganizationResponse:
    async with SessionLocal() as session:
        org = await session.get(Organization, org_id)

    if org is None:
        raise HTTPException(404, f"organization {org_id} not found")

    return OrganizationResponse(
        id=org.id,
        legal_name=org.legal_name,
        bhcmis_org_id=org.bhcmis_org_id,
    )


@router.get("/{org_id}/sites", response_model=list[SiteResponse])
async def get_organization_sites(org_id: uuid.UUID) -> list[SiteResponse]:
    async with SessionLocal() as session:
        org = await session.get(Organization, org_id)
        if org is None:
            raise HTTPException(404, f"organization {org_id} not found")

        stmt = (
            select(
                Site.id,
                Site.bhcmis_id,
                Site.site_name,
                Site.address,
                Site.city,
                Site.state,
                Site.zip_code.label("zip"),
                Site.phone,
                Site.npi,
                Site.org_npi,
                Site.organization_id,
                func.ST_Y(cast(Site.location, Geometry())).label("latitude"),
                func.ST_X(cast(Site.location, Geometry())).label("longitude"),
            )
            .where(Site.organization_id == org_id)
            .order_by(Site.site_name)
        )
        rows = (await session.execute(stmt)).all()

    return [
        SiteResponse(
            id=row.id,
            bhcmis_id=row.bhcmis_id,
            site_name=row.site_name,
            address=row.address,
            city=row.city,
            state=row.state,
            zip=row.zip,
            phone=row.phone,
            website=None,
            npi=row.npi,
            org_npi=row.org_npi,
            organization_id=row.organization_id,
            latitude=float(row.latitude) if row.latitude is not None else None,
            longitude=float(row.longitude) if row.longitude is not None else None,
        )
        for row in rows
    ]
