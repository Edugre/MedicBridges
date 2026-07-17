"""Public data-quality reporting: the "Report an issue" submit endpoint.

Anonymous (no account, no admin key). Writes go through the service-role client
because the target tables are RLS-enabled with no anon policy. A Cloudflare
Turnstile captcha guards the endpoint against automated spam (enforced only when
TURNSTILE_SECRET_KEY is configured).
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, Request

from scripts._supabase_py import Client

from api.config import Settings, get_settings
from api.deps import get_service_client
from api.schemas.reports import ReportSubmission, ReportSubmissionResponse
from api.services import captcha, reports

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


def _client_ip(request: Request) -> str | None:
    """Best-effort client IP: first X-Forwarded-For hop, else the socket peer."""
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("", status_code=201, response_model=ReportSubmissionResponse)
def submit_report(
    payload: ReportSubmission,
    request: Request,
    client: Client = Depends(get_service_client),
    settings: Settings = Depends(get_settings),
) -> ReportSubmissionResponse:
    captcha.verify_captcha(
        settings.turnstile_secret_key,
        payload.captcha_token,
        _client_ip(request),
    )
    return reports.submit_report(client, payload)
