"""Optional backend session validation for revoked JWT sessions."""

from __future__ import annotations

import logging

import httpx

from app.exceptions import AuthenticationError
from app.settings import ApiSettings


LOGGER = logging.getLogger("ai_service.session")


def ensure_active_session(*, authorization_header: str | None, settings: ApiSettings) -> None:
    if not settings.session_check_enabled:
        return

    if not settings.backend_base_url:
        LOGGER.warning("Session check enabled but MEDORA_BACKEND_URL is not configured.")
        if settings.session_check_strict:
            raise AuthenticationError("Session validation is not configured.")
        return

    if not (authorization_header and authorization_header.lower().startswith("bearer ")):
        return

    url = f"{settings.backend_base_url.rstrip('/')}/api/account/session/validate"
    try:
        with httpx.Client(timeout=settings.session_check_timeout_seconds) as client:
            response = client.get(url, headers={"Authorization": authorization_header})
    except httpx.HTTPError as exc:
        LOGGER.warning("Session validation unavailable: %s", exc)
        if settings.session_check_strict:
            raise AuthenticationError("Session validation failed.") from exc
        return

    if response.status_code == 401:
        raise AuthenticationError("Session expired or revoked.")
    if response.status_code >= 400:
        LOGGER.warning("Session validation returned %s", response.status_code)
        if settings.session_check_strict:
            raise AuthenticationError("Session validation failed.")
        return
    return
