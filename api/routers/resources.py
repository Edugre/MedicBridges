"""Resource discovery: proximity search for clinics + matching 340B pharmacies.

Spatially isolated from the medication and admin routers.
"""

from __future__ import annotations

from enum import Enum
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from scripts._supabase_py import Client

from api.config import Settings, get_settings
from api.deps import get_anon_client
from api.errors import InvalidCoordinatesError, NotFoundError, RadiusExceedsMaxError
from api.geo import coordinates_valid
from api.schemas.resources import NearbyResponse, OrganizationOut, ServiceOut, SiteOut
from api.services import spatial

router = APIRouter(prefix="/api/v1/resources", tags=["resources"])


class ResourceType(str, Enum):
    site = "site"
    pharmacy = "pharmacy"


@router.get("/nearby", response_model=NearbyResponse)
def nearby(
    lat: Annotated[float, Query(description="Latitude (-90..90)")],
    lon: Annotated[float, Query(description="Longitude (-180..180)")],
    radius_km: Annotated[float | None, Query(description="Search radius in km")] = None,
    limit: Annotated[int | None, Query(ge=1, description="Organizations per page")] = None,
    cursor: Annotated[str | None, Query(description="Opaque pagination cursor")] = None,
    resource_types: Annotated[list[ResourceType] | None, Query()] = None,
    service_categories: Annotated[list[str] | None, Query()] = None,
    accepts_sliding_scale: Annotated[bool | None, Query()] = None,
    has_340b: Annotated[bool | None, Query()] = None,
    include_pharmacies_outside_radius: Annotated[bool, Query()] = True,
    client: Client = Depends(get_anon_client),
    settings: Settings = Depends(get_settings),
) -> NearbyResponse:
    if not coordinates_valid(lat, lon):
        raise InvalidCoordinatesError(
            f"lat must be in [-90, 90] and lon in [-180, 180]; got lat={lat}, lon={lon}"
        )

    effective_radius = radius_km if radius_km is not None else settings.default_radius_km
    if effective_radius < settings.min_radius_km:
        effective_radius = settings.min_radius_km
    if effective_radius > settings.max_radius_km:
        raise RadiusExceedsMaxError(
            f"radius_km may not exceed {settings.max_radius_km}",
            max_km=settings.max_radius_km,
        )

    page_size = limit if limit is not None else settings.default_page_size
    page_size = min(page_size, settings.max_page_size)

    types = {t.value for t in resource_types} if resource_types else {"site", "pharmacy"}

    return spatial.search_nearby(
        client,
        lat=lat,
        lon=lon,
        radius_km=effective_radius,
        limit=page_size,
        cursor=cursor,
        service_categories=service_categories or None,
        accepts_sliding_scale=accepts_sliding_scale,
        has_340b=has_340b,
        include_pharmacies="pharmacy" in types,
        include_pharmacies_outside_radius=include_pharmacies_outside_radius,
    )


@router.get("/organizations/{org_id}", response_model=OrganizationOut)
def organization_detail(
    org_id: str,
    client: Client = Depends(get_anon_client),
) -> OrganizationOut:
    org = spatial.get_organization(client, org_id)
    if org is None:
        raise NotFoundError("Organization not found", resource="organization")
    return org


@router.get("/sites/{site_id}", response_model=SiteOut)
def site_detail(
    site_id: str,
    client: Client = Depends(get_anon_client),
) -> SiteOut:
    row = spatial.get_site(client, site_id)
    if row is None:
        raise NotFoundError("Site not found", resource="site")
    return SiteOut(
        site_id=row["site_id"],
        name=row.get("name") or "",
        distance_m=None,
        within_radius=False,
        bphc_site_num=row.get("bphc_site_num"),
        phone=row.get("phone"),
        website=row.get("website"),
        address_line_1=row.get("address_line_1"),
        city=row.get("city"),
        state=row.get("state"),
        zip=row.get("zip"),
        latitude=float(row["latitude"]) if row.get("latitude") is not None else None,
        longitude=float(row["longitude"]) if row.get("longitude") is not None else None,
        center_type=row.get("center_type"),
        accepts_sliding_scale=row.get("accepts_sliding_scale"),
        service_categories=row.get("service_categories") or [],
    )


# Service taxonomy lives under its own top-level path but is part of discovery.
catalog_router = APIRouter(prefix="/api/v1/services", tags=["services"])


@catalog_router.get("", response_model=list[ServiceOut])
def list_services(client: Client = Depends(get_anon_client)) -> list[ServiceOut]:
    resp = client.table("service").select("*").order("category").order("name").execute()
    return [
        ServiceOut(
            service_id=row["service_id"],
            name=row["name"],
            code=row.get("code"),
            category=row["category"],
            description=row.get("description"),
        )
        for row in (resp.data or [])
    ]
