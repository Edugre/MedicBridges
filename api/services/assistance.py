"""Facilities linked to published financial assistance programs.

Reads only `v_facility_assistance_public` (security_invoker, so RLS limits it
to publishable links). The facilities have no coordinates, so they are matched
by ZIP or city instead of a radius and are never ranked by distance.
"""

from __future__ import annotations

from typing import Any

from scripts._supabase_py import Client

from api.errors import UpstreamError
from api.schemas.resources import AssistanceFacilityOut

VIEW = "v_facility_assistance_public"

# Patient-facing columns only: eligibility percentages and rules stay out.
_COLUMNS = (
    "facility_id,facility_name,category,address,city,state,zip,phone,"
    "program_id,program_name,public_copy,application_url,policy_url,"
    "policy_revised,last_checked"
)


def _zip5(value: Any) -> str | None:
    digits = str(value or "").strip()[:5]
    return digits if len(digits) == 5 and digits.isdigit() else None


def _city(value: Any) -> str | None:
    return " ".join(str(value or "").split()).lower() or None


def _matches(row: dict[str, Any], zip_code: str | None, city: str | None) -> bool:
    if zip_code and _zip5(row.get("zip")) == zip_code:
        return True
    return bool(city) and _city(row.get("city")) == city


def list_assistance_facilities(
    client: Client, *, zip_code: str | None = None, city: str | None = None
) -> list[AssistanceFacilityOut]:
    wanted_zip = _zip5(zip_code)
    wanted_city = _city(city)
    if not wanted_zip and not wanted_city:
        return []
    try:
        resp = client.table(VIEW).select(_COLUMNS).execute()
    except Exception as exc:  # supabase/postgrest client errors
        raise UpstreamError(f"select {VIEW} failed: {exc}") from exc

    # The view is small (one health system), so ZIP / city normalization
    # (ZIP+4, casing, spacing) is done here rather than in PostgREST filters.
    out = [
        AssistanceFacilityOut(
            facility_id=row["facility_id"],
            name=row["facility_name"],
            category=row.get("category"),
            address=row.get("address"),
            city=row.get("city"),
            state=(row.get("state") or "").strip() or None,
            zip=row.get("zip"),
            phone=row.get("phone"),
            program_id=row["program_id"],
            program_name=row["program_name"],
            public_copy=row.get("public_copy"),
            application_url=row.get("application_url"),
            policy_url=row.get("policy_url"),
            policy_revised=str(row["policy_revised"]) if row.get("policy_revised") else None,
            last_checked=str(row["last_checked"]) if row.get("last_checked") else None,
        )
        for row in (resp.data or [])
        if _matches(row, wanted_zip, wanted_city)
    ]
    return sorted(out, key=lambda f: (f.name.lower(), f.program_name.lower()))
