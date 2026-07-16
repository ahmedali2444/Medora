"""Domain-level exceptions and FastAPI exception handlers.

All errors are converted into a consistent JSON envelope. User-facing failures
(AI down, timeouts, internal errors) return the localized fallback message the
product expects, so the frontend can show it verbatim.
"""

from __future__ import annotations

import logging

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException


LOGGER = logging.getLogger("ai_service.errors")

# The exact user-facing fallback message required by the product spec.
SERVICE_UNAVAILABLE_MESSAGE = (
    "عذرًا، المساعد الذكي غير متاح حاليًا. حاول مرة أخرى لاحقًا."
)


class AIServiceError(Exception):
    """Base class for AI service errors that map to the fallback message."""

    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    error_code = "ai_unavailable"


class ModelUnavailableError(AIServiceError):
    """Raised when the upstream model is not configured or unreachable."""


class ModelTimeoutError(AIServiceError):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    error_code = "ai_timeout"


class AuthenticationError(Exception):
    """Raised when a required token is missing or invalid."""

    def __init__(self, message: str = "Invalid or missing authentication token.") -> None:
        super().__init__(message)
        self.message = message


class RateLimitExceeded(Exception):
    def __init__(self, retry_after: int) -> None:
        super().__init__("Rate limit exceeded.")
        self.retry_after = retry_after


def _envelope(message: str, error_code: str, extra: dict | None = None) -> dict:
    body = {"detail": message, "error_code": error_code}
    if extra:
        body.update(extra)
    return body


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(AIServiceError)
    async def _handle_ai_error(_: Request, exc: AIServiceError) -> JSONResponse:
        LOGGER.error("AI service error: %s", exc, exc_info=exc)
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(SERVICE_UNAVAILABLE_MESSAGE, exc.error_code),
        )

    @app.exception_handler(AuthenticationError)
    async def _handle_auth_error(_: Request, exc: AuthenticationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content=_envelope(exc.message, "unauthorized"),
        )

    @app.exception_handler(RateLimitExceeded)
    async def _handle_rate_limit(_: Request, exc: RateLimitExceeded) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            content=_envelope("Too many requests. Please slow down.", "rate_limited"),
            headers={"Retry-After": str(exc.retry_after)},
        )

    @app.exception_handler(RequestValidationError)
    async def _handle_validation(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content=_envelope("Invalid request payload.", "invalid_request"),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _handle_http(_: Request, exc: StarletteHTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=_envelope(str(exc.detail), "http_error"),
        )

    @app.exception_handler(Exception)
    async def _handle_unexpected(_: Request, exc: Exception) -> JSONResponse:
        LOGGER.exception("Unhandled exception: %s", exc)
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=_envelope(SERVICE_UNAVAILABLE_MESSAGE, "internal_error"),
        )
