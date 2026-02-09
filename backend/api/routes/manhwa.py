# Manhwa search, discovery, and connection routes
import asyncio
import logging
from typing import Optional, List
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query
from pydantic import BaseModel
from bson import ObjectId
from backend.api.middleware.auth import get_current_user, get_optional_user
from backend.database.connection import get_db
from backend.services.mangadex.client import mangadex_client
from backend.services.anilist.client import anilist_client
from backend.services.comparison import comparison_service

logger = logging.getLogger(__name__)

router = APIRouter()


# --- Request/Response models ---

class ConnectRequest(BaseModel):
    anilist_id: str
    mangadex_id: str

class AddToAniListRequest(BaseModel):
    mangadex_id: str
    status: str = "PLANNING"
    mangadex_link: Optional[str] = None


class AddToAniListByIdRequest(BaseModel):
    anilist_id: int
    status: str = "PLANNING"


# --- Helpers ---

def _parse_mangadex_manga(data: dict) -> dict:
    """Parse raw MangaDex manga data into a unified format"""
    attrs = data.get("attributes", {})
    title = attrs.get("title", {}).get("en") or next(iter(attrs.get("title", {}).values()), "Unknown")

    # Extract cover URL from relationships
    cover_url = None
    authors = []
    artists = []
    for rel in data.get("relationships", []):
        if rel.get("type") == "cover_art":
            filename = rel.get("attributes", {}).get("fileName")
            if filename:
                cover_url = f"https://uploads.mangadex.org/covers/{data['id']}/{filename}"
        elif rel.get("type") == "author":
            name = rel.get("attributes", {}).get("name")
            if name:
                authors.append(name)
        elif rel.get("type") == "artist":
            name = rel.get("attributes", {}).get("name")
            if name:
                artists.append(name)

    # Extract alt titles
    alt_titles = []
    for alt in attrs.get("altTitles", []):
        alt_titles.extend(alt.values())

    # Extract tags
    tags = [
        t.get("attributes", {}).get("name", {}).get("en", "")
        for t in attrs.get("tags", [])
        if t.get("attributes", {}).get("name", {}).get("en")
    ]

    return {
        "id": data["id"],
        "source": "mangadex",
        "title": title,
        "alternative_titles": alt_titles,
        "description": (attrs.get("description", {}) or {}).get("en", ""),
        "cover_url": cover_url,
        "authors": authors,
        "artists": artists,
        "tags": tags,
        "status": attrs.get("status"),
        "year": attrs.get("year"),
        "chapters_count": attrs.get("lastChapter"),
        "rating": None,  # Filled from statistics endpoint
    }


def _parse_anilist_manga(data: dict) -> dict:
    """Parse raw AniList manga data into a unified format"""
    title_obj = data.get("title", {})
    title = title_obj.get("english") or title_obj.get("romaji") or title_obj.get("native") or "Unknown"

    return {
        "id": str(data.get("id", "")),
        "source": "anilist",
        "title": title,
        "alternative_titles": data.get("synonyms", []),
        "description": data.get("description", ""),
        "cover_url": data.get("coverImage", {}).get("large"),
        "authors": [],
        "artists": [],
        "genres": data.get("genres", []),
        "tags": [t.get("name", "") for t in data.get("tags", [])],
        "status": data.get("status"),
        "year": data.get("startDate", {}).get("year") if data.get("startDate") else None,
        "chapters_count": data.get("chapters"),
        "rating": data.get("averageScore", 0) / 10.0 if data.get("averageScore") else None,
    }


async def _enrich_with_connection(
    parsed: dict, current_user: dict,
    anilist_id: str = None, mangadex_id: str = None
) -> dict:
    """Add connection and user list status to a detail response."""
    try:
        db = get_db()
        query = {"user_id": ObjectId(current_user["_id"])}
        if anilist_id:
            query["anilist_id"] = anilist_id
        elif mangadex_id:
            query["mangadex_id"] = mangadex_id
        else:
            return parsed

        conn = await db.manhwa_connections.find_one(query)
        if conn:
            conn["_id"] = str(conn["_id"])
            conn["user_id"] = str(conn["user_id"])
            parsed["connection"] = conn
            parsed["is_linked"] = True
        else:
            parsed["connection"] = None
            parsed["is_linked"] = False

        # Check if manga is in user's AniList list (uses cached data)
        parsed["user_list_status"] = None
        al_id = current_user.get("anilist_id")
        check_media_id = anilist_id  # the AniList media ID to look for
        if al_id and check_media_id:
            try:
                lists = await anilist_client.get_user_manga_list(
                    user_id=int(al_id),
                    token=current_user.get("anilist_token")
                )
                for entries in lists.values():
                    for entry in entries:
                        if str(entry.get("media", {}).get("id")) == str(check_media_id):
                            parsed["user_list_status"] = entry.get("status")
                            parsed["user_list_progress"] = entry.get("progress")
                            break
            except Exception:
                pass
    except Exception as e:
        logger.warning(f"Failed to enrich with connection: {e}")
        parsed["connection"] = None
        parsed["is_linked"] = False
    return parsed


