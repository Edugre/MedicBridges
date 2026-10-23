"""Proximity discovery service.

PostGIS (`search_orgs_nearby`) is the authoritative radius filter + ranking. This
module pages the matched organizations, attaches their sites and 340B contract
pharmacies from the curated views, computes display distances, and shapes the
org-nested response. It never raises on empty/partial data.

Services come from `v_org_service_combined`. A level "org" service is attached
to the organization only, never copied onto its sites.
"""

from __future__ import annotations

import re
from typing import Any

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.geo import haversine_m
from api.pagination import decode_cursor, encode_cursor
from api.schemas.resources import (
    ContractPharmacyOut,
    NearbyMeta,
    NearbyResponse,
    OfferedServiceOut,
    OrganizationOut,
    QueryEcho,
    SiteOut,
)

SERVICES_VIEW = "v_org_service_combined"

_COUNTY_SUFFIX = re.compile(r"\s+county$", re.IGNORECASE)

# data_source values written by the ETL/scrapers -> public source_kind
_WEBSITE_SOURCES = {"website_crawl", "website_manual", "Site website (keyword extraction)"}
_DIRECTORY_SOURCES = {"FACHC directory"}


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def _rpc(client: Client, name: str, params: dict[str, Any]) -> list[dict[str, Any]]:
    try:
        resp = client.rpc(name, params).execute()
    except Exception as exc:  # supabase/postgrest client errors
        raise UpstreamError(f"RPC {name} failed: {exc}") from exc
    return resp.data or []


def _select(client: Client, view: str, org_ids: list[str]) -> list[dict[str, Any]]:
    try:
        resp = client.table(view).select("*").in_("org_id", org_ids).execute()
    except Exception as exc:
        raise UpstreamError(f"select {view} failed: {exc}") from exc
    return resp.data or []


def county_matches(row: dict[str, Any], county: str | None) -> bool:
    """Same rule as search_orgs_nearby: FIPS code, or name with/without 'County'."""
    wanted = (county or "").strip()
    if not wanted:
        return True
    if row.get("county_fips") and row["county_fips"] == wanted:
        return True
    have = row.get("county")
    if not have:
        return False
    return _COUNTY_SUFFIX.sub("", have.strip()).lower() == _COUNTY_SUFFIX.sub("", wanted).lower()


# ---------------------------------------------------------------------------
# Services
# ---------------------------------------------------------------------------


def _source_kind(data_source: str | None) -> str:
    if data_source in _WEBSITE_SOURCES:
        return "website"
    if data_source in _DIRECTORY_SOURCES:
        return "directory"
    if data_source and data_source.startswith("HRSA UDS"):
        return "hrsa_uds"
    return "other"


def _service_out(row: dict[str, Any]) -> OfferedServiceOut | None:
    level = row.get("level")
    name, category = row.get("service_name"), row.get("category")
    if level not in ("site", "org") or not name or not category:
        return None
    return OfferedServiceOut(
        code=row.get("code"),
        name=name,
        category=category,
        level=level,
        source_kind=_source_kind(row.get("data_source")),
        source_url=row.get("source_url"),
        confidence=_to_float(row.get("confidence")),
        is_verified=bool(row.get("is_verified", False)),
    )


def _evidence_rank(svc: OfferedServiceOut) -> tuple[bool, bool, float]:
    # Site-specific beats org-wide; verified beats unverified; then confidence.
    return (svc.level == "site", svc.is_verified, svc.confidence if svc.confidence is not None else -1.0)


def _sorted(best: dict[Any, OfferedServiceOut]) -> list[OfferedServiceOut]:
    return sorted(best.values(), key=lambda s: (s.category, s.name))


def _group_services(
    rows: list[dict[str, Any]],
) -> tuple[dict[str, list[OfferedServiceOut]], dict[str, list[OfferedServiceOut]]]:
    """One best-evidence entry per (org, service) and per (site, service).

    Only level "site" rows reach the per-site map, and only for the sites in
    their `site_ids`.
    """
    org_best: dict[tuple[str, Any], OfferedServiceOut] = {}
    site_best: dict[tuple[str, Any], OfferedServiceOut] = {}
    for row in rows:
        svc = _service_out(row)
        if svc is None:
            continue
        key = (row.get("org_id"), row.get("service_id"))
        if key not in org_best or _evidence_rank(svc) > _evidence_rank(org_best[key]):
            org_best[key] = svc
        if svc.level == "site":
            for site_id in row.get("site_ids") or []:
                skey = (site_id, row.get("service_id"))
                if skey not in site_best or _evidence_rank(svc) > _evidence_rank(site_best[skey]):
                    site_best[skey] = svc

    by_org: dict[str, dict[Any, OfferedServiceOut]] = {}
    for (org_id, service_id), svc in org_best.items():
        by_org.setdefault(org_id, {})[service_id] = svc
    by_site: dict[str, dict[Any, OfferedServiceOut]] = {}
    for (site_id, service_id), svc in site_best.items():
        by_site.setdefault(site_id, {})[service_id] = svc
    return (
        {org_id: _sorted(svcs) for org_id, svcs in by_org.items()},
        {site_id: _sorted(svcs) for site_id, svcs in by_site.items()},
    )


