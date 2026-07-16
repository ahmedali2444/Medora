"""Pydantic request/response models for the public API."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


Role = Literal["patient", "guest", "doctor", "pharmacy", "admin"]


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    user_id: str | None = Field(default=None, max_length=128)
    role: Role = "guest"
    conversation_id: str | None = Field(default=None, max_length=128)
    attached_image: str | None = Field(default=None, description="Base64 image data URL")

    model_config = {
        "json_schema_extra": {
            "example": {
                "message": "عندي صداع وسخونية من امبارح",
                "user_id": None,
                "role": "guest",
                "conversation_id": None,
            }
        }
    }


class ChatResponse(BaseModel):
    response: str
    conversation_id: str
    metadata: dict = Field(default_factory=dict)


class ClassifyRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)


class ClassifyResponse(BaseModel):
    classification: Literal["medical", "medora_platform", "non_medical"]
    confidence: float
    matched: dict[str, list[str]] = Field(default_factory=dict)


class OcrMedicineRequest(BaseModel):
    image: str = Field(..., min_length=1, description="Base64 image data URL")


class OcrMedicineResponse(BaseModel):
    query: str
    recognized: bool


class HealthResponse(BaseModel):
    status: str = "healthy"
    model_available: bool = False


class ConversationMessage(BaseModel):
    role: str
    content: str


class ConversationResponse(BaseModel):
    conversation_id: str
    title: str
    created_at: str
    updated_at: str
    messages: list[ConversationMessage]
