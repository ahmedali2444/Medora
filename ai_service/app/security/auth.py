"""Authentication for the AI service.

Logged-in users present the same HS256 JWT issued by the main Medora (.NET)
backend; it is validated locally using the shared secret, so the AI service does
not need a round-trip to the backend on every request. Guests get a temporary,
unauthenticated identity with a generated conversation namespace.

The HS256 signature check is implemented with the standard library (hmac /
hashlib) to avoid an extra dependency for one well-defined token format.
"""

from __future__ import annotations

import base64
import hashlib
import hmac
import json
import logging
import time
from dataclasses import dataclass
from uuid import uuid4

from app.exceptions import AuthenticationError
from app.settings import ApiSettings


LOGGER = logging.getLogger("ai_service.auth")


_ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
_NAMEID_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"

VALID_ROLES = {"guest", "patient", "admin", "doctor", "pharmacy"}


@dataclass(frozen=True)
class Identity:
    """Authenticated principal (or guest) making a request."""

    user_id: str | None
    role: str
    is_guest: bool
    token_id: str | None = None

    @property
    def rate_limit_key(self) -> str:
        if self.user_id:
            return f"user:{self.user_id}"
        return "guest"


def _b64url_decode(segment: str) -> bytes:
    padded = segment + "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(padded.encode("ascii"))


def _normalize_role(raw: object) -> str | None:
    """Roles may arrive as a string or a list of claim values."""
    if isinstance(raw, list):
        raw = raw[0] if raw else None
    if not isinstance(raw, str):
        return None
    role = raw.strip().lower()
    return role if role in VALID_ROLES else None


class JwtValidator:
    """Verifies HS256 tokens against the shared backend secret."""

    def __init__(self, settings: ApiSettings) -> None:
        self._settings = settings

    @property
    def enabled(self) -> bool:
        return bool(self._settings.jwt_secret)

    def decode(self, token: str) -> dict:
        if self._settings.jwt_algorithm.upper() != "HS256":
            raise AuthenticationError("Unsupported token algorithm.")
        if not self.enabled:
            raise AuthenticationError("Token validation is not configured.")

        try:
            header_b64, payload_b64, signature_b64 = token.split(".")
        except ValueError as exc:
            raise AuthenticationError("Malformed token.") from exc

        try:
            header = json.loads(_b64url_decode(header_b64))
        except Exception as exc:
            raise AuthenticationError("Malformed token header.") from exc

        if str(header.get("alg", "")).upper() != self._settings.jwt_algorithm.upper():
            raise AuthenticationError("Invalid token algorithm.")

        signing_input = f"{header_b64}.{payload_b64}".encode("ascii")
        expected_sig = hmac.new(
            self._settings.jwt_secret.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()

        try:
            provided_sig = _b64url_decode(signature_b64)
        except Exception as exc:
            raise AuthenticationError("Malformed token signature.") from exc

        if not hmac.compare_digest(expected_sig, provided_sig):
            raise AuthenticationError("Invalid token signature.")

        try:
            claims = json.loads(_b64url_decode(payload_b64))
        except Exception as exc:
            raise AuthenticationError("Malformed token payload.") from exc

        self._validate_claims(claims)
        return claims

    def _validate_claims(self, claims: dict) -> None:
        now = int(time.time())
        exp = claims.get("exp")
        if not isinstance(exp, (int, float)):
            raise AuthenticationError("Token expiration is missing.")
        if now >= int(exp):
            raise AuthenticationError("Token has expired.")
        nbf = claims.get("nbf")
        if isinstance(nbf, (int, float)) and now < int(nbf):
            raise AuthenticationError("Token is not yet valid.")
        if self._settings.jwt_issuer and claims.get("iss") != self._settings.jwt_issuer:
            raise AuthenticationError("Invalid token issuer.")
        if self._settings.jwt_audience:
            aud = claims.get("aud")
            audiences = aud if isinstance(aud, list) else [aud]
            if self._settings.jwt_audience not in audiences:
                raise AuthenticationError("Invalid token audience.")

    def identity_from_token(self, token: str) -> Identity:
        claims = self.decode(token)

        user_id = claims.get("sub") or claims.get(_NAMEID_CLAIM) or claims.get("nameid")
        if not user_id:
            raise AuthenticationError("Invalid token subject.")
        token_id = claims.get("jti")
        if not token_id:
            raise AuthenticationError("Invalid session token.")
        role = _normalize_role(claims.get(_ROLE_CLAIM)) or _normalize_role(claims.get("role"))
        if not role:
            raise AuthenticationError("Invalid token role.")
        return Identity(
            user_id=str(user_id) if user_id else None,
            role=role,
            is_guest=False,
            token_id=str(token_id),
        )


def new_guest_conversation_id() -> str:
    return f"guest-{uuid4().hex}"


def resolve_identity(
    authorization_header: str | None,
    requested_role: str | None,
    validator: JwtValidator,
    settings: ApiSettings,
) -> Identity:
    """Resolve the caller's identity from the Authorization header.

    A valid Bearer token yields an authenticated Identity; otherwise the caller
    is treated as a guest (unless auth is required, in which case it raises).
    """
    token = None
    if authorization_header and authorization_header.lower().startswith("bearer "):
        token = authorization_header[7:].strip()

    if token:
        if validator.enabled:
            return validator.identity_from_token(token)
        raise AuthenticationError("Token validation is not configured.")

    if settings.require_auth:
        raise AuthenticationError()

    role = "guest"
    if requested_role and requested_role.strip().lower() == "guest":
        role = "guest"
    return Identity(user_id=None, role=role, is_guest=True)
