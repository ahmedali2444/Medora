"""FastAPI application entry point for the Medora AI microservice.

Run locally:
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

The whole AI/medical pipeline lives behind this HTTP boundary; the Medora
frontend and main backend integrate only via these REST endpoints.
"""

from __future__ import annotations

import logging
import time
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from app.exceptions import register_exception_handlers
from app.logging_config import configure_logging
from app.routers import chat, classify, conversation, health, ocr
from app.security.auth import JwtValidator
from app.security.rate_limit import RateLimiter
from app.services.container import ServiceContainer
from app.services.orchestrator import ChatOrchestrator
from app.settings import get_settings


LOGGER = logging.getLogger("ai_service")


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    configure_logging(settings.log_level)
    LOGGER.info("Starting Medora AI service (env=%s)", settings.environment)

    container = ServiceContainer()
    app.state.settings = settings
    app.state.container = container
    app.state.orchestrator = ChatOrchestrator(container)
    app.state.rate_limiter = RateLimiter(settings)
    app.state.jwt_validator = JwtValidator(settings)

    if not app.state.jwt_validator.enabled:
        LOGGER.warning("JWT_SECRET not set: tokens cannot be validated; callers treated as guests.")

    yield
    LOGGER.info("Shutting down Medora AI service")


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="Medora AI Service",
        description="Medical & platform AI assistant microservice for Medora.",
        version="1.0.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "DELETE", "OPTIONS"],
        allow_headers=[
            "Content-Type",
            "Authorization",
            "Accept",
            "X-Requested-With",
            "Origin",
            "X-User-Role",
            "X-Request-ID",
        ],
    )

    @app.middleware("http")
    async def add_request_context(request: Request, call_next):
        request_id = request.headers.get("X-Request-ID", uuid.uuid4().hex[:12])
        started = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - started) * 1000
        response.headers["X-Request-ID"] = request_id
        LOGGER.info(
            "%s %s -> %s (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
            extra={"request_id": request_id},
        )
        return response

    register_exception_handlers(app)

    app.include_router(health.router)
    app.include_router(chat.router)
    app.include_router(classify.router)
    app.include_router(conversation.router)
    app.include_router(ocr.router)
    return app


app = create_app()
