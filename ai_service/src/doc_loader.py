"""
src/doc_loader.py

Loader for bilingual "feature block" knowledge-base documents (e.g. AI-Doc.txt),
as a SECOND knowledge source alongside the existing CSV-based MedicalDataStore.

WHY A SEPARATE LOADER:
The CSV files in data/ (diseases.csv, drugs.csv, symptoms_mapping.csv, ...) are
tabular and row-based. AI-Doc.txt is a different shape entirely: it's a long
bilingual (AR/EN) manual made of self-contained "Feature Name: ..." and
"Problem: ..." blocks, each with its own description, steps, and ready-made
AI answers. Treating it like a CSV row or chunking it by raw character count
would cut answers in half mid-sentence. So this loader parses the document by
its own structure (the headers it already uses) and produces one chunk per
feature/problem block, exactly the way the file's own section 9 recommends.

ASSUMPTIONS (adjust to match your actual project — see inline notes):
    - You're using LangChain-style Document objects (langchain_core.documents.Document)
      with .page_content and .metadata, since RAGEngine likely expects that shape
      for whatever vectorstore/embedding step it runs. If your RAGEngine instead
      expects plain dicts or strings, see `to_dicts()` / `to_plain_texts()` below.
    - The file is UTF-8 (it has a BOM based on the leading character in line 1;
      utf-8-sig handles that safely).
    - "Chunking" here means one block = one chunk. Some blocks (e.g. the big
      role table in section 1, or the appointment status table in section 2)
      are a few hundred words — still fine for most embedding models. If you
      want them split further, see MAX_CHARS below for an optional sub-split.
"""

from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from pathlib import Path

logger = logging.getLogger(__name__)

# If a block is longer than this, it gets soft-split into sub-chunks on blank
# lines (paragraph boundaries) so no single chunk overwhelms the embedding
# model's context. Set to None to disable and keep one chunk per block always.
MAX_CHARS: int | None = 1800

# Matches the two header styles actually used in the doc:
#   "Feature Name: Book a Doctor Appointment / حجز موعد طبيب"
#   "Problem: Cannot sign in / لا أستطيع تسجيل الدخول"
_BLOCK_HEADER_RE = re.compile(
    r"^(Feature Name|Problem):\s*(.+?)\s*/\s*(.+?)\s*$",
    re.MULTILINE,
)

# Matches numbered top-level sections, e.g. "2. Patient Documentation / دليل المريض"
_SECTION_HEADER_RE = re.compile(
    r"^(\d+)\.\s+(.+?)\s*/\s*(.+?)\s*$",
    re.MULTILINE,
)


@dataclass
class DocChunk:
    """One self-contained chunk ready to be embedded and stored."""

    chunk_id: str
    title_en: str
    title_ar: str
    section_number: str | None
    section_title_en: str | None
    block_type: str  # "feature" or "problem"
    text: str  # full bilingual block text, fed to the embedding model as-is
    source: str = "AI-Doc.txt"

    def to_metadata(self) -> dict:
        """Metadata dict, mirroring the schema the doc itself proposes in section 9."""
        return {
            "id": self.chunk_id,
            "title_en": self.title_en,
            "title_ar": self.title_ar,
            "section_number": self.section_number,
            "section_title_en": self.section_title_en,
            "block_type": self.block_type,
            "source": self.source,
            "answer_language": "ar+en",
            "source_of_truth": "frontend_and_backend_current_implementation",
            "safety_tags": ["health-platform", "not-medical-advice"],
        }


def _slugify(text: str) -> str:
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9]+", "_", text)
    return text.strip("_") or "block"


def _find_section_for_offset(
    offset: int, section_positions: list[tuple[int, str, str, str]]
) -> tuple[str, str] | tuple[None, None]:
    """Given a character offset, find which numbered section (if any) it falls under."""
    current = (None, None)
    for pos, number, title_en, _title_ar in section_positions:
        if pos <= offset:
            current = (number, title_en)
        else:
            break
    return current


