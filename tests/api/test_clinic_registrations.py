"""Clinic registration endpoint: validation, persistence, notification email."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from api.config import Settings, get_settings
from api.deps import get_service_client
from api.main import app
from api.services import clinic_registrations
from tests.api.fake_supabase import FakeClient

VALID = {
    "clinic_name": "Community Health Center of Miami",
    "clinic_type": "fqhc",
    "zip": "33101",
    "phone": "(305) 555-0123",
    "address": "123 Main St, Miami, FL",
    "hours": "Mon-Fri 8am-5pm",
    "contact_name": "Ana Perez",
    "contact_role": "Clinic Director",
    "contact_email": "ana@example.org",
    "services": ["primary_care", "dental", "primary_care"],
    "patients_served": ["uninsured", "medicaid"],
    "dispenses_meds": "340b",
    "languages": ["en", "es"],
    "plan": "basic",
    "lang": "en",
}


@pytest.fixture
def env(monkeypatch):
    fake = FakeClient()
    sent: list[tuple] = []
    monkeypatch.setattr(
        clinic_registrations,
        "send_notification",
        lambda settings, row, ref: sent.append((settings, row, ref)),
    )
    settings = Settings(RESEND_API_KEY="re_test")  # type: ignore[call-arg]
    app.dependency_overrides[get_service_client] = lambda: fake
    app.dependency_overrides[get_settings] = lambda: settings
    yield fake, sent
    app.dependency_overrides.clear()


def test_submit_saves_row_and_notifies(env):
    fake, sent = env
    r = TestClient(app).post("/api/v1/clinic-registrations", json=VALID)
    assert r.status_code == 201, r.text
    body = r.json()
    assert len(body["reference"]) == 6

    [row] = fake._tables["clinic_registration"]
    assert row["clinic_name"] == VALID["clinic_name"]
    assert row["services"] == ["primary_care", "dental"]  # de-duplicated
    assert row["website"] is None
    assert "captcha_token" not in row

    [(_, sent_row, ref)] = sent
    assert ref == body["reference"]
    assert sent_row["contact_email"] == "ana@example.org"


@pytest.mark.parametrize(
    "patch",
    [
        {"clinic_name": "   "},
        {"contact_email": "not-an-email"},
        {"zip": "abc"},
        {"clinic_type": "spa"},
        {"services": ["astrology"]},
        {"plan": "featured"},
        {"plan": "partner"},
    ],
)
def test_submit_rejects_invalid(env, patch):
    fake, sent = env
    r = TestClient(app).post("/api/v1/clinic-registrations", json={**VALID, **patch})
    assert r.status_code == 422
    assert "clinic_registration" not in fake._tables
    assert sent == []


def test_send_notification_posts_to_resend(monkeypatch):
    calls = []

    class _Resp:
        is_success = True

        def json(self):
            return {"id": "email_123"}

    monkeypatch.setattr(
        clinic_registrations.httpx, "post", lambda url, **kw: calls.append((url, kw)) or _Resp()
    )
    settings = Settings(RESEND_API_KEY="re_test")  # type: ignore[call-arg]
    row = {"clinic_name": "<b>Clinic</b>", "contact_email": "ana@example.org", "services": ["dental"]}
    clinic_registrations.send_notification(settings, row, "ABC123")

    [(url, kw)] = calls
    assert url == "https://api.resend.com/emails"
    assert kw["json"]["to"] == ["Medibridgepro@gmail.com"]
    assert kw["json"]["reply_to"] == "ana@example.org"
    assert "&lt;b&gt;Clinic&lt;/b&gt;" in kw["json"]["html"]  # escaped


def test_send_notification_skips_without_key(monkeypatch):
    monkeypatch.setattr(clinic_registrations.httpx, "post", lambda *a, **k: pytest.fail("sent"))
    clinic_registrations.send_notification(Settings(RESEND_API_KEY=""), {}, "X")  # type: ignore[call-arg]


def test_send_notification_swallows_errors(monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("down")

    monkeypatch.setattr(clinic_registrations.httpx, "post", boom)
    clinic_registrations.send_notification(Settings(RESEND_API_KEY="k"), {"clinic_name": "c"}, "X")  # type: ignore[call-arg]


def test_send_notification_logs_rejection(monkeypatch, caplog):
    class _Resp:
        is_success = False
        status_code = 403
        text = '{"message":"You can only send testing emails to your own email address"}'

    monkeypatch.setattr(clinic_registrations.httpx, "post", lambda *a, **k: _Resp())
    clinic_registrations.send_notification(Settings(RESEND_API_KEY="k"), {"clinic_name": "c"}, "X")  # type: ignore[call-arg]
    assert "403" in caplog.text and "own email address" in caplog.text


def test_health_reports_email_configured():
    r = TestClient(app).get("/health")
    assert r.status_code == 200
    assert "email_configured" in r.json()
