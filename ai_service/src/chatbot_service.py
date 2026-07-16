from dataclasses import dataclass
import time
from typing import Any
import logging

from src.data_loader import DiseaseCandidate, DrugRecord, MedicalDataStore, normalize_text
from src.openai_service import OpenAIService
from src.rag_engine import RAGEngine
from src.safety_checker import SafetyChecker
from src.symptom_normalizer import SymptomNormalizer


LOGGER = logging.getLogger(__name__)

SPECIALTY_RULES = [
    ("Cardiology", {"chest pain", "palpitations", "shortness of breath"}),
    ("ENT", {"cough", "sore throat", "ear pain", "runny nose", "sinus pain"}),
    ("Dermatology", {"rash", "itching", "acne", "skin lesion"}),
    ("Gastroenterology", {"abdominal pain", "vomiting", "nausea", "diarrhea", "constipation"}),
    ("Orthopedics", {"back pain", "joint pain", "knee pain", "leg pain", "muscle pain"}),
    ("Neurology", {"headache", "fainting", "seizures", "focal weakness", "paralysis", "dizziness"}),
    ("Urology", {"retention of urine", "burning urination", "blood in urine", "urinary urgency"}),
    ("Gynecology", {"pelvic pain", "vaginal bleeding"}),
    ("Psychiatry", {"anxiety", "panic", "depression", "insomnia"}),
]

PEDIATRIC_TERMS = {"child", "baby", "kid", "طفل", "رضيع", "ابني", "بنتي"}
URGENT_WORDS = {"severe", "worsening", "persistent", "شديد", "مستمر", "بيزيد", "يزداد"}
MEDICATION_QUESTION_TERMS = {
    "medicine",
    "medication",
    "tablet",
    "painkiller",
    "take",
    "drug",
    "علاج",
    "دواء",
    "اخد",
    "آخد",
    "مسكن",
}


def _shorten(text: str, limit: int = 180) -> str:
    value = str(text or "").strip()
    if len(value) <= limit:
        return value
    return f"{value[:limit].rstrip()}..."


@dataclass
class ResponsePlan:
    conversation_history: list[dict[str, str]]
    user_message: str
    language: str
    symptoms: list[str]
    specialty: str
    specialty_reason: str
    urgency_level: str
    disease_candidates: list[DiseaseCandidate]
    medication_matches: list[DrugRecord]
    rag_context: list[dict[str, Any]]
    red_flag_summary: str
    medical_context_summary: str
    matched_red_flags: list[dict[str, str]]
    timings: dict[str, float]


