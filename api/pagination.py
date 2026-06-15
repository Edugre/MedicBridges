"""Opaque keyset cursor encoding for proximity pagination.

The cursor carries the last page's `(distance_m, org_id)` so the next page can
resume with a stable keyset on the same ordering used by `search_orgs_nearby`.
"""

from __future__ import annotations

import base64
import binascii
import json
from typing import NamedTuple

from api.errors import InvalidCursorError


class OrgCursor(NamedTuple):
    distance_m: float
    org_id: str


def encode_cursor(distance_m: float, org_id: str) -> str:
    payload = json.dumps({"d": distance_m, "o": org_id}, separators=(",", ":"))
    return base64.urlsafe_b64encode(payload.encode("utf-8")).decode("ascii")


def decode_cursor(cursor: str) -> OrgCursor:
    try:
        raw = base64.urlsafe_b64decode(cursor.encode("ascii"))
        data = json.loads(raw)
        return OrgCursor(distance_m=float(data["d"]), org_id=str(data["o"]))
    except (binascii.Error, ValueError, KeyError, TypeError) as exc:
        raise InvalidCursorError("Cursor is malformed or expired") from exc
