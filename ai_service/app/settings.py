"""Application settings for the FastAPI layer.

Configuration is read from environment variables (loaded from a local ``.env``
file when present) so the service is twelve-factor / Docker friendly.
"""

from __future__ import annotations

import os
from dataclasses import dataclass, field
from functools import lru_cache

from dotenv import load_dotenv


load_dotenv()


def _get_bool(name: str, default: bool) -> bool:
    raw = os.getenv(name)
    if raw is None:
        return default
    return raw.strip().lower() in frozenset({"1", "on", "true", "yes"})


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default


def _get_list(name: str, default: list[str]) -> list[str]:
    raw = os.getenv(name)
    if not raw:
        return default
    return [item.strip() for item in raw.split(",") if item.strip()]


def _default_require_auth() -> bool:
    env = os.getenv("AI_ENV", "development").lower()
    jwt_secret = os.getenv("JWT_SECRET", "").strip()
    return env in frozenset({"production", "prod"}) or bool(jwt_secret)


@dataclass(frozen=True)
class ApiSettings:
    """Transport-level configuration for the FastAPI service."""

    environment: str = field(default_factory=lambda: os.getenv("AI_ENV", "development"))
    log_level: str = field(default_factory=lambda: os.getenv("LOG_LEVEL", "INFO").upper())

    cors_origins: list[str] = field(
        default_factory=lambda: _get_list(
            "AI_CORS_ORIGINS",
            ["http://localhost", "capacitor://localhost", "http://localhost:5173", "http://localhost:3000"],
        )
    )

    jwt_secret: str = field(default_factory=lambda: os.getenv("JWT_SECRET", "").strip())
    jwt_issuer: str = field(default_factory=lambda: os.getenv("JWT_ISSUER", "").strip())
    jwt_audience: str = field(default_factory=lambda: os.getenv("JWT_AUDIENCE", "").strip())
    jwt_algorithm: str = field(default_factory=lambda: os.getenv("JWT_ALGORITHM", "HS256").strip())

    require_auth: bool = field(default_factory=lambda: _get_bool("AI_REQUIRE_AUTH", _default_require_auth()))

    max_message_length: int = field(default_factory=lambda: _get_int("AI_MAX_MESSAGE_LENGTH", 4000))
    max_image_bytes: int = field(default_factory=lambda: _get_int("AI_MAX_IMAGE_BYTES", 5000000))

    rate_limit_enabled: bool = field(default_factory=lambda: _get_bool("AI_RATE_LIMIT_ENABLED", True))
    rate_limit_requests: int = field(default_factory=lambda: _get_int("AI_RATE_LIMIT_REQUESTS", 30))
    rate_limit_window_seconds: int = field(
        default_factory=lambda: _get_int("AI_RATE_LIMIT_WINDOW_SECONDS", 60)
    )

    # Optional revoked-session validation against the main backend. Disabled by
    # default; enabling it requires MEDORA_BACKEND_URL to be set.
    backend_base_url: str = field(default_factory=lambda: os.getenv("MEDORA_BACKEND_URL", "").strip())
    session_check_enabled: bool = field(
        default_factory=lambda: _get_bool("AI_SESSION_CHECK_ENABLED", False)
    )
    session_check_strict: bool = field(
        default_factory=lambda: _get_bool("AI_SESSION_CHECK_STRICT", False)
    )
    session_check_timeout_seconds: int = field(
        default_factory=lambda: _get_int("AI_SESSION_CHECK_TIMEOUT_SECONDS", 3)
    )

    @property
    def is_production(self) -> bool:
        return self.environment.lower() in frozenset({"production", "prod"})


@lru_cache
def get_settings() -> ApiSettings:
    return ApiSettings()
