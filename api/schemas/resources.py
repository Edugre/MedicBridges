"""Resource discovery schemas: proximity query + org-nested response."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OfferedServiceOut(BaseModel):
    """A service with its evidence granularity.

    level "site": evidence about that specific site.
    level "org":  offered somewhere in the organization's network; never a
                  claim that every (or any particular) site offers it.
    """

    code: str | None = None
    name: str
    category: str
    level: Literal["site", "org"]
    # website: the clinic's own pages; hrsa_uds: HRSA UDS annual report;
    # directory: FACHC member directory.
    source_kind: Literal["website", "hrsa_uds", "directory", "other"] = "other"
    source_url: str | None = None
    confidence: float | None = None
    is_verified: bool = False


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
    county: str | None = None
    county_fips: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    center_type: str | None = None
    accepts_sliding_scale: bool | None = None
    # Site-level evidence only; org-level services are on OrganizationOut.services.
    service_categories: list[str] = Field(default_factory=list)
    services: list[OfferedServiceOut] = Field(default_factory=list)


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
    county: str | None = None
    county_fips: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    is_currently_contracted: bool = True


class OrganizationOut(BaseModel):
    org_id: str
    grant_number: str | None = None
    # coalesce(display_name, name): patient-facing brand, else HRSA legal name.
    name: str | None = None
    website: str | None = None
    has_340b: bool = False
    distance_m: float | None = None
    # One entry per service; level "site" when any site has its own evidence.
    services: list[OfferedServiceOut] = Field(default_factory=list)
    sites: list[SiteOut] = Field(default_factory=list)
    contract_pharmacies: list[ContractPharmacyOut] = Field(default_factory=list)


class QueryEcho(BaseModel):
    lat: float
    lon: float
    radius_km: float
    county: str | None = None


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


class AssistanceFacilityOut(BaseModel):
    """A facility linked to a published financial assistance program.

    Read from v_facility_assistance_public only. These facilities have no
    coordinates, so there is deliberately no distance_m/latitude/longitude, and
    no sliding-scale or HRSA fields.
    """

    result_type: Literal["assistance_facility"] = "assistance_facility"
    facility_id: str
    name: str
    category: str | None = None
    address: str | None = None
    city: str | None = None
    state: str | None = None
    zip: str | None = None
    phone: str | None = None
    program_id: str
    program_name: str
    public_copy: str | None = None
    application_url: str | None = None
    policy_url: str | None = None
    policy_revised: str | None = None
    last_checked: str | None = None
