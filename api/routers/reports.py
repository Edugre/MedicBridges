"""Public data-quality reporting: the "Report an issue" submit endpoint.

Anonymous (no account, no admin key). Writes go through the service-role client
because the target tables are RLS-enabled with no anon policy.
"""

from __future__ import annotations

from fastapi import APIRouter, Depends

from scripts._supabase_py import Client

from api.deps import get_service_client
from api.schemas.reports import ReportSubmission, ReportSubmissionResponse
from api.services import reports

router = APIRouter(prefix="/api/v1/reports", tags=["reports"])


@router.post("", status_code=201, response_model=ReportSubmissionResponse)
def submit_report(
    payload: ReportSubmission,
    client: Client = Depends(get_service_client),
) -> ReportSubmissionResponse:
    return reports.submit_report(client, payload)