def parse_ai_doc(raw_text: str) -> list[DocChunk]:
    """
    Parse the raw AI-Doc.txt content into a list of DocChunk objects.

    Splits the document on every "Feature Name: ... / ..." or "Problem: ... / ..."
    header. Each chunk runs from one header up to (but not including) the next
    header of either kind, or end of file. This naturally captures the
    Description, Steps, Examples, and ready-made AI Answer that belong to that
    block, since they all live between one header and the next in the source file.
    """
    matches = list(_BLOCK_HEADER_RE.finditer(raw_text))
    if not matches:
        logger.warning("doc_loader: no 'Feature Name:' / 'Problem:' headers found; "
                        "is this the expected AI-Doc.txt format?")
        return []

    section_positions = [
        (m.start(), m.group(1), m.group(2).strip(), m.group(3).strip())
        for m in _SECTION_HEADER_RE.finditer(raw_text)
    ]

    chunks: list[DocChunk] = []
    seen_ids: set[str] = set()

    for i, match in enumerate(matches):
        block_type = "feature" if match.group(1) == "Feature Name" else "problem"
        title_en = match.group(2).strip()
        title_ar = match.group(3).strip()

        start = match.start()
        end = matches[i + 1].start() if i + 1 < len(matches) else len(raw_text)
        block_text = raw_text[start:end].strip()

        section_number, section_title_en = _find_section_for_offset(start, section_positions)

        base_id = f"{block_type}.{_slugify(title_en)}"
        chunk_id = base_id
        suffix = 2
        while chunk_id in seen_ids:
            chunk_id = f"{base_id}_{suffix}"
            suffix += 1
        seen_ids.add(chunk_id)

        sub_texts = _soft_split(block_text, MAX_CHARS) if MAX_CHARS else [block_text]

        for part_idx, part_text in enumerate(sub_texts):
            part_id = chunk_id if len(sub_texts) == 1 else f"{chunk_id}.part{part_idx + 1}"
            chunks.append(
                DocChunk(
                    chunk_id=part_id,
                    title_en=title_en,
                    title_ar=title_ar,
                    section_number=section_number,
                    section_title_en=section_title_en,
                    block_type=block_type,
                    text=part_text,
                )
            )

    logger.info("doc_loader: parsed %d chunks from AI-Doc.txt (%d source blocks)",
                len(chunks), len(matches))
    return chunks


def _soft_split(text: str, max_chars: int) -> list[str]:
    """
    If a block is longer than max_chars, split it on blank-line paragraph
    boundaries (never mid-sentence) and group paragraphs back together up to
    the limit. Keeps the header line attached to the first part only —
    later parts repeat the title in metadata, not in text, which is fine
    since metadata travels with the chunk into the vectorstore.
    """
    if len(text) <= max_chars:
        return [text]

    paragraphs = re.split(r"\n\s*\n", text)
    parts: list[str] = []
    current: list[str] = []
    current_len = 0

    for para in paragraphs:
        para_len = len(para) + 2
        if current and current_len + para_len > max_chars:
            parts.append("\n\n".join(current))
            current = [para]
            current_len = para_len
        else:
            current.append(para)
            current_len += para_len

    if current:
        parts.append("\n\n".join(current))

    return parts or [text]


def load_ai_doc_chunks(path: str | Path) -> list[DocChunk]:
    """Read the file from disk and parse it. Main entry point for most callers."""
    path = Path(path)
    raw_text = path.read_text(encoding="utf-8-sig")
    return parse_ai_doc(raw_text)


# ---------------------------------------------------------------------------
# Adapter: convert DocChunk -> a pandas DataFrame matching the exact schema
# RAGEngine._build_lexical_records() / ._row_to_result() expect, since that's
# the real shape confirmed from src/rag_engine.py:
#   text, title, category, entity_type, source, language, chunk_id, entity_id
# RAGEngine builds self.rag_frame ONCE in __init__ from data_store.get_rag_records().
# There is no "add_documents later" hook, so the right integration point is
# data_store.get_rag_records() itself — make it return AI-Doc rows appended
# to the CSV-derived rows, BEFORE RAGEngine is constructed.
# ---------------------------------------------------------------------------

def to_rag_dataframe(chunks: list[DocChunk]):
    """
    Convert chunks into a DataFrame with the exact columns RAGEngine expects.
    Pass this into MedicalDataStore.get_rag_records() (see data_loader.py patch).
    """
    import pandas as pd

    rows = []
    for chunk in chunks:
        rows.append(
            {
                "chunk_id": chunk.chunk_id,
                "text": chunk.text,
                "title": chunk.title_en,  # English title used for the title-match bonus
                "category": chunk.section_title_en or "",
                "entity_type": "platform_doc",  # distinct from "disease" / "drug" rows
                "entity_id": chunk.chunk_id,
                "source": chunk.source,
                "language": "ar+en",
            }
        )
    return pd.DataFrame(rows)


if __name__ == "__main__":
    # Quick manual check: run `python src/doc_loader.py path/to/AI-Doc.txt`
    import sys

    logging.basicConfig(level=logging.INFO)
    doc_path = sys.argv[1] if len(sys.argv) > 1 else "AI-Doc.txt"
    result = load_ai_doc_chunks(doc_path)
    print(f"Parsed {len(result)} chunks.\n")
    for c in result[:3]:
        print("-" * 60)
        print(f"id: {c.chunk_id}")
        print(f"title_en: {c.title_en} | title_ar: {c.title_ar}")
        print(f"section: {c.section_number} {c.section_title_en}")
        print(f"chars: {len(c.text)}")
        print(c.text[:300].replace("\n", " "), "...")

    print("\n" + "=" * 60)
    df = to_rag_dataframe(result)
    print(f"DataFrame shape: {df.shape}")
    print(df[["chunk_id", "title", "entity_type", "category"]].head())