class MedicalChatbotService:
    def __init__(
        self,
        data_store: MedicalDataStore,
        normalizer: SymptomNormalizer,
        safety_checker: SafetyChecker,
        rag_engine: RAGEngine,
        openai_service: OpenAIService,
    ) -> None:
        self.data_store = data_store
        self.normalizer = normalizer
        self.safety_checker = safety_checker
        self.rag_engine = rag_engine
        self.openai_service = openai_service

    def prepare_response_plan(
        self,
        user_message: str,
        chat_history: list[dict[str, str]] | None = None,
    ) -> ResponsePlan:
        total_started_at = time.perf_counter()
        conversation_history = self._prepare_conversation_history(chat_history, user_message)
        normalized = self.normalizer.extract(user_message)
        language = str(normalized["language"])
        history_user_messages = self._recent_user_messages(conversation_history)
        conversation_text = " ".join(history_user_messages[-6:]).strip() or user_message
        symptoms = self._collect_context_symptoms(history_user_messages, list(normalized["symptoms"]))
        safety_result = self.safety_checker.check(conversation_text, symptoms)
        disease_candidates = self.data_store.score_possible_diseases(symptoms)
        specialty, specialty_reason = self._recommend_specialty(conversation_text, symptoms, disease_candidates)
        urgency_level = self._merge_urgency(
            safety_result["urgency_level"],
            disease_candidates,
            conversation_text,
            symptoms,
        )
        medication_matches = self.data_store.find_drug_mentions(conversation_text)
        if not medication_matches and disease_candidates:
            medication_matches = self.data_store.get_related_drugs(
                [candidate.disease_id for candidate in disease_candidates[:3]],
                limit=4,
            )

        query = " ".join(
            [
                conversation_text,
                " ".join(symptoms),
                " ".join(candidate.disease_name for candidate in disease_candidates[:2]),
                " ".join(drug.drug_name for drug in medication_matches[:1]),
            ]
        ).strip()
        rag_started_at = time.perf_counter()
        rag_context = self.rag_engine.retrieve(query)
        rag_time = time.perf_counter() - rag_started_at
        red_flag_summary = self._summarize_red_flags(safety_result["matched_red_flags"])
        medical_context_summary = self._build_medical_context_summary(
            conversation_history=conversation_history,
            symptoms=symptoms,
            specialty=specialty,
            urgency_level=urgency_level,
            disease_candidates=disease_candidates,
            medication_matches=medication_matches,
            current_message=user_message,
        )
        timings = {
            "rag_retrieval_s": rag_time,
            "local_prepare_s": time.perf_counter() - total_started_at,
        }
        LOGGER.info(
            "Local prep time: %.3fs | RAG retrieval time: %.3fs",
            timings["local_prepare_s"],
            timings["rag_retrieval_s"],
        )
        return ResponsePlan(
            conversation_history=conversation_history,
            user_message=user_message,
            language=language,
            symptoms=symptoms,
            specialty=specialty,
            specialty_reason=specialty_reason,
            urgency_level=urgency_level,
            disease_candidates=disease_candidates,
            medication_matches=medication_matches,
            rag_context=rag_context,
            red_flag_summary=red_flag_summary,
            medical_context_summary=medical_context_summary,
            matched_red_flags=safety_result["matched_red_flags"],
            timings=timings,
        )

    def build_fallback_from_plan(self, plan: ResponsePlan) -> str:
        if plan.urgency_level == "emergency":
            return self._build_emergency_response(
                language=plan.language,
                symptoms=plan.symptoms,
                specialty=plan.specialty,
                red_flags=plan.matched_red_flags,
            )
        return self._build_fallback_response(
            language=plan.language,
            user_message=plan.user_message,
            symptoms=plan.symptoms,
            specialty=plan.specialty,
            specialty_reason=plan.specialty_reason,
            urgency_level=plan.urgency_level,
            disease_candidates=plan.disease_candidates,
            medication_matches=plan.medication_matches,
            red_flags=plan.matched_red_flags,
        )

    def _prepare_conversation_history(
        self,
        chat_history: list[dict[str, str]] | None,
        user_message: str,
    ) -> list[dict[str, str]]:
        history = [
            message for message in list(chat_history or [])
            if message.get("status") != "pending" and str(message.get("content", "")).strip()
        ]
        if not history:
            return [{"role": "user", "content": user_message}]
        last_message = history[-1]
        if last_message.get("role") != "user" or str(last_message.get("content", "")).strip() != user_message.strip():
            history.append({"role": "user", "content": user_message})
        window_size = max(6, self.openai_service.config.history_window_messages)
        return history[-window_size:]

    @staticmethod
    def _recent_user_messages(conversation_history: list[dict[str, str]]) -> list[str]:
        return [
            str(message.get("content", "")).strip()
            for message in conversation_history
            if message.get("role") == "user" and str(message.get("content", "")).strip()
        ]

    def _collect_context_symptoms(self, user_messages: list[str], current_symptoms: list[str]) -> list[str]:
        merged = list(dict.fromkeys(current_symptoms))
        for message in user_messages[-6:]:
            for symptom in self.data_store.symptom_matches_from_text(message):
                if symptom not in merged:
                    merged.append(symptom)
        return merged

    def _recommend_specialty(
        self,
        user_message: str,
        symptoms: list[str],
        disease_candidates: list[DiseaseCandidate],
    ) -> tuple[str, str]:
        text = normalize_text(user_message)
        if any(term in text for term in PEDIATRIC_TERMS):
            return "Pediatrics", "The message suggests the patient may be a child."

        symptom_keys = {normalize_text(symptom) for symptom in symptoms}
        scored: list[tuple[int, str, str]] = []
        for specialty, keywords in SPECIALTY_RULES:
            overlap = len(symptom_keys & {normalize_text(item) for item in keywords})
            if overlap:
                reason = f"Matched symptoms pointing to {specialty.lower()}."
                scored.append((overlap, specialty, reason))

        if scored:
            scored.sort(reverse=True)
            _, specialty, reason = scored[0]
            return specialty, reason

        if disease_candidates:
            top_name = disease_candidates[0].disease_name.lower()
            if any(keyword in top_name for keyword in ["acne", "skin", "dermat"]):
                return "Dermatology", "Top related condition appears skin-related."
            if any(keyword in top_name for keyword in ["gastr", "ulcer", "bowel", "colitis"]):
                return "Gastroenterology", "Top related condition appears gastrointestinal."

        return "Internal Medicine", "General symptoms are best reviewed by internal medicine first."

    def _merge_urgency(
        self,
        safety_urgency: str,
        disease_candidates: list[DiseaseCandidate],
        user_message: str,
        symptoms: list[str],
    ) -> str:
        if safety_urgency == "emergency":
            return "emergency"
        if safety_urgency == "high":
            return "high"
        normalized_text = normalize_text(user_message)
        if any(word in normalized_text for word in URGENT_WORDS):
            return "high"
        if any(candidate.urgency_level == "high" for candidate in disease_candidates[:3]):
            return "medium"
        if len(symptoms) >= 2:
            return "medium"
        return "low"

    @staticmethod
    def _summarize_red_flags(red_flags: list[dict[str, str]]) -> str:
        if not red_flags:
            return "No immediate emergency red flags were matched from the local safety layer."
        return "; ".join(f"{item['symptom']}: {item['action']}" for item in red_flags)

    def _build_emergency_response(
        self,
        *,
        language: str,
        symptoms: list[str],
        specialty: str,
        red_flags: list[dict[str, str]],
    ) -> str:
        red_flag_text = "، ".join(item["symptom"] for item in red_flags) if red_flags else "علامات خطورة"
        if language == "ar":
            return (
                f"بص، الأعراض دي فيها علامات خطورة واضحة زي {red_flag_text}، وده محتاج تقييم طبي عاجل جدًا ومش مناسب نطمن عليه من الشات بس.\n\n"
                f"الأفضل تروح الطوارئ أو تطلب إسعاف فورًا، خصوصًا لو الأعراض مستمرة أو بتزيد. ولو قدرت بعد كده تتابع مع دكتور {specialty} يبقى كويس، لكن الأولوية دلوقتي إنك تاخد رعاية طبية حالًا."
            )
        return (
            f"The symptoms you described include clear danger signs like {red_flag_text}, so this really needs urgent medical evaluation and is not something to rely on chat advice for.\n\n"
            f"Please go to the emergency room or call emergency services now, especially if the symptoms are continuing or getting worse. After that, follow-up with a {specialty} doctor may be helpful, but the priority right now is immediate care."
        )

    def _build_fallback_response(
        self,
        *,
        language: str,
        user_message: str,
        symptoms: list[str],
        specialty: str,
        specialty_reason: str,
        urgency_level: str,
        disease_candidates: list[DiseaseCandidate],
        medication_matches: list[DrugRecord],
        red_flags: list[dict[str, str]],
    ) -> str:
        possible_conditions = ", ".join(candidate.disease_name for candidate in disease_candidates[:3]) or "general medical causes"
        medication_note = self._medication_summary(medication_matches, language, symptoms, user_message)
        self_care = self._self_care_advice(symptoms, language)
        follow_up = self._follow_up_advice(language, specialty, urgency_level)
        if language == "ar":
            return (
                f"بص، ممكن يكون اللي عندك مرتبط بـ {possible_conditions} أو سبب بسيط، لكن ماينفعش نأكد تشخيص من الشات بس. {self_care}\n\n"
                f"{medication_note} {follow_up}\n\n"
                f"ولو الأعراض زادت أو ظهر ألم صدر أو ضيق نفس أو إغماء أو نزيف شديد، ساعتها لازم تطلب رعاية طبية عاجلة فورًا. {self._red_flag_guidance(language, red_flags)}"
            )
        return (
            f"What you described may be related to {possible_conditions}, but it still cannot be confirmed from chat alone. {self_care}\n\n"
            f"{medication_note} {follow_up}\n\n"
            f"If the symptoms get worse or you develop chest pain, breathing difficulty, fainting, or severe bleeding, please seek urgent medical care right away. {self._red_flag_guidance(language, red_flags)}"
        )

    def _medication_summary(
        self,
        medications: list[DrugRecord],
        language: str,
        symptoms: list[str],
        user_message: str,
    ) -> str:
        normalized_symptoms = {normalize_text(symptom) for symptom in symptoms}
        if not medications and self._is_medication_question(user_message):
            if language == "ar":
                if normalized_symptoms & {"headache", "fever"}:
                    return (
                        "وبما إنك بتسأل على علاج، ممكن بشكل عام تسأل الصيدلي هل باراسيتامول مناسب كمسكن أو خافض حرارة لو مفيش عندك حساسية أو مشكلة في الكبد، لكن ما تعتبرش ده وصفة مباشرة."
                    )
                if normalized_symptoms & {"abdominal pain", "vomiting", "diarrhea"}:
                    return "ولو فيه لخبطة معدة أو ترجيع أو إسهال، ممكن تسأل الصيدلي عن محلول معالجة الجفاف أو مضاد حموضة مناسب لو مفيش مانع طبي."
                return "وبما إنك بتسأل على علاج، الأفضل تسأل صيدلي أو دكتور عن أنسب اختيار آمن حسب حالتك وتاريخك المرضي."
            if normalized_symptoms & {"headache", "fever"}:
                return (
                    "Since you are asking about treatment, you can ask a pharmacist whether paracetamol is appropriate as a general pain reliever or fever reducer if you do not have an allergy to it or liver problems, but this is not a prescription."
                )
            if normalized_symptoms & {"abdominal pain", "vomiting", "diarrhea"}:
                return "If this is more of an upset stomach with vomiting or diarrhea, you can ask a pharmacist about oral rehydration solution or a simple antacid if there is no medical reason to avoid it."
            return "Since you are asking about treatment, it is safer to check with a doctor or pharmacist before taking anything."

        if not medications:
            return (
                "ولو احتجت دواء بسيط، اسأل الصيدلي الأول قبل الاستخدام خصوصًا لو عندك حساسية أو مشاكل مزمنة."
                if language == "ar"
                else "If you feel you may need a simple medicine, ask a pharmacist first, especially if you have allergies or chronic conditions."
            )
        drug = medications[0]
        warning = drug.warnings[0] if drug.warnings else (
            "راجع التحذيرات قبل الاستخدام." if language == "ar" else "Review warnings before use."
        )
        if language == "ar":
            return (
                f"ولو بتفكر في {drug.drug_name} فده استخدامه هنا كمعلومة عامة بس ومش وصفة، ومن المهم تعرف إن فيه تحذيرات زي {_shorten(warning)}، فاسأل الصيدلي قبل الاستخدام خصوصًا لو مفيش عندك حساسية أو مانع طبي."
            )
        return (
            f"If you are thinking about {drug.drug_name}, this is only general information and not a prescription. One important warning is {_shorten(warning)}, so please check with a pharmacist before using it, especially if you have any allergy or medical contraindication."
        )

    def _build_medical_context_summary(
        self,
        *,
        conversation_history: list[dict[str, str]],
        symptoms: list[str],
        specialty: str,
        urgency_level: str,
        disease_candidates: list[DiseaseCandidate],
        medication_matches: list[DrugRecord],
        current_message: str,
    ) -> str:
        recent_user_messages = self._recent_user_messages(conversation_history)[-4:]
        related_conditions = ", ".join(candidate.disease_name for candidate in disease_candidates[:3]) or "no strong matches"
        medications = ", ".join(drug.drug_name for drug in medication_matches[:3]) or "none detected"
        return (
            f"Recent user messages: {' | '.join(recent_user_messages) or current_message}. "
            f"Active symptoms inferred from the conversation: {', '.join(symptoms) if symptoms else 'none clearly extracted'}. "
            f"Suggested specialty: {specialty}. "
            f"Urgency level: {urgency_level}. "
            f"Possible related conditions from local ranking: {related_conditions}. "
            f"Medication references in the conversation or related context: {medications}."
        )

    def _is_medication_question(self, user_message: str) -> bool:
        normalized = normalize_text(user_message)
        return any(term in normalized for term in MEDICATION_QUESTION_TERMS)

    def _self_care_advice(self, symptoms: list[str], language: str) -> str:
        symptom_set = {normalize_text(symptom) for symptom in symptoms}
        advice: list[str] = []

        if {"headache", "fever"} & symptom_set:
            advice.append(
                "حاول ترتاح وتشرب مياه كويس" if language == "ar" else "Try to rest and drink enough fluids"
            )
        if {"cough", "sore throat", "runny nose"} & symptom_set:
            advice.append(
                "المشروبات الدافية وتقليل المهيجات زي الدخان ممكن يساعدوا" if language == "ar" else "Warm fluids and avoiding irritants like smoke may help"
            )
        if {"abdominal pain", "vomiting", "diarrhea", "nausea"} & symptom_set:
            advice.append(
                "خليك على أكل خفيف وسوائل على فترات صغيرة" if language == "ar" else "Stick to light food and small frequent fluids"
            )
        if {"back pain", "joint pain", "muscle pain"} & symptom_set:
            advice.append(
                "ممكن يفيدك راحة بسيطة وكمادات دافية" if language == "ar" else "Gentle rest and a warm compress may help"
            )

        if not advice:
            return (
                "ابدأ براحة بسيطة، وسوائل كفاية، وراقب إذا كانت الأعراض بتتحسن ولا لأ."
                if language == "ar"
                else "Start with rest, enough fluids, and watch whether the symptoms are improving."
            )
        joined = "، ".join(advice) if language == "ar" else ", and ".join(advice)
        return f"مبدئيًا {joined}." if language == "ar" else f"For now, {joined}."

    def _follow_up_advice(self, language: str, specialty: str, urgency_level: str) -> str:
        if language == "ar":
            if urgency_level in {"medium", "high"}:
                return f"ولو الموضوع ما اتحسنش أو استمر، غالبًا الأفضل تراجع دكتور {specialty}."
            return f"ولو الأعراض فضلت مستمرة أو بتتكرر، ساعتها يبقى من الأفضل تراجع دكتور {specialty}."
        if urgency_level in {"medium", "high"}:
            return f"If it does not improve or keeps going, it would be a good idea to see a {specialty} doctor."
        return f"If the symptoms keep coming back or do not settle, it would be reasonable to see a {specialty} doctor."

    @staticmethod
    def _red_flag_guidance(language: str, red_flags: list[dict[str, str]]) -> str:
        if red_flags:
            actions = "، ".join(item["action"] for item in red_flags) if language == "ar" else ". ".join(
                item["action"] for item in red_flags
            )
            return actions
        if language == "ar":
            return "لو ظهر ألم صدر أو ضيق نفس أو إغماء أو ضعف مفاجئ أو نزيف شديد، أو لو الأعراض بقت شديدة أو مستمرة، اطلب رعاية طبية عاجلة."
        return "Seek urgent medical care if chest pain, breathing difficulty, fainting, sudden weakness, severe bleeding, or worsening symptoms appear."
