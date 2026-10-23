"""Assistance-program facilities: ZIP/city matching from the public view only."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.deps import get_anon_client
from api.main import app
from tests.api.fake_supabase import FakeClient

URL = "/api/v1/resources/assistance"


def _row(**overrides):
    row = {
        "facility_id": "JHS-001",
        "facility_name": "Jackson Memorial Hospital",
        "category": "hospital",
        "address": "1611 NW 12th Ave",
        "city": "Miami",
        "state": "FL",
        "zip": "33136",
        "phone": "305-585-1111",
        "program_id": "jhs-fap",
        "program_name": "Jackson Financial Assistance",
        "public_copy": "Jackson reviews applications for help paying hospital bills.",
        "application_url": "https://example.org/apply",
        "policy_url": "https://example.org/policy.pdf",
        "policy_revised": "2026-01-15",
        "last_checked": "2026-10-01",
        # Present in the view but must never reach the response.
        "fpl_max_percent": 200,
        "eligibility_rules": {"income": "x"},
    }
    row.update(overrides)
    return row


@pytest.fixture
def client_for():
    def make(rows) -> TestClient:
        fake = FakeClient(tables={"v_facility_assistance_public": rows})
        app.dependency_overrides[get_anon_client] = lambda: fake
        return TestClient(app)

    yield make
    app.dependency_overrides.clear()


def test_zero_rows_returns_empty(client_for):
    r = client_for([]).get(URL, params={"zip": "33136", "city": "Miami"})
    assert r.status_code == 200
    assert r.json() == []


def test_one_row_matches_zip(client_for):
    r = client_for([_row()]).get(URL, params={"zip": "33136"})
    assert r.status_code == 200
    body = r.json()
    assert len(body) == 1
    item = body[0]
    assert item["result_type"] == "assistance_facility"
    assert item["name"] == "Jackson Memorial Hospital"
    assert item["policy_revised"] == "2026-01-15"
    for absent in ("distance_m", "latitude", "longitude", "accepts_sliding_scale",
                   "fpl_max_percent", "eligibility_rules"):
        assert absent not in item


def test_zip_plus_four_and_city_case_normalized(client_for):
    rows = [_row(zip="33136-1096", city="MIAMI")]
    assert len(client_for(rows).get(URL, params={"zip": "33136"}).json()) == 1
    assert len(client_for(rows).get(URL, params={"city": " miami "}).json()) == 1


def test_missing_zip_falls_back_to_city(client_for):
    rows = [
        _row(facility_id="A", zip=None, city="Miami"),
        _row(facility_id="B", zip=None, city="Hialeah"),
        _row(facility_id="C", zip="", city=None),
    ]
    c = client_for(rows)
    by_city = c.get(URL, params={"zip": "33130", "city": "Miami"}).json()
    assert [f["facility_id"] for f in by_city] == ["A"]
    # A ZIP-only search never matches rows without a ZIP.
    assert c.get(URL, params={"zip": "33130"}).json() == []


def test_no_location_returns_nothing(client_for):
    r = client_for([_row()]).get(URL)
    assert r.status_code == 200
    assert r.json() == []
