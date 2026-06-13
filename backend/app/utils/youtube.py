"""Normalize YouTube video IDs from AI output (ID or URL)."""

import re
from typing import Optional

_ID_RE = re.compile(r"^[a-zA-Z0-9_-]{11}$")
_URL_PATTERNS = (
    re.compile(r"(?:youtube\.com/watch\?.*v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})"),
    re.compile(r"youtube\.com/shorts/([a-zA-Z0-9_-]{11})"),
)


def normalize_youtube_video_id(value: Optional[str]) -> Optional[str]:
    if not value:
        return None
    text = str(value).strip()
    if not text:
        return None
    if _ID_RE.match(text):
        return text
    for pattern in _URL_PATTERNS:
        match = pattern.search(text)
        if match:
            return match.group(1)
    return None