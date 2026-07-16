"""Main chat endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import enforce_rate_limit, get_orchestrator
from app.schemas.chat import ChatRequest, ChatResponse
from app.security.auth import Identity
from app.security.sanitization import sanitize_message, validate_attached_image
from app.services.orchestrator import ChatOrchestrator, ConversationAccessDenied
from app.settings import ApiSettings, get_settings

router = APIRouter(tags=["ai"])


@router.post("/chat", response_model=ChatResponse)
def chat(
    payload: ChatRequest,
    identity: Identity = Depends(enforce_rate_limit),
    orchestrator: ChatOrchestrator = Depends(get_orchestrator),
    settings: ApiSettings = Depends(get_settings),
) -> ChatResponse:
    try:
        message = sanitize_message(payload.message, max_length=settings.max_message_length)
        image = validate_attached_image(payload.attached_image, max_bytes=settings.max_image_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    try:
        result = orchestrator.handle_chat(
            message=message,
            identity=identity,
            conversation_id=payload.conversation_id,
            attached_image=image,
        )
    except ConversationAccessDenied as exc:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(exc)) from exc

    return ChatResponse(
        response=result.response,
        conversation_id=result.conversation_id,
        metadata=result.metadata,
    )
