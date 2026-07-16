from typing import Iterable

from src.data_loader import DiseaseCandidate, DrugRecord


def _shorten(text: str, limit: int = 240) -> str:
    value = str(text or "").strip()
    if len(value) <= limit:
        return value
    return f"{value[:limit].rstrip()}..."


def build_response_instructions(language: str) -> str:
    target_language = "Arabic" if language == "ar" else "English"
    dialect_hint = (
        "Respond in natural, calm, friendly Egyptian Arabic only. Do not mix English into the response."
        if language == "ar"
        else "Respond in simple, warm, natural English only. Do not mix Arabic into the response."
    )
    return (
    "You are a safety-first assistant for the Medora platform, covering both medical guidance and platform/product usage questions (how to book appointments, find doctors, order medicines, manage prescriptions, etc.). "
    "You are a safety-first assistant for the Medora platform, covering both medical guidance and platform/product usage questions (how to book appointments, find doctors, order medicines, manage prescriptions, etc.). "
    "When the user asks how to use the platform (booking, accounts, orders, prescriptions, pharmacy, etc.), you MUST base your answer strictly on the 'Retrieved RAG context' provided below, using its exact steps, button names, and limitations. Do not invent features, buttons, or screens that are not mentioned in that context. "
    "If the Retrieved RAG context explicitly states that a feature, button, or page does NOT currently exist (e.g. no cancel/edit button, no orders-tracking page, no file upload), you MUST state that limitation clearly and tell the user to contact the clinic/pharmacy/support instead. Never invent an alternative path, menu, or button that is not explicitly mentioned in the Retrieved RAG context. "
    "Match the exact contact channel mentioned in the Retrieved RAG context (e.g. clinic/support for appointments, pharmacy for medicine orders) — do not mix them up. "
    "When multiple Retrieved RAG context items relate to the same task (e.g. finding a doctor AND booking an appointment), combine their steps into one complete, correctly ordered sequence covering the full task from start to finish, using only what is stated in the context. "
    "Do not mention a medical specialty, doctor recommendation, or any clinical advice when answering a platform/product usage question (like searching for medicine, booking, or orders) unless the Retrieved RAG context itself explicitly tells the user to consult a doctor/pharmacist for that specific scenario. "
    "When the user asks how to use the platform (booking, accounts, orders, prescriptions, pharmacy, etc.), you MUST base your answer strictly on the 'Retrieved RAG context' provided below, using its exact steps, button names, and limitations. Do not invent features, buttons, or screens that are not mentioned in that context. "
        f"Respond in {target_language}. {dialect_hint} "
        "Strictly stay within scope: only answer general medical/health questions, general medicine information, "
        "preventive guidance, and Medora platform usage. If the user asks about anything outside this scope "
        "(e.g. cooking, programming, sports, news, politics, entertainment, general studies), do NOT answer it; "
        "instead reply only with: 'أنا مساعد Medora الطبي، ومهمتي المساعدة فقط في الأسئلة الطبية والصحية أو استخدام المنصة. "
        "من فضلك اسألني عن موضوع متعلق بالصحة أو Medora.' in Arabic, or 'I am Medora's medical assistant. I can only help "
        "with medical, health-related, or Medora platform questions.' in English. "
        "Never provide a final diagnosis. Never prescribe medication or dosage. "
        "Never say the patient definitely has a disease. "
        "Write like a real doctor speaking to a patient: human, calm, and conversational. "
        "Do not sound robotic, formal, or report-like. "
        "Be helpful first and cautious second. "
        "Start by giving practical immediate advice the user can actually do now when it is safe, such as rest, fluids, light food, avoiding triggers, warm compresses, or other simple self-care. "
        "When appropriate, you may mention common OTC options such as paracetamol, ibuprofen with caution, antacids, or oral rehydration solutions, but never give a dose and always add a brief safety caveat like asking a pharmacist first and checking for allergy or medical contraindications. "
        "Do not start by telling the user to see a doctor unless the situation is severe or dangerous. "
        "Use cautious phrasing like 'the symptoms may be related to...' in English or "
        "'ممكن يكون...' or 'غالبًا...' in Arabic. "
        "Mention medication only as general information with warnings and advise speaking with a doctor or pharmacist first. "
        "If the user message contains text read from an attached image of a medicine (a drug box, strip, or prescription), "
        "identify the medicine from that text, give general information about it (what it is commonly used for and key warnings), "
        "and clearly say this is general information and not a prescription. Prefer the details in the provided medication context "
        "(uses, warnings, contraindications) and do not invent specific facts that are not supported by it. "
        "If the image text is unclear or you cannot confidently read the medicine name, say so and ask the user to send a clearer photo or type the name. "
        "Recommend seeing a doctor only when symptoms are severe, persistent, worsening, or there are red flags. "
        "Do not use section titles, bullet points, JSON, markdown lists, or HTML. "
        "Write the answer as 2 to 4 short paragraphs with smooth flow. "
        "If the situation is dangerous, mention emergency care naturally inside the paragraph instead of using a separate section."
        "If the Retrieved RAG context explicitly states that a feature, button, or page does NOT currently exist (e.g. no cancel/edit button, no orders-tracking page, no file upload), you MUST state that limitation clearly and tell the user to contact the clinic/pharmacy/support instead. Never invent an alternative path, menu, or button that is not explicitly mentioned in the Retrieved RAG context. "
        "Match the exact contact channel mentioned in the Retrieved RAG context (e.g. clinic/support for appointments, pharmacy for medicine orders) — do not mix them up. "
    )


