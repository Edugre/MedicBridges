"""Resource discovery schemas: proximity query + org-nested response."""

from __future__ import annotations

from pydantic import BaseModel, Field


class SiteOut(BaseModel):
    site_id: str
    name: str
    distance_m: float | None = None
    within_radius: bool
    bphc_site_num: str | None = None
    phone: str | None = None
    website: str | None = None
    address_line_1: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    center_type: str | None = None
    accepts_sliding_scale: bool | None = None
    service_categories: list[str] = Field(default_factory=list)


class ContractPharmacyOut(BaseModel):
    pharmacy_id: str
    name: str
    distance_m: float | None = None
    within_radius: bool
    covered_entity_name: str | None = None
    phone: str | None = None
    address_line_1: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_currently_contracted: bool = True


class OrganizationOut(BaseModel):
    org_id: str
    grant_number: str | None = None
    name: str | None = None
    website: str | None = None
    has_340b: bool = False
    distance_m: float | None = None
    sites: list[SiteOut] = Field(default_factory=list)
    contract_pharmacies: list[ContractPharmacyOut] = Field(default_factory=list)


class QueryEcho(BaseModel):
    lat: float
    lon: float
    radius_km: float


class NearbyMeta(BaseModel):
    organization_count: int = 0
    site_count: int = 0
    site_count_in_radius: int = 0
    pharmacy_count: int = 0
    pharmacy_count_in_radius: int = 0
    excluded_ungeocoded_sites: int = 0
    excluded_ungeocoded_pharmacies: int = 0
    truncated: bool = False
    next_cursor: str | None = None
    healthcare_desert: bool = False
    warnings: list[str] = Field(default_factory=list)


class NearbyResponse(BaseModel):
    query: QueryEcho
    organizations: list[OrganizationOut] = Field(default_factory=list)
    meta: NearbyMeta


class ServiceOut(BaseModel):
    service_id: int
    name: str
    code: str | None = None
    category: str
    description: str | None = None
