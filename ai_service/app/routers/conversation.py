"""Conversation history retrieval endpoint."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.dependencies import enforce_rate_limit, get_container, get_current_identity
from app.schemas.chat import ConversationMessage, ConversationResponse
from app.security.auth import Identity
from app.services.container import ServiceContainer

router = APIRouter(tags=["ai"])


@router.get("/conversation/{conversation_id}", response_model=ConversationResponse)
def get_conversation(
    conversation_id: str,
    identity: Identity = Depends(enforce_rate_limit),
    container: ServiceContainer = Depends(get_container),
) -> ConversationResponse:
    chat = container.chat_store.get_chat(conversation_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    owner = chat.get("owner")
    caller_owner = (
        f"user:{identity.user_id}" if identity.user_id
        else f"guest:{conversation_id}" if identity.is_guest
        else None
    )
    if not owner or owner != caller_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    return ConversationResponse(
        conversation_id=chat["id"],
        title=chat.get("title", "New Chat"),
        created_at=chat.get("created_at", ""),
        updated_at=chat.get("updated_at", ""),
        messages=[
            ConversationMessage(role=str(m.get("role", "user")), content=str(m.get("content", "")))
            for m in chat.get("messages", [])
            if str(m.get("content", "")).strip()
        ],
    )


@router.delete("/conversation/{conversation_id}")
def delete_conversation(
    conversation_id: str,
    identity: Identity = Depends(enforce_rate_limit),
    container: ServiceContainer = Depends(get_container),
) -> dict[str, str]:
    chat = container.chat_store.get_chat(conversation_id)
    if not chat:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found.")

    owner = chat.get("owner")
    caller_owner = (
        f"user:{identity.user_id}" if identity.user_id
        else f"guest:{conversation_id}" if identity.is_guest
        else None
    )
    if not owner or owner != caller_owner:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")

    container.chat_store.delete_chat(conversation_id)
    return {"message": "Conversation deleted successfully."}
