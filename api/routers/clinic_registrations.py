"""Public "Register Your Clinic" submit endpoint.

Anonymous, captcha-guarded (when TURNSTILE_SECRET_KEY is set). The row is
written with the service-role client; the team notification email is sent in
the background after the response so a slow mail provider never delays users.
"""

from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, Request

from scripts._supabase_py import Client

from api.config import Settings, get_settings
from api.deps import get_service_client
from api.routers.reports import _client_ip
from api.schemas.clinic_registrations import (
    ClinicRegistrationResponse,
    ClinicRegistrationSubmission,
)
from api.services import captcha, clinic_registrations

router = APIRouter(prefix="/api/v1/clinic-registrations", tags=["clinic-registrations"])


@router.post("", status_code=201, response_model=ClinicRegistrationResponse)
def submit_clinic_registration(
    payload: ClinicRegistrationSubmission,
    request: Request,
    background: BackgroundTasks,
    client: Client = Depends(get_service_client),
    settings: Settings = Depends(get_settings),
) -> ClinicRegistrationResponse:
    captcha.verify_captcha(
        settings.turnstile_secret_key,
        payload.captcha_token,
        _client_ip(request),
    )
    response, row = clinic_registrations.submit_registration(client, payload)
    background.add_task(
        clinic_registrations.send_notification, settings, row, response.reference
    )
    return response
