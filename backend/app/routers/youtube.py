from fastapi import APIRouter, Depends, HTTPException, Query

from ..deps import get_user_profile
from ..models import User
from ..schemas import YouTubePlaylistItem, YouTubePlaylistSearchResponse
from ..services.youtube_search import is_youtube_configured, search_playlists

router = APIRouter(prefix="/api/youtube", tags=["youtube"])


@router.get("/playlists", response_model=YouTubePlaylistSearchResponse)
def get_workout_playlists(
    q: str = Query("gym workout playlist", min_length=2, max_length=120),
    max_results: int = Query(10, ge=1, le=25),
    user: User = Depends(get_user_profile),
):
    del user  # auth gate only
    if not is_youtube_configured():
        raise HTTPException(
            status_code=503,
            detail="YouTube API is not configured. Set YT_KEY on the server.",
        )

    items = search_playlists(q, max_results=max_results)
    return YouTubePlaylistSearchResponse(
        query=q,
        items=[YouTubePlaylistItem(**item) for item in items],
        youtube_enabled=True,
    )