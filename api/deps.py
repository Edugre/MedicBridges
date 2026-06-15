"""Shared dependencies: Supabase clients and the admin auth guard.

Public read routes use the anon key (RLS grants public SELECT on the curated
tables/views). Admin routes use the service-role key because operational tables
(etl_run, geocode_queue) are service-role only.
"""

from __future__ import annotations

import hmac
from functools import lru_cache

from fastapi import Depends, Header

# Reuse the ETL loader that imports the real `supabase` pip package despite the
# repo's `supabase/` migrations folder shadowing the module name.
from scripts._supabase_py import Client, create_client

from api.config import Settings, get_settings
from api.errors import APIError, UnauthorizedError


class ConfigurationError(APIError):
    status_code = 500
    error_code = "server_misconfigured"


@lru_cache(maxsize=1)
def get_anon_client() -> Client:
    settings = get_settings()
    if not settings.base_url or not settings.supabase_anon_key:
        raise ConfigurationError("SUPABASE_URL and SUPABASE_ANON_KEY must be set")
    return create_client(settings.base_url, settings.supabase_anon_key)


@lru_cache(maxsize=1)
def get_service_client() -> Client:
    settings = get_settings()
    if not settings.base_url or not settings.supabase_service_role_key:
        raise ConfigurationError(
            "SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set for admin routes"
        )
    return create_client(settings.base_url, settings.supabase_service_role_key)


def require_admin(
    x_admin_key: str | None = Header(default=None, alias="X-Admin-Key"),
    settings: Settings = Depends(get_settings),
) -> Client:
    """Validate the admin key (constant-time) and hand back a service-role client."""
    expected = settings.admin_api_key
    if not expected:
        raise ConfigurationError("ADMIN_API_KEY is not configured")
    if not x_admin_key or not hmac.compare_digest(x_admin_key, expected):
        raise UnauthorizedError("Valid X-Admin-Key header required")
    return get_service_client()
