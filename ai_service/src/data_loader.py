from __future__ import annotations

import ast
import json
import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import pandas as pd


_WORD_CHARS = re.compile(r"[^\w\u0600-\u06ff]+", re.UNICODE)
_WHITESPACE = re.compile(r"\s+")
_ARABIC_DIACRITICS = re.compile(r"[\u064b-\u065f\u0670]")


def normalize_text(text: object) -> str:
    value = unicodedata.normalize("NFKC", str(text or "")).lower()
    value = _ARABIC_DIACRITICS.sub("", value)
    value = value.replace("أ", "ا").replace("إ", "ا").replace("آ", "ا")
    value = value.replace("ى", "ي").replace("ة", "ه")
    value = _WORD_CHARS.sub(" ", value)
    return _WHITESPACE.sub(" ", value).strip()


def _is_empty(value: object) -> bool:
    if value is None:
        return True
    if isinstance(value, float) and pd.isna(value):
        return True
    return str(value).strip().lower() in {"", "nan", "none", "null"}


def _safe_list(value: object) -> list[str]:
    if _is_empty(value):
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    raw = str(value).strip()
    for parser in (json.loads, ast.literal_eval):
        try:
            parsed = parser(raw)
        except Exception:
            continue
        if isinstance(parsed, list):
            return [str(item).strip() for item in parsed if str(item).strip()]
        if isinstance(parsed, str) and parsed.strip():
            return [parsed.strip()]
    return [raw]


def _read_csv(path: Path) -> pd.DataFrame:
    if not path.exists():
        return pd.DataFrame()
    return pd.read_csv(path)


@dataclass(frozen=True)
class DiseaseCandidate:
    disease_id: str
    disease_name: str
    score: float
    urgency_level: str = "low"
    description: str = ""


@dataclass(frozen=True)
class DrugRecord:
    drug_id: str
    drug_name: str
    uses: list[str] = field(default_factory=list)
    side_effects: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)
    rx_otc_status: str = ""
    generic_name: str = ""
    therapeutic_class: str = ""
    action_class: str = ""
    contraindications: list[dict[str, str]] = field(default_factory=list)


