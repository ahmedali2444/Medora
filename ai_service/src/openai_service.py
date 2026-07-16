import logging
import time
from collections.abc import Iterator
from typing import Any
from openai import OpenAI

from src.config import AppConfig
from src.prompts import build_generation_prompt, build_response_instructions


LOGGER = logging.getLogger(__name__)


class OpenAIService:
    def __init__(self, config: AppConfig) -> None:
        self.config = config
        self.client = OpenAI(api_key=config.openai_api_key) if config.openai_api_key else None

    @property
    def is_available(self) -> bool:
        return self.client is not None

    def _require_client(self) -> OpenAI:
        if not self.client:
            raise ValueError("OPENAI_API_KEY is missing.")
        return self.client

    def extract_label_text(self, image_data_url: str) -> str:
        """OCR an attached image using the model's native vision.

        Returns the readable text (medication name, active ingredient, strength,
        prescription text). Degrades to an empty string on any failure so an
        image never breaks the chat flow.
        """

        if not self.client:
            return ""
        try:
            started_at = time.perf_counter()
            response = self.client.responses.create(
                model=self.config.openai_vision_model,
                instructions=(
                    "You are an OCR assistant. Read all text visible in the image, "
                    "focusing on medication/drug brand names, active ingredients, and "
                    "dosage strength. Transcribe the text EXACTLY as printed, character "
                    "by character; never replace a word with a different but similar-"
                    "looking medicine name. Return ONLY the extracted text with no "
                    "commentary. If nothing is readable, return an empty string."
                ),
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": "Extract the text from this image."},
                            {
                                "type": "input_image",
                                "image_url": image_data_url,
                                "detail": "high",
                            },
                        ],
                    }
                ],
                max_output_tokens=300,
            )
            LOGGER.info("OCR extraction time: %.3fs", time.perf_counter() - started_at)
            return (response.output_text or "").strip()
        except Exception as exc:  # noqa: BLE001 - OCR is best-effort
            LOGGER.error("OCR extraction failed: %s", exc)
            return ""

    def extract_drug_name(self, image_data_url: str) -> str:
        """Read a medicine photo and return a concise search term.

        Returns just the medicine name (brand preferred, else active ingredient),
        suitable for searching the catalog. Empty string if nothing readable.
        """

        if not self.client:
            return ""
        try:
            started_at = time.perf_counter()
            response = self.client.responses.create(
                model=self.config.openai_vision_model,
                instructions=(
                    "You read a photo of a medicine (box, strip, or bottle). "
                    "Read the largest, most prominent brand/trade name printed on the pack "
                    "and transcribe it EXACTLY as written, letter by letter. "
                    "Do NOT guess, autocorrect, translate, or substitute a different but "
                    "well-known medicine name: if the pack says 'Congestal', return "
                    "'Congestal', never 'Panadol' or anything else. "
                    "Return ONLY that name as a short search term. If no brand is visible, "
                    "use the active ingredient exactly as printed. "
                    "Do not include dosage, quantity, manufacturer, punctuation, or any extra words. "
                    "If you cannot clearly read a medicine name, return an empty string."
                ),
                input=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "input_text", "text": "What medicine is this? Return only the name."},
                            {
                                "type": "input_image",
                                "image_url": image_data_url,
                                "detail": "high",
                            },
                        ],
                    }
                ],
                max_output_tokens=30,
            )
            LOGGER.info("Drug-name OCR time: %.3fs", time.perf_counter() - started_at)
            return (response.output_text or "").strip()[:120]
        except Exception as exc:  # noqa: BLE001 - OCR is best-effort
            LOGGER.error("Drug-name OCR failed: %s", exc)
            return ""

    def generate_medical_response(
        self,
        *,
        chat_history: list[dict[str, str]],
        medical_context_summary: str,
        user_message: str,
        language: str,
        symptoms: list[str],
        urgency_level: str,
        specialty: str,
        specialty_reason: str,
        red_flag_summary: str,
        disease_candidates: list[Any],
        medication_matches: list[Any],
        rag_context: list[dict[str, str]],
    ) -> str:
        client = self._require_client()
        instructions, prompt = self._build_response_request(
            chat_history=chat_history,
            medical_context_summary=medical_context_summary,
            user_message=user_message,
            language=language,
            symptoms=symptoms,
            urgency_level=urgency_level,
            specialty=specialty,
            specialty_reason=specialty_reason,
            red_flag_summary=red_flag_summary,
            disease_candidates=disease_candidates,
            medication_matches=medication_matches,
            rag_context=rag_context,
        )
        started_at = time.perf_counter()
        response = client.responses.create(
            model=self.config.openai_chat_model,
            instructions=instructions,
            input=prompt,
            max_output_tokens=900,
        )
        LOGGER.info("OpenAI response generation time: %.3fs", time.perf_counter() - started_at)
        text = (response.output_text or "").strip()
        if not text:
            raise ValueError("The model returned an empty response.")
        return text

    def stream_medical_response(
        self,
        *,
        chat_history: list[dict[str, str]],
        medical_context_summary: str,
        user_message: str,
        language: str,
        symptoms: list[str],
        urgency_level: str,
        specialty: str,
        specialty_reason: str,
        red_flag_summary: str,
        disease_candidates: list[Any],
        medication_matches: list[Any],
        rag_context: list[dict[str, str]],
    ) -> Iterator[str]:
        client = self._require_client()
        instructions, prompt = self._build_response_request(
            chat_history=chat_history,
            medical_context_summary=medical_context_summary,
            user_message=user_message,
            language=language,
            symptoms=symptoms,
            urgency_level=urgency_level,
            specialty=specialty,
            specialty_reason=specialty_reason,
            red_flag_summary=red_flag_summary,
            disease_candidates=disease_candidates,
            medication_matches=medication_matches,
            rag_context=rag_context,
        )
        started_at = time.perf_counter()
        with client.responses.stream(
            model=self.config.openai_chat_model,
            instructions=instructions,
            input=prompt,
            max_output_tokens=900,
        ) as stream:
            for event in stream:
                if getattr(event, "type", "") == "response.output_text.delta":
                    yield getattr(event, "delta", "")
        LOGGER.info("OpenAI streaming response time: %.3fs", time.perf_counter() - started_at)

    def _build_response_request(
        self,
        *,
        chat_history: list[dict[str, str]],
        medical_context_summary: str,
        user_message: str,
        language: str,
        symptoms: list[str],
        urgency_level: str,
        specialty: str,
        specialty_reason: str,
        red_flag_summary: str,
        disease_candidates: list[Any],
        medication_matches: list[Any],
        rag_context: list[dict[str, str]],
    ) -> tuple[str, str]:
        instructions = build_response_instructions(language)
        prompt = build_generation_prompt(
            conversation_history=self._format_chat_history(chat_history),
            medical_context_summary=medical_context_summary,
            user_message=user_message,
            language=language,
            symptoms=symptoms,
            urgency_level=urgency_level,
            specialty=specialty,
            specialty_reason=specialty_reason,
            red_flag_summary=red_flag_summary,
            disease_candidates=disease_candidates,
            medication_matches=medication_matches,
            rag_context=rag_context,
        )
        return instructions, prompt

    def _format_chat_history(self, chat_history: list[dict[str, str]]) -> str:
        if not chat_history:
            return "No previous conversation."
        lines = []
        for message in chat_history[-self.config.history_window_messages:]:
            role = str(message.get("role", "user")).capitalize()
            content = str(message.get("content", "")).strip()
            if not content:
                continue
            lines.append(f"{role}: {content}")
        return "\n".join(lines) if lines else "No previous conversation."
