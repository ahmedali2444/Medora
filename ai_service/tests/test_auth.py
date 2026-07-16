import base64
import hashlib
import hmac
import json
import time

import pytest

from app.exceptions import AuthenticationError
from app.security.auth import JwtValidator
from app.settings import ApiSettings


ROLE_CLAIM = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"


def _b64url(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _token(claims: dict, *, secret: str = "test-secret", alg: str = "HS256") -> str:
    header = _b64url(json.dumps({"typ": "JWT", "alg": alg}).encode("utf-8"))
    payload = _b64url(json.dumps(claims).encode("utf-8"))
    signing_input = f"{header}.{payload}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    return f"{header}.{payload}.{_b64url(signature)}"


def _validator() -> JwtValidator:
    return JwtValidator(
        ApiSettings(
            jwt_secret="test-secret",
            jwt_issuer="medora",
            jwt_audience="medora-client",
            require_auth=True,
        )
    )


def _claims(**overrides):
    claims = {
        "sub": "user-1",
        "jti": "session-1",
        "iss": "medora",
        "aud": "medora-client",
        "exp": int(time.time()) + 120,
        ROLE_CLAIM: "patient",
    }
    claims.update(overrides)
    return claims


def test_valid_backend_token_resolves_identity():
    identity = _validator().identity_from_token(_token(_claims()))

    assert identity.user_id == "user-1"
    assert identity.token_id == "session-1"
    assert identity.role == "patient"
    assert identity.is_guest is False


def test_token_without_expiration_is_rejected():
    claims = _claims()
    claims.pop("exp")

    with pytest.raises(AuthenticationError):
        _validator().identity_from_token(_token(claims))


def test_token_without_session_id_is_rejected():
    claims = _claims()
    claims.pop("jti")

    with pytest.raises(AuthenticationError):
        _validator().identity_from_token(_token(claims))
