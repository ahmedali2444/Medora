import re

from src.data_loader import MedicalDataStore


ARABIC_CHAR_PATTERN = re.compile(r"[\u0600-\u06FF]")


class SymptomNormalizer:
    def __init__(self, data_store: MedicalDataStore) -> None:
        self.data_store = data_store

    @staticmethod
    def detect_language(text: str) -> str:
        return "ar" if ARABIC_CHAR_PATTERN.search(text or "") else "en"

    def extract(self, user_message: str) -> dict[str, object]:
        language = self.detect_language(user_message)
        rule_based = self.data_store.symptom_matches_from_text(user_message)
        symptoms = list(dict.fromkeys(rule_based))

        return {
            "language": language,
            "symptoms": symptoms,
            "source": "rules",
        }