class MedicalDataStore:
    def __init__(self, data_dir: str | Path) -> None:
        self.data_dir = Path(data_dir)
        self.symptoms = _read_csv(self.data_dir / "symptoms_mapping.csv")
        self.diseases = _read_csv(self.data_dir / "diseases.csv")
        self.drugs = _read_csv(self.data_dir / "drugs.csv")
        self.disease_symptoms = _read_csv(self.data_dir / "disease_symptoms.csv")
        self.disease_drugs = _read_csv(self.data_dir / "disease_drugs.csv")
        self.contraindications = _read_csv(self.data_dir / "contraindications.csv")
        self.red_flags = _read_csv(self.data_dir / "red_flag_symptoms.csv")
        self.arabic_symptoms = _read_csv(self.data_dir / "arabic_symptom_mappings.csv")
        self.rag_chunks = _read_csv(self.data_dir / "rag_chunks.csv")

        self._symptom_aliases: dict[str, str] = {}
        self._symptom_ids_by_name: dict[str, str] = {}
        self._drug_records_by_id: dict[str, DrugRecord] = {}
        self._drug_aliases: list[tuple[str, str]] = []

        self._build_symptom_indexes()
        self._build_drug_indexes()
        self.red_flag_lookup = self._build_red_flag_lookup()

    def _build_symptom_indexes(self) -> None:
        if not self.symptoms.empty:
            for row in self.symptoms.to_dict("records"):
                symptom_id = str(row.get("symptom_id", "")).strip()
                symptom_name = str(row.get("symptom_name", "")).strip()
                if not symptom_id or not symptom_name:
                    continue
                canonical = symptom_name.title()
                self._symptom_ids_by_name[normalize_text(canonical)] = symptom_id
                for alias in [symptom_name, *_safe_list(row.get("synonyms"))]:
                    normalized = normalize_text(alias)
                    if normalized:
                        self._symptom_aliases[normalized] = canonical

        if not self.arabic_symptoms.empty:
            for row in self.arabic_symptoms.to_dict("records"):
                canonical = str(row.get("canonical_symptom_name", "")).strip()
                alias = str(row.get("input_term", "")).strip()
                if canonical and alias:
                    self._symptom_aliases[normalize_text(alias)] = canonical
                    self._symptom_ids_by_name.setdefault(normalize_text(canonical), "")

        self._symptom_alias_items = sorted(
            self._symptom_aliases.items(),
            key=lambda item: len(item[0]),
            reverse=True,
        )

    def _build_drug_indexes(self) -> None:
        contraindications_by_drug: dict[str, list[dict[str, str]]] = {}
        if not self.contraindications.empty:
            for row in self.contraindications.to_dict("records"):
                drug_id = str(row.get("drug_id", "")).strip()
                if not drug_id:
                    continue
                contraindications_by_drug.setdefault(drug_id, []).append(
                    {
                        "condition": str(row.get("condition", "") or "").strip(),
                        "reason": str(row.get("reason", "") or "").strip(),
                    }
                )

        if self.drugs.empty:
            return

        for row in self.drugs.to_dict("records"):
            drug_id = str(row.get("drug_id", "")).strip()
            drug_name = str(row.get("drug_name", "") or "").strip()
            if not drug_id or not drug_name:
                continue

            record = DrugRecord(
                drug_id=drug_id,
                drug_name=drug_name,
                uses=_safe_list(row.get("uses")),
                side_effects=_safe_list(row.get("side_effects")),
                warnings=_safe_list(row.get("warnings")),
                rx_otc_status=str(row.get("rx_otc_status", "") or "").strip(),
                generic_name=str(row.get("generic_name", "") or "").strip(),
                therapeutic_class=str(row.get("therapeutic_class", "") or "").strip(),
                action_class=str(row.get("action_class", "") or "").strip(),
                contraindications=contraindications_by_drug.get(drug_id, []),
            )
            self._drug_records_by_id[drug_id] = record

            for alias in (record.drug_name, record.generic_name):
                normalized = normalize_text(alias)
                if len(normalized) >= 3:
                    self._drug_aliases.append((normalized, drug_id))

        self._drug_aliases.sort(key=lambda item: len(item[0]), reverse=True)

    def _build_red_flag_lookup(self) -> dict[str, dict[str, str]]:
        lookup: dict[str, dict[str, str]] = {}
        if self.red_flags.empty:
            return lookup
        for row in self.red_flags.to_dict("records"):
            symptom = str(row.get("symptom", "") or "").strip()
            if not symptom:
                continue
            lookup[normalize_text(symptom)] = {
                "symptom": symptom,
                "action": str(row.get("action", "") or "").strip(),
                "urgency_level": str(row.get("urgency_level", "") or "medium").strip(),
            }
        return lookup

    @staticmethod
    def _contains_term(normalized_text: str, normalized_term: str) -> bool:
        if not normalized_text or not normalized_term:
            return False
        pattern = rf"(?<!\w){re.escape(normalized_term)}(?!\w)"
        return re.search(pattern, normalized_text, flags=re.UNICODE) is not None

    def symptom_matches_from_text(self, text: str) -> list[str]:
        normalized = normalize_text(text)
        matches: list[str] = []
        seen: set[str] = set()
        for alias, canonical in self._symptom_alias_items:
            if canonical in seen:
                continue
            if self._contains_term(normalized, alias):
                matches.append(canonical)
                seen.add(canonical)
        return matches

    def score_possible_diseases(self, symptoms: list[str], limit: int = 5) -> list[DiseaseCandidate]:
        symptom_ids = {
            self._symptom_ids_by_name.get(normalize_text(symptom))
            for symptom in symptoms
        }
        symptom_ids.discard(None)
        symptom_ids.discard("")
        if not symptom_ids or self.disease_symptoms.empty or self.diseases.empty:
            return []

        rows = self.disease_symptoms[self.disease_symptoms["symptom_id"].isin(symptom_ids)].copy()
        if rows.empty:
            return []
        rows["weight"] = pd.to_numeric(rows.get("weight", 1), errors="coerce").fillna(1)
        rows["confidence_score"] = pd.to_numeric(rows.get("confidence_score", 1), errors="coerce").fillna(1)
        rows["score"] = rows["weight"] * rows["confidence_score"]
        scores = rows.groupby("disease_id")["score"].sum().sort_values(ascending=False).head(limit)

        disease_rows = self.diseases.set_index("disease_id", drop=False)
        candidates: list[DiseaseCandidate] = []
        for disease_id, score in scores.items():
            if disease_id not in disease_rows.index:
                continue
            row = disease_rows.loc[disease_id]
            candidates.append(
                DiseaseCandidate(
                    disease_id=str(disease_id),
                    disease_name=str(row.get("disease_name", "") or "").strip(),
                    score=float(score),
                    urgency_level=str(row.get("urgency_level", "") or "low").strip(),
                    description=str(row.get("description", "") or "").strip(),
                )
            )
        return candidates

    def _drug_records(self, drug_ids: list[str], limit: int) -> list[DrugRecord]:
        records: list[DrugRecord] = []
        seen: set[str] = set()
        for drug_id in drug_ids:
            if drug_id in seen:
                continue
            record = self._drug_records_by_id.get(drug_id)
            if record:
                records.append(record)
                seen.add(drug_id)
            if len(records) >= limit:
                break
        return records

    def find_drug_mentions(self, text: str, limit: int = 5) -> list[DrugRecord]:
        normalized = normalize_text(text)
        matched_ids: list[str] = []
        seen: set[str] = set()
        for alias, drug_id in self._drug_aliases:
            if drug_id in seen:
                continue
            if self._contains_term(normalized, alias):
                matched_ids.append(drug_id)
                seen.add(drug_id)
            if len(matched_ids) >= limit:
                break
        return self._drug_records(matched_ids, limit)

    def get_related_drugs(self, disease_ids: list[str], limit: int = 4) -> list[DrugRecord]:
        if self.disease_drugs.empty:
            return []
        rows = self.disease_drugs[self.disease_drugs["disease_id"].isin(disease_ids)]
        return self._drug_records([str(value) for value in rows["drug_id"].tolist()], limit)

    def get_rag_records(self) -> pd.DataFrame:
        frames: list[pd.DataFrame] = []
        if not self.rag_chunks.empty:
            rows: list[dict[str, Any]] = []
            for index, row in self.rag_chunks.iterrows():
                entity_type = str(row.get("entity_type", row.get("type", "")) or "").strip()
                rows.append(
                    {
                        "chunk_id": str(row.get("chunk_id", f"rag_{index}")),
                        "text": str(row.get("text", "") or ""),
                        "source": str(row.get("source", "rag_chunks.csv") or "rag_chunks.csv"),
                        "category": str(row.get("category", entity_type) or ""),
                        "language": str(row.get("language", "") or ""),
                        "entity_type": entity_type,
                        "entity_id": str(row.get("entity_id", "") or ""),
                        "title": str(row.get("title", "") or ""),
                    }
                )
            frames.append(pd.DataFrame(rows))

        ai_doc_path = self.data_dir / "AI-Doc.txt"
        if ai_doc_path.exists():
            from src.doc_loader import load_ai_doc_chunks, to_rag_dataframe

            chunks = load_ai_doc_chunks(ai_doc_path)
            if chunks:
                frames.append(to_rag_dataframe(chunks))

        if not frames:
            return pd.DataFrame(
                columns=[
                    "chunk_id",
                    "text",
                    "source",
                    "category",
                    "language",
                    "entity_type",
                    "entity_id",
                    "title",
                ]
            )
        return pd.concat(frames, ignore_index=True, sort=False).fillna("")
