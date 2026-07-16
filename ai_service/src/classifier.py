"""Message classification layer.

Before any LLM inference, every user message is classified into one of three
buckets so the AI assistant can stay strictly within the Medora medical/platform
scope:

* ``medical``         – health, symptoms, medicines, prevention, health education
* ``medora_platform`` – using the Medora app (booking, accounts, orders, etc.)
* ``non_medical``     – anything else (cooking, coding, sports, politics, ...)

The classifier is deterministic and rule-based (no LLM call) so that
``non_medical`` messages are rejected cheaply and never reach the model, which is
both a cost and a safety guarantee. It reuses the existing medical knowledge base
(symptoms, drugs) for high-precision medical detection.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field

from src.data_loader import MedicalDataStore, normalize_text


MEDICAL = "medical"
MEDORA_PLATFORM = "medora_platform"
NON_MEDICAL = "non_medical"


# Platform / product usage vocabulary (Arabic + English).
PLATFORM_TERMS = {
    "medora", "ميدورا", "ميدورة", "المنصة", "المنصه", "التطبيق", "الموقع", "platform", "app", "website",
    "حجز", "احجز", "أحجز", "موعد", "مواعيد", "appointment", "appointments", "booking", "book",
    "حساب", "حسابي", "تسجيل", "دخول", "اشتراك", "account", "login", "log in", "sign in", "signup", "register",
    "وصفة طبية", "وصفه طبيه", "روشتة", "روشته", "prescription", "prescriptions",
    "طلب", "طلبات", "اطلب", "اوردر", "order", "orders", "cart", "عربة",
    "صيدلية", "صيدليه", "pharmacy", "صيدلي",
    "دفع", "ادفع", "الدفع", "payment", "pay", "checkout", "فاتورة",
    "إلغاء", "الغاء", "الغي", "تعديل", "cancel", "edit", "reschedule",
    "دكاترة", "اطباء", "أطباء", "doctors", "specialist search", "ابحث عن دكتور", "search doctor",
    "support", "الدعم", "مساعدة في الموقع", "feature", "ميزة",
}

# Clearly off-topic vocabulary that must be rejected.
NON_MEDICAL_TERMS = {
    # cooking / food recipes
    "مكرونة", "مكرونه", "بشاميل", "طبخ", "اطبخ", "وصفة اكل", "وصفه اكل", "اكلة", "recipe", "recipes", "cook",
    "cooking", "كيكة", "حلويات", "pizza", "بيتزا",
    # programming
    "كود", "برمجة", "برمجه", "بايثون", "جافا", "code", "coding", "program", "python", "javascript",
    "java", "html", "css", "sql", "function", "algorithm", "خوارزمية",
    # sports
    "ماتش", "الماتش", "كورة", "الكورة", "مباراة", "هدف", "ريال مدريد", "برشلونة", "football",
    "match", "soccer", "goal", "league", "اللاعب",
    # politics / news
    "سياسة", "سياسه", "رئيس", "انتخابات", "حكومة", "politics", "president", "election", "government",
    "اخبار", "أخبار", "news",
    # entertainment / misc
    "فيلم", "افلام", "اغنية", "أغنية", "مسلسل", "movie", "film", "song", "music", "game", "لعبة",
    "العاب", "celebrity", "مشهور",
    # general study
    "رياضيات", "جبر", "فيزياء", "كيمياء", "math", "algebra", "physics", "history homework", "واجب",
}

# Medical vocabulary (in addition to KB symptom/drug detection).
MEDICAL_TERMS = {
    "وجع", "ألم", "الم", "مرض", "مريض", "علاج", "دواء", "ادوية", "أدوية", "عرض", "اعراض", "أعراض",
    "صحة", "صحه", "صحي", "طبي", "طبيب", "دكتور", "عيادة", "مستشفى", "حقن", "تحليل", "أشعة", "اشعة",
    "حرارة", "سخونية", "حامل", "حمل", "رضاعة", "ضغط", "سكر", "سكري", "كوليسترول", "التهاب", "عدوى",
    "جرح", "كسر", "اكتئاب", "قلق", "نوم", "تطعيم", "لقاح", "وقاية", "تغذية", "فيتامين",
    "طوارئ", "طوارىء", "اسعاف", "إسعاف", "إرهاق", "ارهاق", "اجهاد", "إجهاد", "تعب", "ارهاق مستمر",
    "pain", "ache", "sick", "illness", "disease", "symptom", "symptoms", "treatment", "medicine",
    "medication", "drug", "dose", "dosage", "doctor", "clinic", "hospital", "fever", "infection",
    "pregnant", "pregnancy", "diabetes", "blood pressure", "cholesterol", "vaccine", "nutrition",
    "vitamin", "allergy", "diagnosis", "health", "healthy", "prevention", "wound", "injury", "anxiety",
    "depression",
}


@dataclass
class Classification:
    category: str
    confidence: float
    matched: dict[str, list[str]] = field(default_factory=dict)

    @property
    def is_allowed(self) -> bool:
        return self.category in {MEDICAL, MEDORA_PLATFORM}


# Arabic clitic prefixes that attach to the front of a word (definite article
# "ال", conjunctions/prepositions و/ف/ب/ك/ل and their combinations with "ال").
# These must be tolerated before a vocabulary term, otherwise "السكر"/"الضغط"
# never match the bare stems "سكر"/"ضغط".
_ARABIC_PREFIX = r"(?:[وفبكل]?ال|لل|[وفبكل])?"


def _find_terms(text: str, terms: set[str]) -> list[str]:
    """Prefix-aware lookup.

    Naive substring matching produces false positives (e.g. the medical term
    "الم"/pain is a substring of "الماتش"/the match). We anchor on a left
    boundary that is not a word character (so a term can't match inside an
    unrelated longer word) while still allowing an attached Arabic clitic
    prefix such as the definite article "ال" (so "السكر" matches "سكر"). The
    right side stays anchored on a word boundary.
    """

    found: list[str] = []
    for term in terms:
        normalized = normalize_text(term)
        if not normalized:
            continue
        if re.search(rf"(?<!\w){_ARABIC_PREFIX}{re.escape(normalized)}\b", text):
            found.append(term)
    return found


class MessageClassifier:
    def __init__(self, data_store: MedicalDataStore) -> None:
        self._data_store = data_store

    def classify(self, message: str) -> Classification:
        normalized = normalize_text(message)
        if not normalized:
            # Empty / greeting-only: allow as medical so the assistant can greet.
            return Classification(MEDICAL, 0.2, {})

        # High-precision medical detection from the knowledge base.
        kb_symptoms = self._data_store.symptom_matches_from_text(message)
        kb_drugs = [drug.drug_name for drug in self._data_store.find_drug_mentions(message)]

        platform_hits = _find_terms(normalized, PLATFORM_TERMS)
        non_medical_hits = _find_terms(normalized, NON_MEDICAL_TERMS)
        medical_hits = _find_terms(normalized, MEDICAL_TERMS)

        # A recognized medical vocabulary term is a strong, unambiguous signal
        # (e.g. "السكر", "الطوارئ"), so it carries the same weight as a
        # knowledge-base symptom/drug match. This lets a clearly medical
        # question with a single such term qualify on its own.
        medical_score = len(kb_symptoms) * 2 + len(kb_drugs) * 2 + len(medical_hits) * 2
        platform_score = len(platform_hits)
        non_medical_score = len(non_medical_hits)

        matched = {
            "kb_symptoms": kb_symptoms,
            "kb_drugs": kb_drugs,
            "medical_terms": medical_hits,
            "platform_terms": platform_hits,
            "non_medical_terms": non_medical_hits,
        }

        # Off-topic only when there is a clear non-medical signal and no
        # competing medical/platform signal.
        if non_medical_score and not medical_score and not platform_score:
            confidence = min(0.99, 0.6 + 0.1 * non_medical_score)
            return Classification(NON_MEDICAL, confidence, matched)

        # Platform questions win when they clearly dominate medical terms.
        if platform_score and platform_score >= medical_score:
            confidence = min(0.95, 0.55 + 0.1 * platform_score)
            return Classification(MEDORA_PLATFORM, confidence, matched)

        if medical_score:
            confidence = min(0.97, 0.55 + 0.08 * medical_score)
            return Classification(MEDICAL, confidence, matched)

        if platform_score:
            return Classification(MEDORA_PLATFORM, 0.55, matched)

        if non_medical_score:
            return Classification(NON_MEDICAL, 0.6, matched)

        # No signal at all: treat as off-topic unless the user is clearly greeting.
        if len(normalized) <= 12:
            return Classification(MEDICAL, 0.2, matched)
        return Classification(NON_MEDICAL, 0.45, matched)
