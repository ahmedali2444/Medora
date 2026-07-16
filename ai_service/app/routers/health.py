"""Health/readiness endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import get_container
from app.schemas.chat import HealthResponse
from app.services.container import ServiceContainer

router = APIRouter(tags=["system"])


@router.get("/health", response_model=HealthResponse)
def health(container: ServiceContainer = Depends(get_container)) -> HealthResponse:
    return HealthResponse(status="healthy", model_available=container.model_available)