def apply_filters(results: List[dict], filters: dict) -> List[dict]:
    """Apply search filters to results"""
    filtered = results

    if filters.get("min_chapters"):
        min_ch = int(filters["min_chapters"])
        filtered = [r for r in filtered if _get_chapter_count(r) >= min_ch]

    if filters.get("max_chapters"):
        max_ch = int(filters["max_chapters"])
        filtered = [r for r in filtered if _get_chapter_count(r) <= max_ch]

    if filters.get("min_rating"):
        min_r = float(filters["min_rating"])
        filtered = [r for r in filtered if (r.get("rating") or 0) >= min_r]

    if filters.get("status"):
        st = filters["status"].lower()
        filtered = [r for r in filtered if (r.get("status") or "").lower() == st]

    if filters.get("release_year_min"):
        yr = int(filters["release_year_min"])
        filtered = [r for r in filtered if (r.get("year") or 0) >= yr]

    if filters.get("release_year_max"):
        yr = int(filters["release_year_max"])
        filtered = [r for r in filtered if (r.get("year") or 9999) <= yr]

    return filtered


def _get_chapter_count(item: dict) -> int:
    ch = item.get("chapters_count")
    if ch is None:
        return 0
    try:
        return int(ch)
    except (ValueError, TypeError):
        return 0


def sort_results(results: List[dict], sort_by: str, order: str = "desc") -> List[dict]:
    """Sort results by specified field"""
    sort_keys = {
        "relevance": lambda x: x.get("_score", 0),
        "rating": lambda x: x.get("rating") or 0,
        "chapters": lambda x: _get_chapter_count(x),
        "latest_update": lambda x: x.get("last_updated") or "",
        "release_date": lambda x: x.get("year") or 0,
    }

    key_fn = sort_keys.get(sort_by, sort_keys["relevance"])
    return sorted(results, key=key_fn, reverse=(order == "desc"))


def deduplicate_results(mangadex_results: List[dict], anilist_results: List[dict]) -> List[dict]:
    """Merge and deduplicate results from both sources using fuzzy matching"""
    merged = list(mangadex_results)
    seen_titles = {comparison_service.normalize_title(r.get("title", "")) for r in merged}

    for al_result in anilist_results:
        normalized = comparison_service.normalize_title(al_result.get("title", ""))
        # Simple dedup - if title already present, skip
        if normalized not in seen_titles:
            merged.append(al_result)
            seen_titles.add(normalized)

    return merged


# --- Endpoints ---

