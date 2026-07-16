from src.data_loader import MedicalDataStore, normalize_text


CRITICAL_PHRASE_ALIASES = {
    "مش قادر اتنفس": "Shortness Of Breath",
    "مش قادر أتنفس": "Shortness Of Breath",
    "ضيق تنفس": "Shortness Of Breath",
    "difficulty breathing": "Shortness Of Breath",
    "chest pain": "Chest Pain",
    "الم شديد في الصدر": "Chest Pain",
    "ألم شديد في الصدر": "Chest Pain",
    "loss of consciousness": "Fainting",
    "فقدان الوعي": "Fainting",
    "اغماء": "Fainting",
    "إغماء": "Fainting",
    "severe bleeding": "Severe Bleeding",
    "نزيف شديد": "Severe Bleeding",
    "stroke": "Paralysis",
    "شلل": "Paralysis",
    "تورم في الحلق": "Throat Swelling",
    "severe allergic reaction": "Throat Swelling",
}

EMERGENCY_SYMPTOMS = {
    normalize_text("Chest Pain"),
    normalize_text("Shortness Of Breath"),
    normalize_text("Vomiting Blood"),
    normalize_text("Fainting"),
    normalize_text("Paralysis"),
    normalize_text("Focal Weakness"),
    normalize_text("Seizures"),
    normalize_text("Throat Swelling"),
    normalize_text("Severe Bleeding"),
}


class SafetyChecker:
    def __init__(self, data_store: MedicalDataStore) -> None:
        self.data_store = data_store

    def check(self, user_message: str, symptoms: list[str]) -> dict[str, object]:
        normalized_text = normalize_text(user_message)
        matched: list[dict[str, str]] = []
        seen: set[str] = set()

        for symptom in symptoms:
            key = normalize_text(symptom)
            red_flag = self.data_store.red_flag_lookup.get(key)
            if red_flag and key not in seen:
                matched.append(red_flag)
                seen.add(key)

        for phrase, canonical in CRITICAL_PHRASE_ALIASES.items():
            if normalize_text(phrase) in normalized_text:
                key = normalize_text(canonical)
                red_flag = self.data_store.red_flag_lookup.get(key, {
                    "symptom": canonical,
                    "action": "Seek emergency care immediately.",
                    "urgency_level": "high",
                })
                if key not in seen:
                    matched.append(red_flag)
                    seen.add(key)

        urgency = "low"
        if matched:
            urgency = "medium"
            if any(item["urgency_level"] == "high" for item in matched):
                urgency = "high"
            if any(normalize_text(item["symptom"]) in EMERGENCY_SYMPTOMS for item in matched):
                urgency = "emergency"

        return {
            "has_red_flag": bool(matched),
            "matched_red_flags": matched,
            "urgency_level": urgency,
        }
