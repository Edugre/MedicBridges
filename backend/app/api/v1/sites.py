from __future__ import annotations

from geoalchemy2.types import Geography, Geometry
from fastapi import APIRouter, HTTPException, Query
from sqlalchemy import Numeric, cast, func, select, type_coerce

from app.api.v1.schemas import SiteResponse, SiteWithDistanceResponse
from app.db.session import SessionLocal
from app.models import Site

router = APIRouter(prefix="/sites", tags=["sites"])

_MAX_RADIUS_KM = 100.0
_MAX_LIMIT = 100


def _make_point(lon: float, lat: float):
    return type_coerce(func.ST_SetSRID(func.ST_MakePoint(lon, lat), 4326), Geography())


def _site_columns():
    return [
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
    ]


def _to_site_response(row) -> SiteResponse:
    return SiteResponse(
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


@router.get("/nearby", response_model=list[SiteWithDistanceResponse])
async def get_nearby_sites(
    lat: float = Query(...),
    lon: float = Query(...),
    radius_km: float = Query(default=25.0),
    limit: int = Query(default=20),
) -> list[SiteWithDistanceResponse]:
    if not (-90 <= lat <= 90):
        raise HTTPException(422, f"lat must be between -90 and 90, got {lat}")
    if not (-180 <= lon <= 180):
        raise HTTPException(422, f"lon must be between -180 and 180, got {lon}")

    radius_km = min(radius_km, _MAX_RADIUS_KM)
    limit = min(limit, _MAX_LIMIT)

    point = _make_point(lon, lat)
    radius_m = radius_km * 1000

    distance_km = func.round(
        (func.ST_Distance(Site.location, point) / 1000).cast(Numeric()), 2
    ).label("distance_km")

    stmt = (
        select(*_site_columns(), distance_km)
        .where(Site.location.isnot(None))
        .where(func.ST_DWithin(Site.location, point, radius_m))
        .order_by(func.ST_Distance(Site.location, point))
        .limit(limit)
    )

    async with SessionLocal() as session:
        rows = (await session.execute(stmt)).all()

    return [
        SiteWithDistanceResponse(
            **_to_site_response(row).model_dump(),
            distance_km=float(row.distance_km),
        )
        for row in rows
    ]


@router.get("/{bhcmis_id}", response_model=SiteResponse)
async def get_site(bhcmis_id: str) -> SiteResponse:
    stmt = select(*_site_columns()).where(Site.bhcmis_id == bhcmis_id)

    async with SessionLocal() as session:
        row = (await session.execute(stmt)).one_or_none()

    if row is None:
        raise HTTPException(404, f"site {bhcmis_id!r} not found")

    return _to_site_response(row)