@router.get("/trending")
async def get_trending_manga(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """Get trending manga from AniList"""
    try:
        result = await anilist_client.get_trending_manga(page, per_page)
        media_list = result.get("Page", {}).get("media", [])
        page_info = result.get("Page", {}).get("pageInfo", {})

        parsed = [_parse_anilist_manga(m) for m in media_list]
        return {
            "results": parsed,
            "total": page_info.get("total", 0),
            "page": page,
            "per_page": per_page,
            "has_next": page_info.get("hasNextPage", False),
        }
    except Exception as e:
        logger.error(f"Failed to fetch trending: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch trending manga")


@router.get("/popular")
async def get_popular_manga(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
):
    """Get popular manga from AniList"""
    try:
        result = await anilist_client.get_popular_manga(page, per_page)
        media_list = result.get("Page", {}).get("media", [])
        page_info = result.get("Page", {}).get("pageInfo", {})

        parsed = [_parse_anilist_manga(m) for m in media_list]
        return {
            "results": parsed,
            "total": page_info.get("total", 0),
            "page": page,
            "per_page": per_page,
            "has_next": page_info.get("hasNextPage", False),
        }
    except Exception as e:
        logger.error(f"Failed to fetch popular: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch popular manga")


@router.get("/search")
async def search_manhwa(
    query: str = Query(..., min_length=1, description="Search query"),
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    min_chapters: Optional[int] = Query(None, ge=0),
    max_chapters: Optional[int] = Query(None, ge=0),
    min_rating: Optional[float] = Query(None, ge=0, le=10),
    status: Optional[str] = Query(None),
    release_year_min: Optional[int] = Query(None),
    release_year_max: Optional[int] = Query(None),
    sort_by: str = Query("relevance", pattern="^(relevance|rating|chapters|latest_update|release_date)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    user_id: Optional[str] = Query(None, description="Optional user ID to enrich with list status"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """
    Global search across AniList + MangaDex with fuzzy matching,
    filtering, sorting, and pagination.
    """
    try:
        offset = (page - 1) * per_page

        # Search both platforms in parallel
        md_task = mangadex_client.search_manga(query=query, limit=per_page, offset=offset)
        al_task = anilist_client.search_manga(query=query, page=page, per_page=per_page)
        md_results, al_results = await asyncio.gather(md_task, al_task, return_exceptions=True)

        # Parse MangaDex results
        parsed_md = []
        if isinstance(md_results, dict):
            for item in md_results.get("data", []):
                parsed = _parse_mangadex_manga(item)
                parsed["_score"] = 1.0  # MangaDex relevance
                parsed_md.append(parsed)

        # Try to fetch ratings for MangaDex results
        if parsed_md:
            try:
                manga_ids = [m["id"] for m in parsed_md]
                stats = await mangadex_client.get_manga_statistics(manga_ids)
                for m in parsed_md:
                    stat = stats.get(m["id"], {})
                    rating_data = stat.get("rating", {})
                    m["rating"] = rating_data.get("average")
                    if m["rating"]:
                        m["rating"] = round(m["rating"] / 10.0, 1)  # Normalize to 0-10
            except Exception as e:
                logger.warning(f"Failed to fetch MangaDex stats: {e}")

        # Parse AniList results
        parsed_al = []
        if isinstance(al_results, dict):
            for item in al_results.get("Page", {}).get("media", []):
                parsed = _parse_anilist_manga(item)
                parsed["_score"] = 0.9  # Slightly lower for dedup priority
                parsed_al.append(parsed)

        # Merge and deduplicate
        merged = deduplicate_results(parsed_md, parsed_al)

        # Build filter dict
        filters = {}
        if min_chapters is not None:
            filters["min_chapters"] = min_chapters
        if max_chapters is not None:
            filters["max_chapters"] = max_chapters
        if min_rating is not None:
            filters["min_rating"] = min_rating
        if status:
            filters["status"] = status
        if release_year_min is not None:
            filters["release_year_min"] = release_year_min
        if release_year_max is not None:
            filters["release_year_max"] = release_year_max

        # Apply filters
        if filters:
            merged = apply_filters(merged, filters)

        # Sort
        merged = sort_results(merged, sort_by, sort_order)

        # Enrich with user list status if user is authenticated
        resolve_user_id = user_id or (current_user["_id"] if current_user else None)
        if resolve_user_id:
            try:
                db = get_db()
                connections = await db.manhwa_connections.find(
                    {"user_id": ObjectId(resolve_user_id)}
                ).to_list(length=None)

                md_conn_map = {c["mangadex_id"]: c for c in connections}
                al_conn_map = {c["anilist_id"]: c for c in connections}

                # Build AniList media ID lookup from user's list
                al_list_map = {}  # media_id -> {status, progress}
                if current_user:
                    al_id = current_user.get("anilist_id")
                    if al_id:
                        try:
                            lists = await anilist_client.get_user_manga_list(
                                user_id=int(al_id),
                                token=current_user.get("anilist_token")
                            )
                            for entries in lists.values():
                                for entry in entries:
                                    media_id = str(entry.get("media", {}).get("id", ""))
                                    if media_id:
                                        al_list_map[media_id] = {
                                            "status": entry.get("status"),
                                            "progress": entry.get("progress"),
                                        }
                        except Exception:
                            pass

                for item in merged:
                    conn = None
                    if item["source"] == "mangadex":
                        conn = md_conn_map.get(item["id"])
                    elif item["source"] == "anilist":
                        conn = al_conn_map.get(item["id"])

                    if conn:
                        item["is_linked"] = True
                        item["connection_id"] = str(conn.get("_id", ""))
                        al_data = conn.get("anilist_data", {})
                        item["user_status"] = al_data.get("status")
                        item["user_progress"] = al_data.get("progress")
                        item["user_score"] = al_data.get("score")
                    else:
                        item["is_linked"] = False
                        item["connection_id"] = None

                    # Check if in user's AniList list (for unlinked entries too)
                    if item["source"] == "anilist" and item["id"] in al_list_map:
                        list_entry = al_list_map[item["id"]]
                        item["user_list_status"] = list_entry["status"]
                        if not item.get("user_status"):
                            item["user_status"] = list_entry["status"]
                        if not item.get("user_progress"):
                            item["user_progress"] = list_entry["progress"]
            except Exception as e:
                logger.warning(f"Failed to enrich with user data: {e}")

        # Calculate total from both sources
        md_total = md_results.get("total", 0) if isinstance(md_results, dict) else 0
        al_total = (al_results.get("Page", {}).get("pageInfo", {}).get("total", 0)
                    if isinstance(al_results, dict) else 0)
        total = max(md_total, al_total)

        # Remove internal score field
        for item in merged:
            item.pop("_score", None)

        return {
            "results": merged,
            "total": total,
            "page": page,
            "per_page": per_page,
            "has_next": offset + per_page < total
        }

    except Exception as e:
        logger.error(f"Search failed: {e}")
        raise HTTPException(status_code=500, detail="Search failed")


@router.get("/{manhwa_id}")
async def get_manhwa_details(
    manhwa_id: str,
    source: str = Query("mangadex", pattern="^(mangadex|anilist)$"),
    current_user: Optional[dict] = Depends(get_optional_user)
):
    """Get detailed manhwa info from specified source"""
    try:
        if source == "mangadex":
            result = await mangadex_client.get_manga_by_id(manhwa_id)
            if not result or not result.get("data"):
                raise HTTPException(status_code=404, detail="Manga not found on MangaDex")
            parsed = _parse_mangadex_manga(result["data"])

            # Fetch statistics
            try:
                stats = await mangadex_client.get_manga_statistics([manhwa_id])
                stat = stats.get(manhwa_id, {})
                rating_data = stat.get("rating", {})
                parsed["rating"] = rating_data.get("average")
                if parsed["rating"]:
                    parsed["rating"] = round(parsed["rating"] / 10.0, 1)
                parsed["follows"] = stat.get("follows", 0)
            except Exception:
                pass

            # Enrich with connection data if user is authenticated
            if current_user:
                parsed = await _enrich_with_connection(parsed, current_user, mangadex_id=manhwa_id)

            return parsed

        else:  # anilist
            result = await anilist_client.get_manga_details(int(manhwa_id))
            if not result:
                raise HTTPException(status_code=404, detail="Manga not found on AniList")
            parsed = _parse_anilist_manga(result)

            # Enrich with connection data if user is authenticated
            if current_user:
                parsed = await _enrich_with_connection(parsed, current_user, anilist_id=str(manhwa_id))

            return parsed

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get manhwa details: {e}")
        raise HTTPException(status_code=500, detail="Failed to get manhwa details")


@router.post("/connect")
async def create_connection(
    request: ConnectRequest,
    current_user: dict = Depends(get_current_user)
):
    """Manually create or update an AniList-MangaDex connection"""
    try:
        user_id = current_user["_id"]

        # Fetch data from both sources in parallel
        md_task = mangadex_client.get_manga_by_id(request.mangadex_id)
        al_task = anilist_client.get_manga_details(int(request.anilist_id))
        md_result, al_result = await asyncio.gather(md_task, al_task)

        if not md_result or not md_result.get("data"):
            raise HTTPException(status_code=404, detail="MangaDex manga not found")
        if not al_result:
            raise HTTPException(status_code=404, detail="AniList manga not found")

        md_data = md_result["data"]
        md_attrs = md_data.get("attributes", {})

        # Extract cover
        cover_url = None
        for rel in md_data.get("relationships", []):
            if rel.get("type") == "cover_art":
                fn = rel.get("attributes", {}).get("fileName")
                if fn:
                    cover_url = f"https://uploads.mangadex.org/covers/{request.mangadex_id}/{fn}"

        alt_titles = []
        for alt in md_attrs.get("altTitles", []):
            alt_titles.extend(alt.values())

        db = get_db()
        now = datetime.utcnow()

        connection_doc = {
            "user_id": ObjectId(user_id),
            "anilist_id": request.anilist_id,
            "mangadex_id": request.mangadex_id,
            "anilist_data": {
                "id": request.anilist_id,
                "title": al_result.get("title", {}),
                "alternative_titles": al_result.get("synonyms", []),
                "status": al_result.get("status"),
                "cover_image": al_result.get("coverImage", {}).get("large"),
                "chapters": al_result.get("chapters"),
                "average_score": al_result.get("averageScore"),
            },
            "mangadex_data": {
                "id": request.mangadex_id,
                "title": md_attrs.get("title", {}).get("en", ""),
                "alternative_titles": alt_titles,
                "description": (md_attrs.get("description", {}) or {}).get("en", ""),
                "cover_url": cover_url,
                "year": md_attrs.get("year"),
                "status": md_attrs.get("status"),
                "tags": [t.get("attributes", {}).get("name", {}).get("en", "")
                         for t in md_attrs.get("tags", [])],
            },
            "match_confidence": 1.0,
            "manually_linked": True,
            "created_at": now,
            "updated_at": now
        }

        result = await db.manhwa_connections.update_one(
            {"user_id": ObjectId(user_id), "anilist_id": request.anilist_id},
            {"$set": connection_doc},
            upsert=True
        )

        action = "updated" if result.matched_count > 0 else "created"
        logger.info(f"Connection {action} for user {user_id}: AL:{request.anilist_id} <-> MD:{request.mangadex_id}")

        return {"message": f"Connection {action}", "connection": {
            **connection_doc,
            "user_id": user_id,
            "_id": str(result.upserted_id) if result.upserted_id else None
        }}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to create connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to create connection")


@router.delete("/connect/{connection_id}")
async def remove_connection(
    connection_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove (unlink) an AniList-MangaDex connection"""
    try:
        db = get_db()
        result = await db.manhwa_connections.delete_one({
            "_id": ObjectId(connection_id),
            "user_id": ObjectId(current_user["_id"])
        })

        if result.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Connection not found")

        logger.info(f"Removed connection {connection_id}")
        return {"message": "Connection removed"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to remove connection: {e}")
        raise HTTPException(status_code=500, detail="Failed to remove connection")


@router.post("/anilist/add")
async def add_to_anilist(
    request: AddToAniListRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Add manga to AniList from search results.
    Gets MangaDex data, searches/creates on AniList, adds to user's list,
    and creates a connection.
    """
    try:
        anilist_token = current_user.get("anilist_token")
        if not anilist_token:
            raise HTTPException(status_code=400, detail="AniList token not found")

        # Get MangaDex data
        md_result = await mangadex_client.get_manga_by_id(request.mangadex_id)
        if not md_result or not md_result.get("data"):
            raise HTTPException(status_code=404, detail="MangaDex manga not found")

        md_data = md_result["data"]
        md_attrs = md_data.get("attributes", {})
        md_title = md_attrs.get("title", {}).get("en", "")

        # Search AniList for matching manga
        al_results = await anilist_client.search_manga(md_title, page=1, per_page=5)
        al_media_list = al_results.get("Page", {}).get("media", [])

        # Find best AniList match
        best_match = None
        best_confidence = 0.0
        for media in al_media_list:
            al_title = media.get("title", {})
            synonyms = media.get("synonyms", [])

            # Extract alt titles from MangaDex
            md_alts = []
            for alt in md_attrs.get("altTitles", []):
                md_alts.extend(alt.values())

            confidence = comparison_service.match_titles(
                mangadex_title=md_title,
                mangadex_alts=md_alts,
                anilist_title=al_title,
                anilist_synonyms=synonyms,
                mangadex_year=md_attrs.get("year"),
                anilist_year=media.get("startDate", {}).get("year") if media.get("startDate") else None
            )
            if confidence > best_confidence:
                best_confidence = confidence
                best_match = media

        if not best_match or best_confidence < 0.70:
            raise HTTPException(
                status_code=404,
                detail=f"Could not find matching manga on AniList (best confidence: {best_confidence:.0%})"
            )

        # Add to AniList user's list
        entry = await anilist_client.add_manga_to_list(
            token=anilist_token,
            manga_id=best_match["id"],
            status=request.status
        )

        # Create connection
        user_id = current_user["_id"]
        db = get_db()
        now = datetime.utcnow()

        cover_url = None
        for rel in md_data.get("relationships", []):
            if rel.get("type") == "cover_art":
                fn = rel.get("attributes", {}).get("fileName")
                if fn:
                    cover_url = f"https://uploads.mangadex.org/covers/{request.mangadex_id}/{fn}"

        alt_titles = []
        for alt in md_attrs.get("altTitles", []):
            alt_titles.extend(alt.values())

        connection_doc = {
            "user_id": ObjectId(user_id),
            "anilist_id": str(best_match["id"]),
            "mangadex_id": request.mangadex_id,
            "anilist_data": {
                "id": str(best_match["id"]),
                "title": best_match.get("title", {}),
                "alternative_titles": best_match.get("synonyms", []),
                "status": request.status,
                "progress": 0,
                "cover_image": best_match.get("coverImage", {}).get("large"),
                "chapters": best_match.get("chapters"),
                "average_score": best_match.get("averageScore"),
            },
            "mangadex_data": {
                "id": request.mangadex_id,
                "title": md_title,
                "alternative_titles": alt_titles,
                "description": (md_attrs.get("description", {}) or {}).get("en", ""),
                "cover_url": cover_url,
                "year": md_attrs.get("year"),
                "status": md_attrs.get("status"),
                "tags": [t.get("attributes", {}).get("name", {}).get("en", "")
                         for t in md_attrs.get("tags", [])],
            },
            "match_confidence": best_confidence,
            "manually_linked": True,
            "created_at": now,
            "updated_at": now
        }

        await db.manhwa_connections.update_one(
            {"user_id": ObjectId(user_id), "anilist_id": str(best_match["id"])},
            {"$set": connection_doc},
            upsert=True
        )

        return {
            "message": "Added to AniList and linked",
            "anilist_entry": entry,
            "match_confidence": best_confidence
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add to AniList: {e}")
        raise HTTPException(status_code=500, detail="Failed to add to AniList")


@router.post("/anilist/add-by-id")
async def add_to_anilist_by_id(
    request: AddToAniListByIdRequest,
    current_user: dict = Depends(get_current_user)
):
    """Add manga to user's AniList list when the AniList ID is already known."""
    try:
        anilist_token = current_user.get("anilist_token")
        if not anilist_token:
            raise HTTPException(status_code=400, detail="AniList token not found")

        # Map READING -> CURRENT for AniList API
        status_map = {"READING": "CURRENT"}
        al_status = status_map.get(request.status, request.status)

        entry = await anilist_client.add_manga_to_list(
            token=anilist_token,
            manga_id=request.anilist_id,
            status=al_status
        )

        return {
            "message": "Added to AniList",
            "anilist_entry": entry,
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to add to AniList by ID: {e}")
        raise HTTPException(status_code=500, detail="Failed to add to AniList")


@router.get("/{manhwa_id}/chapters")
async def get_chapters(
    manhwa_id: str,
    lang: str = Query("en", description="Language code"),
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100)
):
    """Get chapter list for a manga from MangaDex"""
    try:
        offset = (page - 1) * per_page
        result = await mangadex_client.get_chapters(
            manga_id=manhwa_id,
            lang=lang,
            limit=per_page,
            offset=offset
        )

        chapters = []
        for ch in result.get("data", []):
            attrs = ch.get("attributes", {})

            # Get scanlation group
            group_name = None
            for rel in ch.get("relationships", []):
                if rel.get("type") == "scanlation_group":
                    group_name = rel.get("attributes", {}).get("name")

            chapters.append({
                "id": ch["id"],
                "chapter": attrs.get("chapter"),
                "title": attrs.get("title"),
                "volume": attrs.get("volume"),
                "pages": attrs.get("pages", 0),
                "language": attrs.get("translatedLanguage"),
                "group": group_name,
                "published_at": attrs.get("publishAt"),
                "readable_at": attrs.get("readableAt"),
            })

        return {
            "chapters": chapters,
            "total": result.get("total", 0),
            "page": page,
            "per_page": per_page,
            "has_next": offset + per_page < result.get("total", 0)
        }

    except Exception as e:
        logger.error(f"Failed to fetch chapters for {manhwa_id}: {e}")
        raise HTTPException(status_code=500, detail="Failed to fetch chapters")
