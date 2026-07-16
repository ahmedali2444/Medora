"""Composition root: builds and holds the singleton AI services.

Heavy objects (the medical data store, RAG index, OpenAI client) are created
once at application startup and shared across requests.
"""

from __future__ import annotations

import logging

from src.chat_store import ChatStore
from src.chatbot_service import MedicalChatbotService
from src.classifier import MessageClassifier
from src.config import AppConfig, load_config
from src.data_loader import MedicalDataStore
from src.openai_service import OpenAIService
from src.rag_engine import RAGEngine
from src.safety_checker import SafetyChecker
from src.symptom_normalizer import SymptomNormalizer


LOGGER = logging.getLogger("ai_service.container")


class ServiceContainer:
    def __init__(self) -> None:
        self.config: AppConfig = load_config()
        LOGGER.info("Loading medical data store ...")
        self.data_store = MedicalDataStore(self.config.data_dir)
        self.normalizer = SymptomNormalizer(self.data_store)
        self.safety_checker = SafetyChecker(self.data_store)
        self.rag_engine = RAGEngine(self.config, self.data_store)
        self.openai_service = OpenAIService(self.config)
        self.chatbot_service = MedicalChatbotService(
            data_store=self.data_store,
            normalizer=self.normalizer,
            safety_checker=self.safety_checker,
            rag_engine=self.rag_engine,
            openai_service=self.openai_service,
        )
        self.classifier = MessageClassifier(self.data_store)
        self.chat_store = ChatStore(self.config.chat_store_path)
        LOGGER.info(
            "Service container ready (model_available=%s)", self.openai_service.is_available
        )

    @property
    def model_available(self) -> bool:
        return self.openai_service.is_available
