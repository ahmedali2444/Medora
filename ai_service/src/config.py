import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


@dataclass(frozen=True)
class AppConfig:
    base_dir: Path
    data_dir: Path
    cache_dir: Path
    openai_api_key: str
    openai_chat_model: str
    openai_vision_model: str
    rag_top_k: int
    rag_min_score: float
    history_window_messages: int

    @property
    def chat_store_path(self) -> Path:
        return self.base_dir / "chats.json"


def _safe_int(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return int(raw.strip())
    except (TypeError, ValueError):
        return default


def _safe_float(name: str, default: float) -> float:
    raw = os.getenv(name)
    if raw is None:
        return default
    try:
        return float(raw.strip())
    except (TypeError, ValueError):
        return default


def load_config() -> AppConfig:
    base_dir = Path(__file__).resolve().parents[1]
    cache_dir = base_dir / ".cache"
    cache_dir.mkdir(parents=True, exist_ok=True)
    return AppConfig(
        base_dir=base_dir,
        data_dir=base_dir / "data",
        cache_dir=cache_dir,
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_chat_model=os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini").strip(),
        # Reading a medicine box/strip needs a strong vision model. gpt-4o-mini
        # downsamples and tends to "guess" a well-known brand (e.g. Congestal ->
        # Panadol Extra), so OCR uses a capable vision model independently of the
        # cheaper chat model.
        openai_vision_model=(
            os.getenv("OPENAI_VISION_MODEL", "").strip() or "gpt-4o"
        ),
        rag_top_k=_safe_int("RAG_TOP_K", 3),
        rag_min_score=_safe_float("RAG_MIN_SCORE", 1.0),
        history_window_messages=_safe_int("HISTORY_WINDOW_MESSAGES", 10),
    )
