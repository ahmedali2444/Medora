"""Input sanitization and validation helpers."""

from __future__ import annotations

import base64
import re
import unicodedata

# Strip control characters (except common whitespace) that have no business in
# a chat message and could be used to confuse logs or downstream prompts.
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")
_DATA_URL_PREFIX = re.compile(r"^data:image/[a-zA-Z0-9.+-]+;base64,", re.IGNORECASE)


def sanitize_message(text: str, *, max_length: int) -> str:
    """Normalize, trim, and bound a user message.

    Returns the cleaned message. Raises ``ValueError`` for empty input. Length
    is enforced by truncation after stripping so the model never receives an
    oversized prompt even if validation upstream is bypassed.
    """

    if text is None:
        raise ValueError("Message is required.")
    normalized = unicodedata.normalize("NFKC", str(text))
    cleaned = _CONTROL_CHARS.sub("", normalized).strip()
    if not cleaned:
        raise ValueError("Message must not be empty.")
    if len(cleaned) > max_length:
        cleaned = cleaned[:max_length].rstrip()
    return cleaned


def validate_attached_image(data_url: str | None, *, max_bytes: int) -> str | None:
    """Validate an optional base64 data-URL image. Returns it unchanged if ok.

    Rejects payloads that are not base64 image data URLs or exceed the size
    limit. Returns ``None`` when no image is attached.
    """

    if not data_url:
        return None
    if not _DATA_URL_PREFIX.match(data_url):
        raise ValueError("Attached image must be a base64 image data URL.")
    b64_body = _DATA_URL_PREFIX.sub("", data_url)
    # Estimate decoded size without fully decoding twice.
    approx_bytes = (len(b64_body) * 3) // 4
    if approx_bytes > max_bytes:
        raise ValueError("Attached image exceeds the maximum allowed size.")
    try:
        base64.b64decode(b64_body, validate=True)
    except Exception as exc:  # noqa: BLE001
        raise ValueError("Attached image is not valid base64.") from exc
    return data_url
