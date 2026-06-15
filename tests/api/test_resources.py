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
