"""Cloudflare Turnstile verification for the public report endpoint.

If no secret is configured (local dev), verification is skipped so the flow
still works without keys. In any deployment where the endpoint is publicly
reachable, set TURNSTILE_SECRET_KEY and captcha becomes mandatory.
"""

from __future__ import annotations

import httpx

from api.errors import CaptchaFailedError

_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"
_TIMEOUT = 5.0


def verify_captcha(secret: str, token: str | None, remote_ip: str | None = None) -> None:
    """Raise CaptchaFailedError unless the token passes (or captcha is disabled).

    A blank `secret` means captcha is disabled — no-op. Otherwise a missing or
    rejected token raises.
    """
    if not secret:
        return  # captcha disabled (dev / unconfigured)

    if not token or not token.strip():
        raise CaptchaFailedError("Captcha response is required")

    payload = {"secret": secret, "response": token.strip()}
    if remote_ip:
        payload["remoteip"] = remote_ip

    try:
        resp = httpx.post(_VERIFY_URL, data=payload, timeout=_TIMEOUT)
        resp.raise_for_status()
        result = resp.json()
    except Exception as exc:  # noqa: BLE001 — any transport/parse failure = can't verify
        # Fail closed: if we can't reach the verifier we do not accept the write.
        raise CaptchaFailedError("Could not verify captcha, please try again") from exc

    if not result.get("success"):
        codes = result.get("error-codes") or []
        raise CaptchaFailedError("Captcha verification failed", error_codes=codes)
