"""Resource discovery + error-contract tests (no live Supabase required)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.config import Settings, get_settings
from api.deps import get_anon_client
from api.main import app
from tests.api.fake_supabase import FakeClient

# Miami-ish anchor point.
LAT, LON = 25.7617, -80.1918


def _orgs_rpc(rows):
    def handler(params):
        after_d = params.get("p_after_distance")
        after_o = params.get("p_after_org")
        limit = params.get("p_limit", 25)
        data = sorted(rows, key=lambda r: (r["distance_m"], r["org_id"]))
        if after_d is not None:
            data = [
                r for r in data if (r["distance_m"], r["org_id"]) > (after_d, after_o)
            ]
        return data[:limit]

    return handler


@pytest.fixture
def client_factory():
    def make(fake: FakeClient, settings: Settings | None = None) -> TestClient:
        app.dependency_overrides[get_anon_client] = lambda: fake
        if settings is not None:
            app.dependency_overrides[get_settings] = lambda: settings
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()


def test_health():
    c = TestClient(app)
    r = c.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_invalid_coordinates(client_factory):
    c = client_factory(FakeClient())
    r = c.get("/api/v1/resources/nearby", params={"lat": 200, "lon": -80})
    assert r.status_code == 422
    assert r.json()["error"] == "invalid_coordinates"


def test_radius_exceeds_max(client_factory):
    c = client_factory(FakeClient())
    r = c.get(
        "/api/v1/resources/nearby",
        params={"lat": LAT, "lon": LON, "radius_km": 999},
    )
    assert r.status_code == 422
    body = r.json()
    assert body["error"] == "radius_exceeds_max"
    assert body["max_km"] == 20.0


def test_healthcare_desert(client_factory):
    fake = FakeClient(rpcs={"search_orgs_nearby": _orgs_rpc([])})
    c = client_factory(fake)
    r = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON})
    assert r.status_code == 200
    body = r.json()
    assert body["organizations"] == []
    assert body["meta"]["healthcare_desert"] is True


def test_nearby_org_nested_payload(client_factory):
    org_id = "11111111-1111-1111-1111-111111111111"
    orgs = [
        {
            "org_id": org_id,
            "grant_number": "H80CS00001",
            "org_name": "Test CHC",
            "org_website": "https://example.org",
            "has_340b": True,
            "distance_m": 100.0,
        }
    ]
    sites = [
        {
            "site_id": "site-1",
            "org_id": org_id,
            "name": "Main Site",
            "latitude": 25.7620,
            "longitude": -80.1920,
            "geocode_status": "ok",
            "is_active": True,
            "service_categories": ["Primary Care"],
            "accepts_sliding_scale": True,
        },
        {
            "site_id": "site-ungeocoded",
            "org_id": org_id,
            "name": "No Coords Site",
            "latitude": None,
            "longitude": None,
            "geocode_status": "failed",
            "is_active": True,
            "service_categories": [],
        },
    ]
    pharmacies = [
        {
            "pharmacy_id": "PH-1",
            "org_id": org_id,
            "name": "Discount Pharmacy",
            "latitude": 25.99,
            "longitude": -80.40,
            "geocode_status": "ok",
            "is_active": True,
            "is_currently_contracted": True,
        }
    ]
    fake = FakeClient(
        tables={"v_site": sites, "v_contract_pharmacy": pharmacies},
        rpcs={"search_orgs_nearby": _orgs_rpc(orgs)},
    )
    c = client_factory(fake)
    r = c.get(
        "/api/v1/resources/nearby",
        params={"lat": LAT, "lon": LON, "radius_km": 5},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["meta"]["organization_count"] == 1
    assert body["meta"]["excluded_ungeocoded_sites"] == 1
    org = body["organizations"][0]
    assert org["org_id"] == org_id
    assert org["has_340b"] is True
    assert len(org["sites"]) == 1
    assert org["sites"][0]["within_radius"] is True
    # Pharmacy is far away but still attached (outside-radius default = true).
    assert len(org["contract_pharmacies"]) == 1
    assert org["contract_pharmacies"][0]["within_radius"] is False


def test_pagination_cursor_advances(client_factory):
    orgs = [
        {
            "org_id": f"00000000-0000-0000-0000-00000000000{i}",
            "grant_number": f"G{i}",
            "org_name": f"Org {i}",
            "org_website": None,
            "has_340b": False,
            "distance_m": float(i * 100),
        }
        for i in range(1, 4)
    ]
    fake = FakeClient(
        tables={"v_site": [], "v_contract_pharmacy": []},
        rpcs={"search_orgs_nearby": _orgs_rpc(orgs)},
    )
    c = client_factory(fake)
    r1 = c.get(
        "/api/v1/resources/nearby",
        params={"lat": LAT, "lon": LON, "limit": 2},
    )
    assert r1.status_code == 200
    meta1 = r1.json()["meta"]
    assert meta1["truncated"] is True
    assert meta1["next_cursor"]

    r2 = c.get(
        "/api/v1/resources/nearby",
        params={"lat": LAT, "lon": LON, "limit": 2, "cursor": meta1["next_cursor"]},
    )
    assert r2.status_code == 200
    ids_page2 = [o["org_id"] for o in r2.json()["organizations"]]
    assert ids_page2 == ["00000000-0000-0000-0000-000000000003"]


def test_bad_cursor(client_factory):
    fake = FakeClient(rpcs={"search_orgs_nearby": _orgs_rpc([])})
    c = client_factory(fake)
    r = c.get(
        "/api/v1/resources/nearby",
        params={"lat": LAT, "lon": LON, "cursor": "not-valid!!"},
    )
    assert r.status_code == 400
    assert r.json()["error"] == "invalid_cursor"


# ---------------------------------------------------------------------------
# Display names, service levels, county
# ---------------------------------------------------------------------------

ORG_ID = "22222222-2222-2222-2222-222222222222"


def _org_row(**overrides):
    row = {
        "org_id": ORG_ID,
        "grant_number": "H80CS00019",
        # search_orgs_nearby/v_site already return coalesce(display_name, name)
        "org_name": "Broward HealthPoint",
        "org_website": "https://example.org",
        "has_340b": False,
        "distance_m": 50.0,
    }
    row.update(overrides)
    return row


def _site_row(site_id, lat=25.7620, lon=-80.1920, **overrides):
    row = {
        "site_id": site_id,
        "org_id": ORG_ID,
        "grant_number": "H80CS00019",
        "org_name": "Broward HealthPoint",
        "name": f"Site {site_id}",
        "latitude": lat,
        "longitude": lon,
        "geocode_status": "ok",
        "is_active": True,
        "county": "Miami-Dade County",
        "county_fips": "12086",
        # v_site still aggregates UDS fan-out rows; the API must not echo them.
        "service_categories": ["Primary Care", "Dental"],
    }
    row.update(overrides)
    return row


def _svc_row(service_id, name, category, level, **overrides):
    row = {
        "org_id": ORG_ID,
        "grant_number": "H80CS00019",
        "service_id": service_id,
        "code": name[:3].upper(),
        "level": level,
        "data_source": "website_crawl" if level == "org" else "Site website (keyword extraction)",
        "source_url": f"https://example.org/{service_id}",
        "confidence": 0.8,
        "is_verified": False,
        "site_ids": None,
        "service_name": name,
        "category": category,
    }
    row.update(overrides)
    return row


SERVICE_ROWS = [
    _svc_row(5, "General Dentistry", "Dental", "org"),
    _svc_row(
        1, "Primary Care", "Primary Care", "org",
        data_source="HRSA UDS 2024 Table 5 (org-level)", confidence=None,
    ),
    _svc_row(1, "Primary Care", "Primary Care", "site", site_ids=["site-a"], confidence=0.9),
]


def _fake(sites=None, services=None, rpc_rows=None, calls=None):
    def rpc(params):
        if calls is not None:
            calls.append(params)
        return _orgs_rpc(rpc_rows if rpc_rows is not None else [_org_row()])(params)

    return FakeClient(
        tables={
            "v_site": sites if sites is not None else [_site_row("site-a"), _site_row("site-b")],
            "v_contract_pharmacy": [],
            "v_org_service_combined": services if services is not None else SERVICE_ROWS,
        },
        rpcs={"search_orgs_nearby": rpc},
    )


def test_org_name_is_display_name_from_view(client_factory):
    c = client_factory(_fake())
    org = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON}).json()["organizations"][0]
    assert org["name"] == "Broward HealthPoint"


def test_org_name_falls_back_to_legal_name(client_factory):
    # display_name NULL -> the view's coalesce yields the HRSA legal name.
    fake = _fake(
        rpc_rows=[_org_row(org_name="Camillus Health Concern Inc")],
        sites=[_site_row("site-a", org_name="Camillus Health Concern Inc")],
    )
    c = client_factory(fake)
    org = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON}).json()["organizations"][0]
    assert org["name"] == "Camillus Health Concern Inc"
    detail = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()
    assert detail["name"] == "Camillus Health Concern Inc"


def test_org_services_carry_level_and_provenance(client_factory):
    c = client_factory(_fake())
    org = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()
    by_name = {s["name"]: s for s in org["services"]}
    assert set(by_name) == {"General Dentistry", "Primary Care"}
    dental = by_name["General Dentistry"]
    assert dental == {
        "code": "GEN",
        "name": "General Dentistry",
        "category": "Dental",
        "level": "org",
        "source_kind": "website",
        "source_url": "https://example.org/5",
        "confidence": 0.8,
        "is_verified": False,
    }
    # Site-specific evidence wins over the org-level UDS row for the same service.
    assert by_name["Primary Care"]["level"] == "site"


def test_uds_rows_are_not_labelled_as_website(client_factory):
    rows = [SERVICE_ROWS[1]]
    c = client_factory(_fake(services=rows))
    svc = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()["services"][0]
    assert svc["level"] == "org"
    assert svc["source_kind"] == "hrsa_uds"


def test_org_level_service_never_attached_to_sites(client_factory):
    c = client_factory(_fake())
    org = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON}).json()["organizations"][0]
    sites = {s["site_id"]: s for s in org["sites"]}
    assert [s["name"] for s in sites["site-a"]["services"]] == ["Primary Care"]
    assert all(s["level"] == "site" for s in sites["site-a"]["services"])
    assert sites["site-a"]["service_categories"] == ["Primary Care"]
    # site-b has no site-level evidence: nothing, not the org's list or v_site's UDS array.
    assert sites["site-b"]["services"] == []
    assert sites["site-b"]["service_categories"] == []


def test_org_only_services_leave_every_site_empty(client_factory):
    services = [s for s in SERVICE_ROWS if s["level"] == "org"]
    c = client_factory(_fake(services=services))
    org = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()
    assert {s["level"] for s in org["services"]} == {"org"}
    assert all(site["services"] == [] for site in org["sites"])


def test_site_detail_services_are_site_level(client_factory):
    c = client_factory(_fake())
    body = c.get("/api/v1/resources/sites/site-b").json()
    assert body["services"] == []
    body = c.get("/api/v1/resources/sites/site-a").json()
    assert [s["level"] for s in body["services"]] == ["site"]
    assert body["county"] == "Miami-Dade County"
    assert body["county_fips"] == "12086"


def test_service_rows_missing_catalog_fields_are_dropped(client_factory):
    # Pre-migration view shape (no service_name/category) must not crash or guess.
    rows = [{k: v for k, v in SERVICE_ROWS[0].items() if k not in ("service_name", "category")}]
    c = client_factory(_fake(services=rows))
    org = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()
    assert org["services"] == []


def test_nearby_county_passed_to_rpc_only_when_set(client_factory):
    calls = []
    c = client_factory(_fake(calls=calls))
    c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON})
    assert "p_county" not in calls[-1]
    r = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON, "county": " Miami-Dade "})
    assert calls[-1]["p_county"] == "Miami-Dade"
    assert r.json()["query"]["county"] == "Miami-Dade"
    c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON, "county": "  "})
    assert "p_county" not in calls[-1]


def test_nearby_exposes_site_county(client_factory):
    c = client_factory(_fake())
    org = c.get("/api/v1/resources/nearby", params={"lat": LAT, "lon": LON}).json()["organizations"][0]
    assert {s["county"] for s in org["sites"]} == {"Miami-Dade County"}


@pytest.mark.parametrize("county", ["Miami-Dade", "miami-dade county", "12086"])
def test_organization_county_filter_matches_name_or_fips(client_factory, county):
    sites = [
        _site_row("site-a"),
        _site_row("site-b", county="Broward County", county_fips="12011"),
        _site_row("site-c", county=None, county_fips=None),
    ]
    c = client_factory(_fake(sites=sites))
    body = c.get(f"/api/v1/resources/organizations/{ORG_ID}", params={"county": county}).json()
    assert [s["site_id"] for s in body["sites"]] == ["site-a"]
    # Org-level services describe the whole network, so they are not narrowed.
    assert len(body["services"]) == 2


def test_organization_without_county_returns_all_sites(client_factory):
    sites = [_site_row("site-a"), _site_row("site-c", county=None, county_fips=None)]
    c = client_factory(_fake(sites=sites))
    body = c.get(f"/api/v1/resources/organizations/{ORG_ID}").json()
    assert {s["site_id"] for s in body["sites"]} == {"site-a", "site-c"}
