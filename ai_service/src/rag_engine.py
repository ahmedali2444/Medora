from typing import Any

import pandas as pd

from src.config import AppConfig
from src.data_loader import MedicalDataStore, normalize_text


class RAGEngine:
    def __init__(
        self,
        config: AppConfig,
        data_store: MedicalDataStore,
    ) -> None:
        self.config = config
        self.data_store = data_store
        self.rag_frame = data_store.get_rag_records()
        self.lexical_records = self._build_lexical_records()

    def retrieve(self, query: str, top_k: int | None = None) -> list[dict[str, Any]]:
        top_k = top_k or self.config.rag_top_k
        return self._lexical_search(query, top_k)

    def _lexical_search(self, query: str, top_k: int) -> list[dict[str, Any]]:
        query_terms = set(normalize_text(query).split())
        if not query_terms:
            return []
        scored_rows: list[tuple[float, dict[str, Any]]] = []
        normalized_query = normalize_text(query)
        for record in self.lexical_records:
            overlap = len(query_terms & record["terms"])
            if overlap == 0:
                continue
            bonus = 0.15 if record["title_normalized"] and record["title_normalized"] in normalized_query else 0.0
            scored_rows.append((overlap + bonus, record["row"]))

        scored_rows.sort(key=lambda item: item[0], reverse=True)
        min_score = self.config.rag_min_score
        filtered = [(score, row) for score, row in scored_rows if score >= min_score]
        return [self._row_to_result(row, score) for score, row in filtered[:top_k]]

    def _build_lexical_records(self) -> list[dict[str, Any]]:
        records: list[dict[str, Any]] = []
        for _, row in self.rag_frame.iterrows():
            haystack = " ".join(
                str(row.get(column, ""))
                for column in ["text", "title", "category", "entity_type", "source"]
            )
            records.append(
                {
                    "row": row,
                    "terms": set(normalize_text(haystack).split()),
                    "title_normalized": normalize_text(str(row.get("title", ""))),
                }
            )
        return records

    @staticmethod
    def _row_to_result(row: pd.Series, score: float) -> dict[str, Any]:
        entity_type = str(row.get("entity_type", "")).strip()
        title = str(row.get("title", "")).strip()
        return {
            "chunk_id": str(row.get("chunk_id", "")).strip(),
            "text": str(row.get("text", "")).strip(),
            "source": str(row.get("source", "")).strip(),
            "category": str(row.get("category", "")).strip(),
            "language": str(row.get("language", "")).strip(),
            "entity_type": entity_type,
            "entity_id": str(row.get("entity_id", "")).strip(),
            "title": title,
            "disease": title if entity_type == "disease" else "",
            "drug": title if entity_type == "drug" else "",
            "specialty": "",
            "score": score,
        }
