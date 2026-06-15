"""Proximity discovery service.

PostGIS (`search_orgs_nearby`) is the authoritative radius filter + ranking. This
module pages the matched organizations, attaches their sites and 340B contract
pharmacies from the curated views, computes display distances, and shapes the
org-nested response. It never raises on empty/partial data.
"""

from __future__ import annotations

from typing import Any

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.geo import haversine_m
from api.pagination import decode_cursor, encode_cursor
from api.schemas.resources import (
    ContractPharmacyOut,
    NearbyMeta,
    NearbyResponse,
    OrganizationOut,
    QueryEcho,
    SiteOut,
)


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
    include_pharmacies: bool = True,
    include_pharmacies_outside_radius: bool = True,
) -> NearbyResponse:
    radius_m = radius_km * 1000.0
    after_distance: float | None = None
    after_org: str | None = None
    if cursor:
        parsed = decode_cursor(cursor)
        after_distance, after_org = parsed.distance_m, parsed.org_id

    # Request one extra row to detect truncation.
    org_rows = _rpc(
        client,
        "search_orgs_nearby",
        {
            "p_lat": lat,
            "p_lon": lon,
            "p_radius_m": radius_m,
            "p_limit": limit + 1,
            "p_after_distance": after_distance,
            "p_after_org": after_org,
            "p_service_categories": service_categories,
            "p_sliding": accepts_sliding_scale,
            "p_has_340b": has_340b,
        },
    )

    query_echo = QueryEcho(lat=lat, lon=lon, radius_km=radius_km)

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
            SiteOut(
                site_id=row["site_id"],
                name=row.get("name") or "",
                distance_m=round(distance, 1),
                within_radius=within,
                bphc_site_num=row.get("bphc_site_num"),
                phone=row.get("phone"),
                website=row.get("website"),
                address_line_1=row.get("address_line_1"),
                city=row.get("city"),
                state=row.get("state"),
                zip=row.get("zip"),
                latitude=s_lat,
                longitude=s_lon,
                center_type=row.get("center_type"),
                accepts_sliding_scale=row.get("accepts_sliding_scale"),
                service_categories=row.get("service_categories") or [],
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
            ContractPharmacyOut(
                pharmacy_id=row.get("pharmacy_id") or row.get("pharmacy_uuid") or "",
                name=row.get("name") or "",
                distance_m=round(distance, 1),
                within_radius=within,
                covered_entity_name=row.get("covered_entity_name"),
                phone=row.get("phone"),
                address_line_1=row.get("address_line_1"),
                city=row.get("city"),
                state=row.get("state"),
                zip=row.get("zip"),
                latitude=p_lat,
                longitude=p_lon,
                is_currently_contracted=bool(row.get("is_currently_contracted", True)),
            )
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


def get_organization(client: Client, org_id: str) -> OrganizationOut | None:
    """Full organization detail (no spatial filter): every active site + pharmacy."""
    site_rows = _select(client, "v_site", [org_id])
    pharmacy_rows = _select(client, "v_contract_pharmacy", [org_id])

    if not site_rows and not pharmacy_rows:
        return None

    org_meta: dict[str, Any] = {}
    sites: list[SiteOut] = []
    for row in site_rows:
        if not org_meta:
            org_meta = row
        if not row.get("is_active", True):
            continue
        s_lat, s_lon = _to_float(row.get("latitude")), _to_float(row.get("longitude"))
        sites.append(
            SiteOut(
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
                latitude=s_lat,
                longitude=s_lon,
                center_type=row.get("center_type"),
                accepts_sliding_scale=row.get("accepts_sliding_scale"),
                service_categories=row.get("service_categories") or [],
            )
        )

    pharmacies: list[ContractPharmacyOut] = []
    for row in pharmacy_rows:
        if not row.get("is_active", True):
            continue
        p_lat, p_lon = _to_float(row.get("latitude")), _to_float(row.get("longitude"))
        pharmacies.append(
            ContractPharmacyOut(
                pharmacy_id=row.get("pharmacy_id") or row.get("pharmacy_uuid") or "",
                name=row.get("name") or "",
                distance_m=None,
                within_radius=False,
                covered_entity_name=row.get("covered_entity_name"),
                phone=row.get("phone"),
                address_line_1=row.get("address_line_1"),
                city=row.get("city"),
                state=row.get("state"),
                zip=row.get("zip"),
                latitude=p_lat,
                longitude=p_lon,
                is_currently_contracted=bool(row.get("is_currently_contracted", True)),
            )
        )

    return OrganizationOut(
        org_id=org_id,
        grant_number=org_meta.get("grant_number"),
        name=org_meta.get("org_name"),
        website=org_meta.get("org_website"),
        has_340b=bool(org_meta.get("has_340b", False)),
        distance_m=None,
        sites=sites,
        contract_pharmacies=pharmacies,
    )


def get_site(client: Client, site_id: str) -> dict[str, Any] | None:
    try:
        resp = client.table("v_site").select("*").eq("site_id", site_id).limit(1).execute()
    except Exception as exc:
        raise UpstreamError(f"select v_site failed: {exc}") from exc
    rows = resp.data or []
    return rows[0] if rows else None
