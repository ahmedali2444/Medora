"""Message classification endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends

from app.dependencies import enforce_rate_limit, get_container, get_current_identity
from app.schemas.chat import ClassifyRequest, ClassifyResponse
from app.security.auth import Identity
from app.security.sanitization import sanitize_message
from app.services.container import ServiceContainer
from app.settings import ApiSettings, get_settings

router = APIRouter(tags=["ai"])


@router.post("/classify", response_model=ClassifyResponse)
def classify(
    payload: ClassifyRequest,
    identity: Identity = Depends(enforce_rate_limit),
    container: ServiceContainer = Depends(get_container),
    settings: ApiSettings = Depends(get_settings),
) -> ClassifyResponse:
    message = sanitize_message(payload.message, max_length=settings.max_message_length)
    result = container.classifier.classify(message)
    return ClassifyResponse(
        classification=result.category,
        confidence=round(result.confidence, 2),
        matched=result.matched,
    )
