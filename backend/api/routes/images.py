# Image proxy route for caching and serving cover images
# Always prefers AniList covers over MangaDex covers

import logging
from pathlib import Path
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, Response

from backend.database.connection import get_db
from backend.services.anilist.client import anilist_client
from backend.services.mangadex.client import mangadex_client

logger = logging.getLogger(__name__)

router = APIRouter()

CACHE_DIR = Path("/tmp/manhwa-covers")
CACHE_DIR.mkdir(parents=True, exist_ok=True)

CACHE_HEADERS = {"Cache-Control": "public, max-age=86400, immutable"}


async def _resolve_cover_url(source: str, item_id: str) -> Optional[str]:
    """Resolve cover URL, always preferring AniList."""
    if source == "anilist":
        details = await anilist_client.get_manga_details(int(item_id))
        if details:
            cover = details.get("coverImage", {})
            return cover.get("extraLarge") or cover.get("large")

    elif source == "mangadex":
        # Try to find an AniList cover via existing connections
        db = get_db()
        conn = await db.manhwa_connections.find_one({"mangadex_id": item_id})
        if conn:
            anilist_cover = conn.get("anilist_data", {}).get("cover_image")
            if anilist_cover:
                return anilist_cover

        # Fallback: fetch MangaDex cover
        covers = await mangadex_client.get_manga_covers(item_id)
        if covers:
            return covers[0]

    return None


@router.get("/cover/{source}/{item_id}")
async def get_cover_image(source: str, item_id: str):
    """Proxy and cache cover image. Prefers AniList covers."""
    if source not in ("anilist", "mangadex"):
        raise HTTPException(status_code=400, detail="Invalid source")

    # Check filesystem cache
    cache_path = CACHE_DIR / f"{source}_{item_id}.jpg"
    if cache_path.exists():
        return FileResponse(cache_path, media_type="image/jpeg", headers=CACHE_HEADERS)

    # Resolve the cover URL
    cover_url = await _resolve_cover_url(source, item_id)
    if not cover_url:
        raise HTTPException(status_code=404, detail="Cover not found")

    # Fetch and cache
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.get(cover_url)
            resp.raise_for_status()

            cache_path.write_bytes(resp.content)

            content_type = resp.headers.get("content-type", "image/jpeg")
            return Response(content=resp.content, media_type=content_type, headers=CACHE_HEADERS)
    except Exception as e:
        logger.error(f"Failed to proxy cover image for {source}/{item_id}: {e}")
        raise HTTPException(status_code=502, detail="Failed to fetch cover image")
