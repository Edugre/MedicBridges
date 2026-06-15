"""Medication + admin route tests, plus pagination/geo unit checks."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.config import Settings, get_settings
from api.deps import get_anon_client, require_admin
from api.geo import haversine_m
from api.main import app
from api.pagination import decode_cursor, encode_cursor
from tests.api.fake_supabase import FakeClient


@pytest.fixture(autouse=True)
def _clear_overrides():
    yield
    app.dependency_overrides.clear()


def test_cursor_roundtrip():
    enc = encode_cursor(1234.5, "abc-def")
    parsed = decode_cursor(enc)
    assert parsed.distance_m == 1234.5
    assert parsed.org_id == "abc-def"


def test_haversine_known_distance():
    # ~1.11 km per 0.01 deg latitude.
    d = haversine_m(25.0, -80.0, 25.01, -80.0)
    assert 1100 < d < 1120


def test_medication_autocomplete():
    def med_rpc(params):
        return [
            {"rxcui": "1", "name": "Lisinopril", "tty": "IN", "generic_name": "Lisinopril"}
        ]

    fake = FakeClient(rpcs={"search_medications": med_rpc})
    app.dependency_overrides[get_anon_client] = lambda: fake
    c = TestClient(app)
    r = c.get("/api/v1/medications/autocomplete", params={"q": "lis"})
    assert r.status_code == 200
    body = r.json()
    assert body["suggestions"][0]["rxcui"] == "1"


def test_medication_detail_not_found():
    fake = FakeClient(tables={"medication": []})
    app.dependency_overrides[get_anon_client] = lambda: fake
    c = TestClient(app)
    r = c.get("/api/v1/medications/99999")
    assert r.status_code == 404
    assert r.json()["error"] == "not_found"


def test_admin_requires_key():
    settings = Settings(ADMIN_API_KEY="secret-key")  # type: ignore[call-arg]
    app.dependency_overrides[get_settings] = lambda: settings
    c = TestClient(app)
    r = c.get("/api/v1/admin/pipeline/status")
    assert r.status_code == 401
    assert r.json()["error"] == "unauthorized"


def test_admin_status_with_key():
    settings = Settings(ADMIN_API_KEY="secret-key")  # type: ignore[call-arg]
    fake = FakeClient(
        tables={
            "etl_run": [
                {
                    "run_id": "r1",
                    "pipeline_name": "etl_fqhc_sites",
                    "status": "success",
                    "started_at": "2026-06-15T12:00:00Z",
                    "finished_at": "2026-06-15T12:05:00Z",
                    "rows_affected": 1234,
                    "source_file": "sites.csv",
                    "error_message": None,
                }
            ],
            "v_data_quality_summary": [{"organizations": 500, "sites": 1200}],
        }
    )
    app.dependency_overrides[get_settings] = lambda: settings
    app.dependency_overrides[require_admin] = lambda: fake
    c = TestClient(app)
    r = c.get(
        "/api/v1/admin/pipeline/status", headers={"X-Admin-Key": "secret-key"}
    )
    assert r.status_code == 200
    body = r.json()
    assert body["pipelines"][0]["pipeline_name"] == "etl_fqhc_sites"
    assert body["data_quality"]["organizations"] == 500
