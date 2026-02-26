# User list and sync routes
import logging
from typing import Optional
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from bson import ObjectId
from backend.api.middleware.auth import get_current_user
from backend.database.connection import get_db
from backend.database.cache import cache_service
from backend.services.anilist.client import anilist_client
from backend.services.mangadex.client import mangadex_client
from backend.services.comparison import comparison_service

logger = logging.getLogger(__name__)

router = APIRouter()


def _verify_user_access(current_user: dict, user_id: str) -> None:
    """Verify that user_id matches the current user's _id or anilist_id."""
    if current_user["_id"] != user_id and str(current_user.get("anilist_id", "")) != str(user_id):
        raise HTTPException(status_code=403, detail="Access denied")


def _extract_cover_url(mangadex_data: dict) -> Optional[str]:
    """Extract cover URL from MangaDex manga data"""
    for rel in mangadex_data.get("relationships", []):
        if rel.get("type") == "cover_art":
            filename = rel.get("attributes", {}).get("fileName")
            if filename:
                manga_id = mangadex_data.get("id", "")
                return f"https://uploads.mangadex.org/covers/{manga_id}/{filename}"
    return None


def _extract_alt_titles(mangadex_data: dict) -> list[str]:
    """Extract alternative titles from MangaDex data"""
    alt_titles = []
    for alt in mangadex_data.get("attributes", {}).get("altTitles", []):
        alt_titles.extend(alt.values())
    return alt_titles


