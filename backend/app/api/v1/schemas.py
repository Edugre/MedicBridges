from __future__ import annotations

import uuid

from pydantic import BaseModel


class SiteResponse(BaseModel):
    id: uuid.UUID
    bhcmis_id: str | None
    site_name: str
    address: str | None
    city: str | None
    state: str | None
    zip: str | None
    phone: str | None
    website: str | None
    npi: str | None
    org_npi: str | None
    latitude: float | None
    longitude: float | None
    organization_id: uuid.UUID

    model_config = {"from_attributes": True}


class SiteWithDistanceResponse(SiteResponse):
    distance_km: float


class OrganizationResponse(BaseModel):
    id: uuid.UUID
    legal_name: str
    bhcmis_org_id: str | None

    model_config = {"from_attributes": True}
