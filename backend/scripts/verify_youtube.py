"""Local verification for YouTube integration (no HTTP auth required)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.data.exercise_templates import get_template
from app.schemas import ExerciseItem, RecipeItem, YouTubePlaylistItem
from app.services.youtube_search import (
    enrich_items_with_videos,
    is_youtube_configured,
    search_playlists,
    search_video,
)


def check(name: str, ok: bool, detail: str = ""):
    status = "PASS" if ok else "FAIL"
    msg = f"{status}: {name}"
    if detail:
        msg += f" — {detail}"
    print(msg)
    return ok


def main() -> int:
    ok = True

    if is_youtube_configured():
        check("YT_KEY configured", True)
    else:
        print("SKIP: YT_KEY not in backend/.env (live API tests skipped — key is on Render)")

    template = get_template("back")
    ok &= check("back template exists", template is not None)
    if template:
        exercises = template.get("exercises", [])
        with_video = [e for e in exercises if e.get("youtube_video_id")]
        ok &= check(
            "template exercises have video IDs",
            len(with_video) == len(exercises) and len(exercises) > 0,
            f"{len(with_video)}/{len(exercises)}",
        )
        ok &= check(
            "ExerciseItem schema accepts template row",
            bool(ExerciseItem(**exercises[0]).youtube_video_id),
            exercises[0].get("youtube_video_id", ""),
        )

    enriched = enrich_items_with_videos(
        [{"name": "Bench Press", "youtube_search_query": "proper bench press form tutorial", "sets": 3}],
        kind="exercise",
    )
    ok &= check(
        "enrich strips youtube_search_query",
        "youtube_search_query" not in enriched[0],
    )
    if is_youtube_configured():
        ok &= check(
            "enrich resolves AI search query",
            bool(enriched[0].get("youtube_video_id")),
            enriched[0].get("youtube_video_id", "none"),
        )
        meta = search_video("proper squat form tutorial", kind="exercise")
        ok &= check(
            "search_video returns metadata",
            bool(meta and meta.get("video_id") and meta.get("thumbnail_url")),
            meta.get("video_id", "") if meta else "no result",
        )
        playlists = search_playlists("gym workout playlist", max_results=3)
        ok &= check(
            "search_playlists returns items",
            len(playlists) > 0,
            f"{len(playlists)} playlists",
        )
        if playlists:
            ok &= check(
                "playlist schema valid",
                bool(YouTubePlaylistItem(**playlists[0]).id),
                playlists[0].get("title", ""),
            )
    else:
        print("SKIP: live YouTube API tests (no YT_KEY locally — OK if key is on Render only)")

    recipe = RecipeItem(
        name="Test",
        description="d",
        calories=400,
        protein_g=30,
        prep_time_min=15,
        ingredients=["a"],
        instructions=["b"],
        tags=["t"],
        youtube_video_title="Demo",
        youtube_thumbnail_url="https://i.ytimg.com/vi/test/hqdefault.jpg",
    )
    ok &= check("RecipeItem video metadata fields", recipe.youtube_video_title == "Demo")

    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main())