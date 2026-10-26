"""Clinic registration writes + team notification email.

Inserts into the service-role-only public.clinic_registration table, so callers
MUST pass a service-role client (see api.deps.get_service_client). The email is
sent via Resend after the row is saved; it is best-effort and never fails the
submission (the row in Supabase is the source of truth).
"""

from __future__ import annotations

import html
import logging

import httpx

from scripts._supabase_py import Client

from api.config import Settings
from api.errors import UpstreamError
from api.schemas.clinic_registrations import (
    ClinicRegistrationResponse,
    ClinicRegistrationSubmission,
)

log = logging.getLogger(__name__)

_RESEND_URL = "https://api.resend.com/emails"
_TIMEOUT = 10.0


def _clean(value: str | None) -> str | None:
    """Trim; collapse empty/whitespace-only strings to NULL."""
    if value is None:
        return None
    value = value.strip()
    return value or None


def _reference(registration_id: str) -> str:
    return registration_id.replace("-", "")[:6].upper()


def to_row(sub: ClinicRegistrationSubmission) -> dict:
    return {
        "clinic_name": sub.clinic_name,
        "clinic_type": sub.clinic_type.value,
        "zip": sub.zip,
        "phone": sub.phone,
        "address": sub.address,
        "website": _clean(sub.website),
        "hours": sub.hours,
        "description": _clean(sub.description),
        "contact_name": sub.contact_name,
        "contact_role": sub.contact_role,
        "contact_email": sub.contact_email,
        "contact_phone": _clean(sub.contact_phone),
        "services": [s.value for s in dict.fromkeys(sub.services)],
        "patients_served": [p.value for p in dict.fromkeys(sub.patients_served)],
        "dispenses_meds": sub.dispenses_meds.value if sub.dispenses_meds else None,
        "languages": [lang.value for lang in dict.fromkeys(sub.languages)],
        "plan": sub.plan.value,
        "lang": _clean(sub.lang),
        # status / created_at / updated_at fall to their DB defaults.
    }


def submit_registration(
    client: Client, sub: ClinicRegistrationSubmission
) -> tuple[ClinicRegistrationResponse, dict]:
    """Insert the registration. Returns the API response and the saved row."""
    try:
        resp = client.table("clinic_registration").insert(to_row(sub)).execute()
    except Exception as exc:  # noqa: BLE001 — normalize any driver error
        raise UpstreamError(f"insert clinic_registration failed: {exc}") from exc

    rows = resp.data or []
    if not rows:
        raise UpstreamError("insert clinic_registration returned no row")
    row = rows[0]
    registration_id = str(row["id"])
    return (
        ClinicRegistrationResponse(
            registration_id=registration_id, reference=_reference(registration_id)
        ),
        row,
    )


def _email_html(row: dict, reference: str) -> str:
    def fmt(value) -> str:
        if value is None or value == "" or value == []:
            return "—"
        if isinstance(value, list):
            value = ", ".join(value)
        return html.escape(str(value))

    fields = [
        ("Reference", reference),
        ("Clinic name", row.get("clinic_name")),
        ("Type", row.get("clinic_type")),
        ("Address", row.get("address")),
        ("ZIP", row.get("zip")),
        ("Phone", row.get("phone")),
        ("Website", row.get("website")),
        ("Hours", row.get("hours")),
        ("Description", row.get("description")),
        ("Contact name", row.get("contact_name")),
        ("Contact role", row.get("contact_role")),
        ("Contact email", row.get("contact_email")),
        ("Contact phone", row.get("contact_phone")),
        ("Services", row.get("services")),
        ("Patients served", row.get("patients_served")),
        ("Dispenses meds", row.get("dispenses_meds")),
        ("Languages", row.get("languages")),
        ("Plan", row.get("plan")),
        ("Form language", row.get("lang")),
    ]
    rows_html = "".join(
        f"<tr><td style='padding:4px 12px 4px 0;color:#555;vertical-align:top'>"
        f"<b>{html.escape(label)}</b></td><td style='padding:4px 0'>{fmt(value)}</td></tr>"
        for label, value in fields
    )
    return (
        "<div style='font-family:sans-serif;font-size:14px'>"
        "<h2 style='margin:0 0 12px'>New clinic registration</h2>"
        f"<table style='border-collapse:collapse'>{rows_html}</table>"
        "<p style='color:#777;margin-top:16px'>Saved in Supabase table "
        "<code>public.clinic_registration</code>.</p></div>"
    )


def send_notification(settings: Settings, row: dict, reference: str) -> None:
    """Email the team about a new registration. Best-effort: logs, never raises."""
    if not settings.resend_api_key or not settings.clinic_registration_notify_email:
        log.warning("clinic registration %s saved; email notification not configured", reference)
        return

    payload = {
        "from": settings.notify_from_email,
        "to": [settings.clinic_registration_notify_email],
        "subject": f"New clinic registration: {row.get('clinic_name')} ({reference})",
        "html": _email_html(row, reference),
    }
    if row.get("contact_email"):
        payload["reply_to"] = row["contact_email"]

    try:
        resp = httpx.post(
            _RESEND_URL,
            json=payload,
            headers={"Authorization": f"Bearer {settings.resend_api_key}"},
            timeout=_TIMEOUT,
        )
        resp.raise_for_status()
    except Exception:  # noqa: BLE001 — the row is saved; don't surface email failures
        log.exception("clinic registration %s: notification email failed", reference)
