"""Data-quality report writes (the public "Report an issue" flow).

Inserts into the service-role-only public.data_quality_report /
public.data_quality_report_field tables, so callers MUST pass a service-role
client (see api.deps.get_service_client) — anon has no grant on these tables.
"""

from __future__ import annotations

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.schemas.reports import ReportSubmission, ReportSubmissionResponse


def _clean(value: str | None) -> str | None:
    """Trim; collapse empty/whitespace-only strings to NULL."""
    if value is None:
        return None
    value = value.strip()
    return value or None


def submit_report(client: Client, submission: ReportSubmission) -> ReportSubmissionResponse:
    parent = {
        "subject_type": submission.subject_type.value,
        "subject_key": submission.subject_key.strip(),
        "category": submission.category.value,
        "new_address": _clean(submission.new_address),
        "feedback_topic": submission.feedback_topic.value if submission.feedback_topic else None,
        "description": _clean(submission.description),
        "reporter_name": _clean(submission.reporter_name),
        "reporter_organization": _clean(submission.reporter_organization),
        "reporter_email": _clean(submission.reporter_email),
        # status / created_at / updated_at fall to their DB defaults.
    }

    try:
        resp = client.table("data_quality_report").insert(parent).execute()
    except Exception as exc:  # noqa: BLE001 — normalize any driver error
        raise UpstreamError(f"insert data_quality_report failed: {exc}") from exc

    rows = resp.data or []
    if not rows:
        raise UpstreamError("insert data_quality_report returned no row")
    row = rows[0]
    report_id = str(row["id"])

    # Per-field corrections (wrong_info only). Kept as a separate insert; on
    # failure we best-effort remove the orphaned parent so a report is never
    # persisted without the corrections that give it meaning.
    field_rows = [
        {
            "report_id": report_id,
            "field": f.field.value,
            "currently_listed": _clean(f.currently_listed),
            "should_be": _clean(f.should_be),
        }
        for f in submission.fields
    ]
    if field_rows:
        try:
            client.table("data_quality_report_field").insert(field_rows).execute()
        except Exception as exc:  # noqa: BLE001
            try:
                client.table("data_quality_report").delete().eq("id", report_id).execute()
            except Exception:  # noqa: BLE001 — cleanup is best-effort
                pass
            raise UpstreamError(f"insert data_quality_report_field failed: {exc}") from exc

    return ReportSubmissionResponse(
        report_id=report_id,
        reference=_reference(report_id),
        status=row.get("status", "new"),
    )


def _reference(report_id: str) -> str:
    """Short, human-quotable code derived from the report UUID (stable, no PII)."""
    return report_id.replace("-", "")[:6].upper()
