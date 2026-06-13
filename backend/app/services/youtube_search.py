"""YouTube Data API v3 — video & playlist search via YT_KEY."""

import os
from typing import Any, Literal, Optional

import httpx

from app.services.ai_cache import get_cached, set_cached
from app.utils.youtube import normalize_youtube_video_id

YT_KEY = os.getenv("YT_KEY")
_SEARCH_URL = "https://www.googleapis.com/youtube/v3/search"
_CACHE_TTL = 7 * 86400  # 7 days

ItemKind = Literal["exercise", "recipe"]


def is_youtube_configured() -> bool:
    return bool(YT_KEY and YT_KEY.strip())


def _pick_thumbnail(snippet: dict) -> str:
    thumbs = snippet.get("thumbnails") or {}
    for key in ("maxres", "high", "medium", "default"):
        url = thumbs.get(key, {}).get("url")
        if url:
            return url
    return ""


def _query_for(name: str, kind: ItemKind) -> str:
    if kind == "exercise":
        return f"{name} exercise proper form tutorial"
    return f"{name} recipe cooking tutorial how to make"


def _resolve_search_query(row: dict, name: str, kind: ItemKind) -> Optional[str]:
    ai_query = str(row.get("youtube_search_query", "")).strip()
    if ai_query:
        return ai_query
    if name:
        return _query_for(name, kind)
    return None


def search_video(query: str, *, kind: ItemKind) -> Optional[dict[str, str]]:
    if not is_youtube_configured():
        return None

    payload = {"query": query.strip().lower(), "kind": kind, "type": "video"}
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
            if not items:
                set_cached("yt_search", payload, "", ttl=_CACHE_TTL)
                return None

            item = items[0]
            snippet = item.get("snippet") or {}
            result = {
                "video_id": item["id"]["videoId"],
                "title": snippet.get("title", ""),
                "thumbnail_url": _pick_thumbnail(snippet),
            }
            set_cached("yt_search", payload, result, ttl=_CACHE_TTL)
            return result
    except Exception:
        return None


def search_playlists(query: str, *, max_results: int = 10) -> list[dict[str, str]]:
    if not is_youtube_configured():
        return []

    max_results = max(1, min(max_results, 25))
    payload = {"query": query.strip().lower(), "type": "playlist", "max": max_results}
    cached = get_cached("yt_playlist", payload)
    if cached is not None:
        return cached

    try:
        with httpx.Client(timeout=10.0) as client:
            response = client.get(
                _SEARCH_URL,
                params={
                    "part": "snippet",
                    "type": "playlist",
                    "maxResults": max_results,
                    "q": query,
                    "relevanceLanguage": "en",
                    "safeSearch": "moderate",
                    "key": YT_KEY,
                },
            )
            response.raise_for_status()
            items = response.json().get("items", [])
            playlists = []
            for item in items:
                snippet = item.get("snippet") or {}
                playlist_id = item.get("id", {}).get("playlistId")
                if not playlist_id:
                    continue
                playlists.append({
                    "id": playlist_id,
                    "title": snippet.get("title", "Playlist"),
                    "thumbnail_url": _pick_thumbnail(snippet),
                    "channel": snippet.get("channelTitle", ""),
                })
            set_cached("yt_playlist", payload, playlists, ttl=_CACHE_TTL)
            return playlists
    except Exception:
        return []


def enrich_items_with_videos(items: list[dict], *, kind: ItemKind) -> list[dict]:
    """Resolve embeddable videos using AI search queries + YT_KEY."""
    enriched = []
    for item in items:
        row = dict(item)
        name = str(row.get("name", "")).strip()
        query = _resolve_search_query(row, name, kind)

        if is_youtube_configured() and query:
            meta = search_video(query, kind=kind)
            if meta:
                row["youtube_video_id"] = meta["video_id"]
                row["youtube_video_title"] = meta["title"]
                row["youtube_thumbnail_url"] = meta["thumbnail_url"]
            else:
                row["youtube_video_id"] = normalize_youtube_video_id(row.get("youtube_video_id"))
        elif not row.get("youtube_video_id"):
            row["youtube_video_id"] = normalize_youtube_video_id(row.get("youtube_video_id"))

        row.pop("youtube_search_query", None)
        enriched.append(row)
    return enriched