# ---------------------------------------------------------------------------
# Row -> schema
# ---------------------------------------------------------------------------


def site_from_row(
    row: dict[str, Any],
    *,
    distance_m: float | None,
    within_radius: bool,
    services: list[OfferedServiceOut],
) -> SiteOut:
    return SiteOut(
        site_id=row["site_id"],
        name=row.get("name") or "",
        distance_m=distance_m,
        within_radius=within_radius,
        bphc_site_num=row.get("bphc_site_num"),
        phone=row.get("phone"),
        website=row.get("website"),
        address_line_1=row.get("address_line_1"),
        city=row.get("city"),
        state=row.get("state"),
        zip=row.get("zip"),
        county=row.get("county"),
        county_fips=row.get("county_fips"),
        latitude=_to_float(row.get("latitude")),
        longitude=_to_float(row.get("longitude")),
        center_type=row.get("center_type"),
        accepts_sliding_scale=row.get("accepts_sliding_scale"),
        # Derived from site-level evidence only (v_site.service_categories also
        # contains org-level UDS rows copied onto every site).
        service_categories=sorted({s.category for s in services}),
        services=services,
    )


def _pharmacy_from_row(
    row: dict[str, Any], *, distance_m: float | None, within_radius: bool
) -> ContractPharmacyOut:
    return ContractPharmacyOut(
        pharmacy_id=row.get("pharmacy_id") or row.get("pharmacy_uuid") or "",
        name=row.get("name") or "",
        distance_m=distance_m,
        within_radius=within_radius,
        covered_entity_name=row.get("covered_entity_name"),
        phone=row.get("phone"),
        address_line_1=row.get("address_line_1"),
        city=row.get("city"),
        state=row.get("state"),
        zip=row.get("zip"),
        county=row.get("county"),
        county_fips=row.get("county_fips"),
        latitude=_to_float(row.get("latitude")),
        longitude=_to_float(row.get("longitude")),
        is_currently_contracted=bool(row.get("is_currently_contracted", True)),
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


def search_nearby(
    client: Client,
    *,
    lat: float,
    lon: float,
    radius_km: float,
    limit: int,
    cursor: str | None = None,
    service_categories: list[str] | None = None,
    accepts_sliding_scale: bool | None = None,
    has_340b: bool | None = None,
    county: str | None = None,
    include_pharmacies: bool = True,
    include_pharmacies_outside_radius: bool = True,
) -> NearbyResponse:
    radius_m = radius_km * 1000.0
    after_distance: float | None = None
    after_org: str | None = None
    if cursor:
        parsed = decode_cursor(cursor)
        after_distance, after_org = parsed.distance_m, parsed.org_id

    params: dict[str, Any] = {
        "p_lat": lat,
        "p_lon": lon,
        "p_radius_m": radius_m,
        "p_limit": limit + 1,  # one extra row to detect truncation
        "p_after_distance": after_distance,
        "p_after_org": after_org,
        "p_service_categories": service_categories,
        "p_sliding": accepts_sliding_scale,
        "p_has_340b": has_340b,
    }
    # Only sent when used, so callers without it still match the pre-county
    # function signature.
    if county:
        params["p_county"] = county
    org_rows = _rpc(client, "search_orgs_nearby", params)

    query_echo = QueryEcho(lat=lat, lon=lon, radius_km=radius_km, county=county)

    if not org_rows:
        return NearbyResponse(
            query=query_echo,
            organizations=[],
            meta=NearbyMeta(healthcare_desert=True),
        )

    truncated = len(org_rows) > limit
    page = org_rows[:limit]
    next_cursor = None
    if truncated:
        last = page[-1]
        next_cursor = encode_cursor(_to_float(last["distance_m"]) or 0.0, last["org_id"])

    org_ids = [row["org_id"] for row in page]
    org_order = {org_id: idx for idx, org_id in enumerate(org_ids)}

    site_rows = _select(client, "v_site", org_ids)
    pharmacy_rows = _select(client, "v_contract_pharmacy", org_ids) if include_pharmacies else []
    services_by_org, services_by_site = _group_services(_select(client, SERVICES_VIEW, org_ids))

    sites_by_org: dict[str, list[SiteOut]] = {org_id: [] for org_id in org_ids}
    pharmacies_by_org: dict[str, list[ContractPharmacyOut]] = {org_id: [] for org_id in org_ids}

    meta = NearbyMeta()

    for row in site_rows:
        org_id = row.get("org_id")
        if org_id not in sites_by_org:
            continue
        if not row.get("is_active", True):
            continue
        s_lat, s_lon = _to_float(row.get("latitude")), _to_float(row.get("longitude"))
        if s_lat is None or s_lon is None or row.get("geocode_status") != "ok":
            meta.excluded_ungeocoded_sites += 1
            continue
        distance = haversine_m(lat, lon, s_lat, s_lon)
        within = distance <= radius_m
        if within:
            meta.site_count_in_radius += 1
        sites_by_org[org_id].append(
            site_from_row(
                row,
                distance_m=round(distance, 1),
                within_radius=within,
                services=services_by_site.get(row["site_id"], []),
            )
        )

    for row in pharmacy_rows:
        org_id = row.get("org_id")
        if org_id not in pharmacies_by_org:
            continue
        if not row.get("is_active", True):
            continue
        p_lat, p_lon = _to_float(row.get("latitude")), _to_float(row.get("longitude"))
        if p_lat is None or p_lon is None or row.get("geocode_status") != "ok":
            meta.excluded_ungeocoded_pharmacies += 1
            continue
        distance = haversine_m(lat, lon, p_lat, p_lon)
        within = distance <= radius_m
        if not within and not include_pharmacies_outside_radius:
            continue
        if within:
            meta.pharmacy_count_in_radius += 1
        pharmacies_by_org[org_id].append(
            _pharmacy_from_row(row, distance_m=round(distance, 1), within_radius=within)
        )

    organizations: list[OrganizationOut] = []
    for row in page:
        org_id = row["org_id"]
        sites = sorted(sites_by_org[org_id], key=lambda s: (s.distance_m if s.distance_m is not None else 1e18))
        pharmacies = sorted(
            pharmacies_by_org[org_id],
            key=lambda p: (p.distance_m if p.distance_m is not None else 1e18),
        )
        if not sites:
            meta.warnings.append(f"organization {org_id} matched but has no geocoded sites")
        organizations.append(
            OrganizationOut(
                org_id=org_id,
                grant_number=row.get("grant_number"),
                name=row.get("org_name"),
                website=row.get("org_website"),
                has_340b=bool(row.get("has_340b", False)),
                distance_m=round(_to_float(row.get("distance_m")) or 0.0, 1),
                services=services_by_org.get(org_id, []),
                sites=sites,
                contract_pharmacies=pharmacies,
            )
        )
        meta.site_count += len(sites)
        meta.pharmacy_count += len(pharmacies)

    organizations.sort(key=lambda o: org_order[o.org_id])
    meta.organization_count = len(organizations)
    meta.truncated = truncated
    meta.next_cursor = next_cursor

    return NearbyResponse(query=query_echo, organizations=organizations, meta=meta)


def get_organization(client: Client, org_id: str, county: str | None = None) -> OrganizationOut | None:
    """Full organization detail (no spatial filter): every active site + pharmacy.

    `county` narrows the sites (not the pharmacies or org-level services).
    """
    site_rows = _select(client, "v_site", [org_id])
    pharmacy_rows = _select(client, "v_contract_pharmacy", [org_id])

    if not site_rows and not pharmacy_rows:
        return None

    services_by_org, services_by_site = _group_services(_select(client, SERVICES_VIEW, [org_id]))

    org_meta: dict[str, Any] = {}
    sites: list[SiteOut] = []
    for row in site_rows:
        if not org_meta:
            org_meta = row
        if not row.get("is_active", True):
            continue
        if not county_matches(row, county):
            continue
        sites.append(
            site_from_row(
                row,
                distance_m=None,
                within_radius=False,
                services=services_by_site.get(row["site_id"], []),
            )
        )

    pharmacies = [
        _pharmacy_from_row(row, distance_m=None, within_radius=False)
        for row in pharmacy_rows
        if row.get("is_active", True)
    ]

    return OrganizationOut(
        org_id=org_id,
        grant_number=org_meta.get("grant_number"),
        name=org_meta.get("org_name"),
        website=org_meta.get("org_website"),
        has_340b=bool(org_meta.get("has_340b", False)),
        distance_m=None,
        services=services_by_org.get(org_id, []),
        sites=sites,
        contract_pharmacies=pharmacies,
    )


def get_site(client: Client, site_id: str) -> SiteOut | None:
    try:
        resp = client.table("v_site").select("*").eq("site_id", site_id).limit(1).execute()
    except Exception as exc:
        raise UpstreamError(f"select v_site failed: {exc}") from exc
    rows = resp.data or []
    if not rows:
        return None
    row = rows[0]
    _, services_by_site = _group_services(_select(client, SERVICES_VIEW, [row["org_id"]]))
    return site_from_row(
        row,
        distance_m=None,
        within_radius=False,
        services=services_by_site.get(row["site_id"], []),
    )
