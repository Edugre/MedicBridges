"""Typed API exceptions and the structured error envelope.

Every client-facing failure maps to a stable `{ "error": ..., ... }` body. Empty
or partial data is never an error (see routers); only genuine failures raise here.
"""

from __future__ import annotations

from typing import Any


class APIError(Exception):
    """Base class for errors that serialize to the standard envelope."""

    status_code: int = 500
    error_code: str = "internal_error"

    def __init__(self, detail: str | None = None, **extra: Any) -> None:
        self.detail = detail
        self.extra = extra
        super().__init__(detail or self.error_code)

    def to_body(self) -> dict[str, Any]:
        body: dict[str, Any] = {"error": self.error_code}
        if self.detail:
            body["detail"] = self.detail
        body.update(self.extra)
        return body


class InvalidCoordinatesError(APIError):
    status_code = 422
    error_code = "invalid_coordinates"


class RadiusExceedsMaxError(APIError):
    status_code = 422
    error_code = "radius_exceeds_max"


class InvalidCursorError(APIError):
    status_code = 400
    error_code = "invalid_cursor"


class UnauthorizedError(APIError):
    status_code = 401
    error_code = "unauthorized"


class NotFoundError(APIError):
    status_code = 404
    error_code = "not_found"


class UpstreamError(APIError):
    """A downstream dependency (Supabase/PostgREST) failed unexpectedly."""

    status_code = 502
    error_code = "upstream_error"


class CaptchaFailedError(APIError):
    """The captcha token was missing, expired, or rejected by the provider."""

    status_code = 403
    error_code = "captcha_failed"