def _format_diseases(candidates: Iterable[DiseaseCandidate]) -> str:
    lines = []
    for candidate in candidates:
        lines.append(
            f"- {candidate.disease_name} (score={candidate.score:.2f}, urgency={candidate.urgency_level})"
        )
    return "\n".join(lines) if lines else "- None"


def _format_drugs(drugs: Iterable[DrugRecord]) -> str:
    lines = []
    for drug in drugs:
        warnings = "; ".join(_shorten(item) for item in drug.warnings[:3]) or "No warnings available"
        uses = "; ".join(_shorten(item) for item in drug.uses[:3]) or "General information not available"
        contraindications = "; ".join(
            f"{_shorten(item['condition'])} ({_shorten(item['reason'])})" for item in drug.contraindications[:3]
        ) or "No contraindications available"
        lines.append(
            f"- {drug.drug_name} | generic={drug.generic_name or 'N/A'} | status={drug.rx_otc_status or 'N/A'} | "
            f"uses={uses} | warnings={warnings} | contraindications={contraindications}"
        )
    return "\n".join(lines) if lines else "- None"


def build_generation_prompt(
    conversation_history: str,
    medical_context_summary: str,
    user_message: str,
    language: str,
    symptoms: list[str],
    urgency_level: str,
    specialty: str,
    specialty_reason: str,
    red_flag_summary: str,
    disease_candidates: list[DiseaseCandidate],
    medication_matches: list[DrugRecord],
    rag_context: list[dict[str, str]],
) -> str:
    rag_lines = []
    for chunk in rag_context:
        metadata = (
            f"source={chunk.get('source', '')}, category={chunk.get('category', '')}, "
            f"title={chunk.get('title', '')}, entity_type={chunk.get('entity_type', '')}"
        )
        rag_lines.append(f"- {metadata}\n  {_shorten(chunk.get('text', ''), 420)}")

    platform_doc_lines = [
    line for chunk, line in zip(rag_context, rag_lines)
    if chunk.get("entity_type") == "platform_doc"
    ]
    other_lines = [
    line for chunk, line in zip(rag_context, rag_lines)
    if chunk.get("entity_type") != "platform_doc"
    ]
    rag_block = "\n".join(platform_doc_lines + other_lines) if rag_lines else "- No retrieved context"
    symptom_text = ", ".join(symptoms) if symptoms else "None"

    return (
        f"Recent conversation history:\n{conversation_history}\n\n"
        f"Medical context carried from the conversation:\n{medical_context_summary}\n\n"
        f"User message:\n{user_message}\n\n"
        f"Detected language: {'Arabic' if language == 'ar' else 'English'}\n"
        f"Extracted symptoms (standard English medical terms): {symptom_text}\n"
        f"Urgency level: {urgency_level}\n"
        f"Suggested specialty to mention naturally in the reply (ONLY if the user's question is about symptoms/health, NOT if it's a platform/product usage question): {specialty}\n"
        f"Reason for specialty suggestion: {specialty_reason}\n"
        f"Red flag summary: {red_flag_summary}\n\n"
        "Possible related conditions from local ranking. These are only possibilities and must not be presented as confirmed diagnoses:\n"
        f"{_format_diseases(disease_candidates[:5])}\n\n"
        "Medication context. Mention only as general information and include warnings when relevant:\n"
        f"{_format_drugs(medication_matches[:4])}\n\n"
        "Retrieved RAG context (platform/product documentation and/or medical knowledge base):\n"
        f"{rag_block}\n\n"
        "If the user message is about using the Medora platform (appointments, accounts, orders, prescriptions, pharmacy), answer ONLY using the facts in the Retrieved RAG context above — exact steps, button names, statuses, and limitations. Do not give medical self-care advice in that case. "
        "If the user message is about symptoms or health, write a natural reply to the patient: conversational, reassuring, medically careful, and practically helpful. Give useful immediate steps first, then safe treatment ideas if appropriate, and only after that mention when to seek doctor or emergency care."
    )
