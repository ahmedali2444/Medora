from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import uuid4

from app.security.auth import Identity, new_guest_conversation_id
from app.services.container import ServiceContainer
from src.classifier import MEDICAL, MEDORA_PLATFORM, NON_MEDICAL
from src.data_loader import normalize_text


LOGGER = logging.getLogger("ai_service.orchestrator")

AR_SCOPE_MESSAGE = (
    "أنا مساعد Medora الطبي، ومهمتي المساعدة فقط في الأسئلة الطبية والصحية "
    "أو استخدام المنصة. من فضلك اسألني عن موضوع متعلق بالصحة أو Medora."
)
EN_SCOPE_MESSAGE = (
    "I am Medora's medical assistant. I can only help with medical, "
    "health-related, or Medora platform questions."
)


class ConversationAccessDenied(Exception):
    pass


@dataclass(frozen=True)
class ChatResult:
    response: str
    conversation_id: str
    metadata: dict


class ChatOrchestrator:
    def __init__(self, container: ServiceContainer) -> None:
        self.container = container

    def handle_chat(
        self,
        *,
        message: str,
        identity: Identity,
        conversation_id: str | None,
        attached_image: str | None = None,
    ) -> ChatResult:
        conversation_id = self._resolve_conversation_id(conversation_id, identity)
        owner = self._owner_for(identity, conversation_id)
        chat = self._get_or_create_chat(conversation_id, owner, message)

        if chat.get("owner") and chat["owner"] != owner:
            raise ConversationAccessDenied("Conversation does not belong to this caller.")
        if not chat.get("owner"):
            chat["owner"] = owner

        image_text = self._extract_image_text(attached_image)
        effective_message = self._message_with_image_text(message, image_text)
        classification = self.container.classifier.classify(effective_message)

        LOGGER.info(
            "Classified message",
            extra={
                "conversation_id": conversation_id,
                "user_id": identity.user_id,
                "role": identity.role,
                "classification": classification.category,
            },
        )

        chat["messages"].append({"role": "user", "content": effective_message})

        if classification.category == NON_MEDICAL:
            response = self._scope_message(effective_message)
            source = "scope_block"
        elif classification.category == MEDORA_PLATFORM:
            response, source = self._answer_platform_question(effective_message, chat)
        else:
            response, source = self._answer_medical_question(effective_message, chat)

        chat["messages"].append({"role": "assistant", "content": response})
        chat["updated_at"] = _utc_now()
        self.container.chat_store.save_chat(chat)

        return ChatResult(
            response=response,
            conversation_id=conversation_id,
            metadata={
                "classification": classification.category,
                "classification_confidence": round(classification.confidence, 2),
                "source": source,
                "image_text_extracted": bool(image_text),
            },
        )

    def _resolve_conversation_id(self, conversation_id: str | None, identity: Identity) -> str:
        value = (conversation_id or "").strip()
        if value:
            return value
        if identity.is_guest:
            return new_guest_conversation_id()
        return uuid4().hex

    @staticmethod
    def _owner_for(identity: Identity, conversation_id: str) -> str:
        if identity.user_id:
            return f"user:{identity.user_id}"
        return f"guest:{conversation_id}"

    def _get_or_create_chat(self, conversation_id: str, owner: str, message: str) -> dict:
        chat = self.container.chat_store.get_chat(conversation_id)
        if chat:
            return chat
        now = _utc_now()
        return {
            "id": conversation_id,
            "title": _title_from_message(message),
            "owner": owner,
            "created_at": now,
            "updated_at": now,
            "messages": [],
        }

    def _extract_image_text(self, attached_image: str | None) -> str:
        if not attached_image:
            return ""
        return self.container.openai_service.extract_label_text(attached_image).strip()

    @staticmethod
    def _message_with_image_text(message: str, image_text: str) -> str:
        if not image_text:
            return message
        return f"{message}\n[Text read from the attached image]: {image_text}"

    @staticmethod
    def _scope_message(message: str) -> str:
        return AR_SCOPE_MESSAGE if _is_arabic(message) else EN_SCOPE_MESSAGE

    def _answer_medical_question(self, message: str, chat: dict) -> tuple[str, str]:
        history = chat.get("messages", [])[:-1]
        plan = self.container.chatbot_service.prepare_response_plan(message, history)
        if self.container.openai_service.is_available:
            try:
                response = self.container.openai_service.generate_medical_response(
                    chat_history=plan.conversation_history,
                    medical_context_summary=plan.medical_context_summary,
                    user_message=plan.user_message,
                    language=plan.language,
                    symptoms=plan.symptoms,
                    urgency_level=plan.urgency_level,
                    specialty=plan.specialty,
                    specialty_reason=plan.specialty_reason,
                    red_flag_summary=plan.red_flag_summary,
                    disease_candidates=plan.disease_candidates,
                    medication_matches=plan.medication_matches,
                    rag_context=plan.rag_context,
                )
                return response, "llm"
            except Exception:
                LOGGER.exception("LLM generation failed; using local fallback.")
        return self.container.chatbot_service.build_fallback_from_plan(plan), "local_fallback"

    def _answer_platform_question(self, message: str, chat: dict) -> tuple[str, str]:
        history = chat.get("messages", [])[:-1]
        plan = self.container.chatbot_service.prepare_response_plan(message, history)
        if self.container.openai_service.is_available:
            try:
                response = self.container.openai_service.generate_medical_response(
                    chat_history=plan.conversation_history,
                    medical_context_summary=plan.medical_context_summary,
                    user_message=plan.user_message,
                    language=plan.language,
                    symptoms=[],
                    urgency_level="low",
                    specialty="",
                    specialty_reason="",
                    red_flag_summary="No medical red flags; platform usage question.",
                    disease_candidates=[],
                    medication_matches=[],
                    rag_context=plan.rag_context,
                )
                return response, "llm"
            except Exception:
                LOGGER.exception("LLM platform response failed; using local fallback.")
        return self._platform_fallback(message, plan.rag_context), "local_fallback"

    def _platform_fallback(self, message: str, rag_context: list[dict]) -> str:
        language = "ar" if _is_arabic(message) else "en"
        platform_chunks = [
            chunk for chunk in rag_context
            if chunk.get("entity_type") == "platform_doc"
        ]
        if not platform_chunks:
            if language == "ar":
                return "أقدر أساعدك في استخدام Medora، لكن لا توجد لدي خطوات مؤكدة كفاية لهذا السؤال الآن. جرّب توضح الصفحة أو العملية التي تقصدها."
            return "I can help with Medora, but I do not have enough confirmed steps for this question yet. Please tell me which page or action you mean."

        text = str(platform_chunks[0].get("text", "")).strip()
        text = reflow_text(text, 700)
        if language == "ar":
            return f"حسب دليل Medora المتاح عندي: {text}"
        return f"Based on the available Medora guide: {text}"


def _utc_now() -> str:
    return datetime.now(UTC).isoformat()


def _title_from_message(message: str) -> str:
    value = " ".join(str(message or "").split())
    return value[:60] if value else "New Chat"


def _is_arabic(text: str) -> bool:
    return any("\u0600" <= char <= "\u06ff" for char in text or "")


def reflow_text(text: str, limit: int) -> str:
    value = " ".join(text.split())
    if len(value) <= limit:
        return value
    shortened = value[:limit].rstrip()
    if " " in shortened:
        shortened = shortened.rsplit(" ", 1)[0]
    return f"{shortened}..."
