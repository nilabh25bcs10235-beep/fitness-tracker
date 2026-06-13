"""Resolve YouTube video IDs via YouTube Data API v3 (YT_KEY)."""

import os
from typing import Literal, Optional

import httpx

from app.services.ai_cache import get_cached, set_cached
from app.utils.youtube import normalize_youtube_video_id

YT_KEY = os.getenv("YT_KEY")
_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
_CACHE_TTL = 7 * 86400  # 7 days

ItemKind = Literal["exercise", "recipe"]


def is_youtube_configured() -> bool:
    return bool(YT_KEY and YT_KEY.strip())


def _query_for(name: str, kind: ItemKind) -> str:
    if kind == "exercise":
        return f"{name} exercise proper form tutorial"
    return f"{name} recipe cooking tutorial how to make"


def search_video_id(query: str, *, kind: ItemKind) -> Optional[str]:
    if not is_youtube_configured():
        return None

    payload = {"query": query.strip().lower(), "kind": kind}
    cached = get_cached("yt_search", payload)
    if cached is not None:
        return cached or None

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                _SEARCH_URL,
                params={
                    "part": "snippet",
                    "type": "video",
                    "maxResults": 1,
                    "q": query,
                    "videoEmbeddable": "true",
                    "relevanceLanguage": "en",
                    "safeSearch": "moderate",
                    "key": YT_KEY,
                },
            )
            response.raise_for_status()
            items = response.json().get("items", [])
            video_id = items[0]["id"]["videoId"] if items else None
            set_cached("yt_search", payload, video_id or "", ttl=_CACHE_TTL)
            return video_id
    except Exception:
        return None


def enrich_items_with_videos(items: list[dict], *, kind: ItemKind) -> list[dict]:
    """Attach embeddable YouTube IDs using YT_KEY when available."""
    if not is_youtube_configured():
        return items

    enriched = []
    for item in items:
        row = dict(item)
        name = str(row.get("name", "")).strip()
        if not name:
            enriched.append(row)
            continue

        video_id = search_video_id(_query_for(name, kind), kind=kind)
        if video_id:
            row["youtube_video_id"] = video_id
        else:
            row["youtube_video_id"] = normalize_youtube_video_id(row.get("youtube_video_id"))
        enriched.append(row)
    return enriched