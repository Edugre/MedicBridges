"""Shared address normalization used by ETL and 340B address matching."""

from __future__ import annotations

import re


def address_match_key(address: str | None, zip_code: str | None) -> str | None:
    """Return 'street_number:zip5' or None. Mirrors public.address_match_key() in Postgres."""
    if not address or not zip_code:
        return None
    zip5 = str(zip_code).strip()[:5]
    if len(zip5) < 5:
        return None
    cleaned = re.sub(r"[^a-z0-9 ]", " ", str(address).lower())
    match = re.match(r"\s*(\d+)\s", cleaned)
    if not match:
        return None
    return f"{match.group(1)}:{zip5}"