@router.get("/{user_id}/lists")
async def get_user_lists(
    user_id: str,
    status: Optional[str] = Query(
        None, description="Filter by status: READING, COMPLETED, PAUSED, DROPPED, PLANNING"
    ),
    current_user: dict = Depends(get_current_user),
):
    """
    Get user's AniList manga lists grouped by status,
    enriched with MangaDex data from existing connections.
    """
    _verify_user_access(current_user, user_id)

    # Map display status names to AniList MediaListStatus enum values
    STATUS_TO_ANILIST = {
        "READING": "CURRENT",
        "COMPLETED": "COMPLETED",
        "PAUSED": "PAUSED",
        "DROPPED": "DROPPED",
        "PLANNING": "PLANNING",
    }

    try:
        # Get AniList user ID
        anilist_id = current_user.get("anilist_id")
        if not anilist_id:
            raise HTTPException(status_code=400, detail="AniList ID not found for user")

        # Fetch manga list from AniList
        anilist_token = current_user.get("anilist_token")
        anilist_status = STATUS_TO_ANILIST.get(status.upper(), status) if status else None
        lists = await anilist_client.get_user_manga_list(
            user_id=int(anilist_id), token=anilist_token, status=anilist_status
        )

        # Enrich with MangaDex data from existing connections
        db = get_db()
        connections = await db.manhwa_connections.find(
            {"user_id": ObjectId(current_user["_id"])}
        ).to_list(length=None)

        # Build lookup by AniList ID
        connection_map = {str(c.get("anilist_id")): c for c in connections}

        # Enrich each list entry
        enriched_lists = {}
        for list_status, entries in lists.items():
            enriched_entries = []
            for entry in entries:
                media = entry.get("media", {})
                media_id = str(media.get("id", ""))
                enriched_entry = {
                    **entry,
                    "connection": None,
                    "mangadex_data": None,
                    "is_linked": False,
                }

                conn = connection_map.get(media_id)
                if conn:
                    conn["_id"] = str(conn["_id"])
                    conn["user_id"] = str(conn["user_id"])
                    enriched_entry["connection"] = conn
                    enriched_entry["mangadex_data"] = conn.get("mangadex_data")
                    enriched_entry["is_linked"] = True

                enriched_entries.append(enriched_entry)

            enriched_lists[list_status] = enriched_entries

        # Use chapter counts already stored on connection docs.
        # Refresh any missing counts in the background without blocking.
        stale_ids = []
        for entries in enriched_lists.values():
            for e in entries:
                md = e.get("mangadex_data")
                if md and md.get("id") and not md.get("chapters_count"):
                    stale_ids.append(md["id"])

        if stale_ids:
            # Fire-and-forget: fetch missing counts from cache (fast) or API
            try:
                chapter_counts = await mangadex_client.get_manga_chapter_counts(stale_ids)
                for entries in enriched_lists.values():
                    for e in entries:
                        md = e.get("mangadex_data")
                        if (
                            md
                            and md.get("id") in chapter_counts
                            and chapter_counts[md["id"]] is not None
                        ):
                            md["chapters_count"] = chapter_counts[md["id"]]
            except Exception:
                pass  # Don't block the response for chapter counts

        total_entries = sum(len(v) for v in enriched_lists.values())
        total_linked = sum(
            1 for entries in enriched_lists.values() for e in entries if e["is_linked"]
        )

        # Debug logging
        status_counts = {k: len(v) for k, v in enriched_lists.items()}
        logger.info(f"Returning user lists: {status_counts}")

        return {
            "lists": enriched_lists,
            "total_entries": total_entries,
            "total_linked": total_linked,
            "user_id": user_id,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to fetch user lists: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch user lists: {e}")


@router.post("/{user_id}/sync")
async def sync_user_list(user_id: str, current_user: dict = Depends(get_current_user)):
    """
    Force refresh AniList data only (clear cache, re-fetch lists).
    Does NOT run auto-matching.
    """
    _verify_user_access(current_user, user_id)

    try:
        anilist_id = current_user.get("anilist_id")
        anilist_token = current_user.get("anilist_token")

        if not anilist_id:
            raise HTTPException(status_code=400, detail="AniList ID not found")

        # Clear cache to force fresh fetch
        await cache_service.clear_user_cache(str(anilist_id))

        # Fetch fresh manga list from AniList
        lists = await anilist_client.get_user_manga_list(
            user_id=int(anilist_id), token=anilist_token
        )

        total_entries = sum(len(v) for v in lists.values())

        return {
            "message": "Sync completed — AniList data refreshed",
            "total_entries": total_entries,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Sync failed: {e}")
        raise HTTPException(status_code=500, detail="Sync failed")


class AutoLinkEntryRequest(BaseModel):
    anilist_id: str
    anilist_entry: dict


@router.post("/{user_id}/auto-link-entry")
async def auto_link_entry(
    user_id: str, request: AutoLinkEntryRequest, current_user: dict = Depends(get_current_user)
):
    """
    Auto-match a single AniList entry to MangaDex (0.70 confidence).
    Returns the match result so the frontend can show per-entry progress.
    """
    _verify_user_access(current_user, user_id)
    mongo_id = current_user["_id"]

    try:
        # Check if already linked
        db = get_db()
        existing = await db.manhwa_connections.find_one(
            {"user_id": ObjectId(mongo_id), "anilist_id": request.anilist_id}
        )
        if existing:
            return {"status": "already_linked", "anilist_id": request.anilist_id}

        # Run matching on the single entry
        match_result = await comparison_service.find_best_match(request.anilist_entry)

        if not match_result or match_result[1] < 0.70:
            confidence = match_result[1] if match_result else 0
            return {
                "status": "no_match",
                "anilist_id": request.anilist_id,
                "confidence": confidence,
            }

        md_data, confidence = match_result
        al_entry = request.anilist_entry
        media = al_entry.get("media", {})
        attrs = md_data.get("attributes", {})

        connection_doc = {
            "user_id": ObjectId(mongo_id),
            "anilist_id": request.anilist_id,
            "mangadex_id": md_data.get("id", ""),
            "anilist_data": {
                "id": request.anilist_id,
                "title": media.get("title", {}),
                "alternative_titles": media.get("synonyms", []),
                "status": al_entry.get("status"),
                "progress": al_entry.get("progress", 0),
                "score": al_entry.get("score"),
                "cover_image": media.get("coverImage", {}).get("large"),
                "chapters": media.get("chapters"),
                "average_score": media.get("averageScore"),
                "start_date": media.get("startDate"),
                "updated_at": datetime.utcnow(),
            },
            "mangadex_data": {
                "id": md_data.get("id", ""),
                "title": attrs.get("title", {}).get("en", ""),
                "alternative_titles": _extract_alt_titles(md_data),
                "description": (attrs.get("description", {}) or {}).get("en", ""),
                "cover_url": _extract_cover_url(md_data),
                "chapters_count": await mangadex_client.get_manga_chapter_count(
                    md_data.get("id", "")
                ),
                "year": attrs.get("year"),
                "status": attrs.get("status"),
                "tags": [
                    t.get("attributes", {}).get("name", {}).get("en", "")
                    for t in attrs.get("tags", [])
                ],
                "last_updated": attrs.get("updatedAt"),
            },
            "match_confidence": confidence,
            "manually_linked": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }

        await db.manhwa_connections.update_one(
            {"user_id": ObjectId(mongo_id), "anilist_id": request.anilist_id},
            {"$set": connection_doc},
            upsert=True,
        )

        return {
            "status": "linked",
            "anilist_id": request.anilist_id,
            "mangadex_id": md_data.get("id", ""),
            "confidence": confidence,
            "mangadex_title": attrs.get("title", {}).get("en", ""),
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Auto-link entry failed for {request.anilist_id}: {e}")
        return {"status": "error", "anilist_id": request.anilist_id, "error": str(e)}


@router.get("/{user_id}/connections")
async def get_user_connections(
    user_id: str,
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """Get paginated AniList-MangaDex connections for a user"""
    _verify_user_access(current_user, user_id)
    mongo_id = current_user["_id"]

    try:
        db = get_db()

        total = await db.manhwa_connections.count_documents({"user_id": ObjectId(mongo_id)})

        connections = (
            await db.manhwa_connections.find({"user_id": ObjectId(mongo_id)})
            .sort("updated_at", -1)
            .skip(skip)
            .limit(limit)
            .to_list(length=limit)
        )

        # Serialize ObjectIds
        for conn in connections:
            conn["_id"] = str(conn["_id"])
            conn["user_id"] = str(conn["user_id"])

        return {
            "connections": connections,
            "total": total,
            "skip": skip,
            "limit": limit,
            "has_next": skip + limit < total,
        }

    except Exception as e:
        logger.error(f"Failed to fetch connections: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch connections")
