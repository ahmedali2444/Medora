"""FastAPI dependency providers (DI wiring)."""

from __future__ import annotations

from fastapi import Depends, Header, Request

from app.security.auth import Identity, JwtValidator, resolve_identity
from app.security.rate_limit import RateLimiter
from app.security.session_check import ensure_active_session
from app.services.container import ServiceContainer
from app.services.orchestrator import ChatOrchestrator
from app.settings import ApiSettings, get_settings


def get_container(request: Request) -> ServiceContainer:
    return request.app.state.container


def get_orchestrator(request: Request) -> ChatOrchestrator:
    return request.app.state.orchestrator


def get_rate_limiter(request: Request) -> RateLimiter:
    return request.app.state.rate_limiter


def get_jwt_validator(request: Request) -> JwtValidator:
    return request.app.state.jwt_validator


def get_current_identity(
    request: Request,
    authorization: str | None = Header(default=None),
    x_user_role: str | None = Header(default=None),
    settings: ApiSettings = Depends(get_settings),
    validator: JwtValidator = Depends(get_jwt_validator),
) -> Identity:
    identity = resolve_identity(
        authorization_header=authorization,
        requested_role=x_user_role,
        validator=validator,
        settings=settings,
    )
    if not identity.is_guest:
        ensure_active_session(authorization_header=authorization, settings=settings)
    return identity


def enforce_rate_limit(
    request: Request,
    identity: Identity = Depends(get_current_identity),
    limiter: RateLimiter = Depends(get_rate_limiter),
) -> Identity:
    client_ip = request.client.host if request.client else "unknown"
    key = f"{identity.rate_limit_key}:{client_ip}"
    limiter.check(key)
    return identity
