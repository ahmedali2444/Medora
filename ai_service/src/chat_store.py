from __future__ import annotations

import json
import threading
from copy import deepcopy
from pathlib import Path
from typing import Any


class ChatStore:
    def __init__(self, path: str | Path) -> None:
        self.path = Path(path)
        self._lock = threading.Lock()
        self._chats: dict[str, dict[str, Any]] = self._load()

    def _load(self) -> dict[str, dict[str, Any]]:
        if not self.path.exists():
            return {}
        try:
            data = json.loads(self.path.read_text(encoding="utf-8"))
        except (OSError, json.JSONDecodeError):
            return {}
        if not isinstance(data, dict):
            return {}
        return {
            str(chat_id): chat
            for chat_id, chat in data.items()
            if isinstance(chat, dict)
        }

    def _persist_locked(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        temp_path = self.path.with_suffix(f"{self.path.suffix}.tmp")
        temp_path.write_text(
            json.dumps(self._chats, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        temp_path.replace(self.path)

    def get_chat(self, conversation_id: str) -> dict[str, Any] | None:
        with self._lock:
            chat = self._chats.get(conversation_id)
            if not chat:
                return None
            copied = deepcopy(chat)
            copied["id"] = conversation_id
            return copied

    def save_chat(self, chat: dict[str, Any]) -> None:
        conversation_id = str(chat.get("id", "")).strip()
        if not conversation_id:
            raise ValueError("Chat id is required.")
        stored = deepcopy(chat)
        stored.pop("id", None)
        with self._lock:
            self._chats[conversation_id] = stored
            self._persist_locked()

    def delete_chat(self, conversation_id: str) -> None:
        with self._lock:
            if conversation_id in self._chats:
                del self._chats[conversation_id]
                self._persist_locked()
