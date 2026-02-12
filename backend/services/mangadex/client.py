# MangaDex API client with caching, rate limiting, and retry logic
# API Docs: https://api.mangadex.org/docs/

import asyncio
import json
import logging
from typing import Optional, List, Dict, Any
import httpx
from backend.config.settings import settings
from backend.database.cache import cache_service, CacheTTL, deterministic_hash

logger = logging.getLogger(__name__)


class RateLimiter:
    """Simple rate limiter for API requests"""

    def __init__(self, max_requests_per_second: int = 5):
        self.max_requests = max_requests_per_second
        self.interval = 1.0 / max_requests_per_second
        self.last_request = 0.0
        self._lock = asyncio.Lock()

    async def acquire(self):
        """Wait if necessary to respect rate limit"""
        async with self._lock:
            now = asyncio.get_event_loop().time()
            time_since_last = now - self.last_request
            if time_since_last < self.interval:
                await asyncio.sleep(self.interval - time_since_last)
            self.last_request = asyncio.get_event_loop().time()


class MangaDexClient:
    """Async client for interacting with MangaDex API with caching and rate limiting"""

    def __init__(self):
        self.api_url = settings.MANGADEX_API_URL
        self.api_key = settings.MANGADEX_API_KEY
        self.rate_limiter = RateLimiter(max_requests_per_second=settings.MANGADEX_RATE_LIMIT)
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(
                base_url=self.api_url, timeout=30.0, headers={"User-Agent": "ManhwaDiscovery/1.0"}
            )
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()

    async def _request_with_retry(
        self, method: str, endpoint: str, params: Optional[Dict] = None, max_retries: int = 3
    ) -> Dict[str, Any]:
        """
        Make HTTP request with exponential backoff retry

        Args:
            method: HTTP method (GET, POST, etc.)
            endpoint: API endpoint
            params: Query parameters
            max_retries: Maximum retry attempts

        Returns:
            Response JSON data

        Raises:
            httpx.HTTPError: If all retries fail
        """
        client = await self._get_client()

        for attempt in range(max_retries):
            try:
                await self.rate_limiter.acquire()

                response = await client.request(method, endpoint, params=params)
                response.raise_for_status()
                return response.json()

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429:  # Rate limited
                    wait_time = 2**attempt
                    logger.warning(f"Rate limited, waiting {wait_time}s before retry")
                    await asyncio.sleep(wait_time)
                elif e.response.status_code >= 500:  # Server error
                    if attempt < max_retries - 1:
                        wait_time = 2**attempt
                        logger.warning(
                            f"Server error {e.response.status_code}, retrying in {wait_time}s"
                        )
                        await asyncio.sleep(wait_time)
                    else:
                        raise
                else:
                    raise

            except (httpx.RequestError, httpx.TimeoutException) as e:
                if attempt < max_retries - 1:
                    wait_time = 2**attempt
                    logger.warning(f"Request error: {e}, retrying in {wait_time}s")
                    await asyncio.sleep(wait_time)
                else:
                    raise

        raise httpx.HTTPError(f"Max retries ({max_retries}) exceeded for {endpoint}")

    async def search_manga(
        self, query: str, limit: int = 20, offset: int = 0, filters: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Search for manga/manhwa

        Args:
            query: Search query string
            limit: Number of results per page
            offset: Pagination offset
            filters: Additional filters (status, tags, etc.)

        Returns:
            Search results with manga data
        """
        cache_key = f"mangadex:search:{query}:{limit}:{offset}:{deterministic_hash(json.dumps(filters, sort_keys=True, default=str))}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached:
            return cached

        params = {
            "title": query,
            "limit": limit,
            "offset": offset,
            "includes[]": ["cover_art", "author", "artist"],
            "contentRating[]": ["safe", "suggestive", "erotica"],
            "order[relevance]": "desc",
        }

        if filters:
            # Apply status filter
            if filters.get("status"):
                params["status[]"] = filters["status"]

            # Apply publication demographic
            if filters.get("publicationDemographic"):
                params["publicationDemographic[]"] = filters["publicationDemographic"]

            # Apply tags
            if filters.get("includedTags"):
                params["includedTags[]"] = filters["includedTags"]
            if filters.get("excludedTags"):
                params["excludedTags[]"] = filters["excludedTags"]

            # Apply year filter
            if filters.get("year"):
                params["year"] = filters["year"]

        try:
            result = await self._request_with_retry("GET", "/manga", params=params)
            await cache_service.set_cached(cache_key, result, CacheTTL.SEARCH_RESULTS, "mangadex")
            logger.info(
                f"MangaDex search: '{query}' returned {len(result.get('data', []))} results"
            )
            return result
        except Exception as e:
            logger.error(f"MangaDex search failed for query '{query}': {e}")
            return {"data": [], "total": 0, "limit": limit, "offset": offset}

    async def get_manga_by_id(self, manga_id: str) -> Optional[Dict[str, Any]]:
        """
        Get manga details by ID

        Args:
            manga_id: MangaDex manga UUID

        Returns:
            Manga data or None if not found
        """
        cache_key = f"mangadex:manga:{manga_id}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached:
            return cached

        try:
            params = {"includes[]": ["cover_art", "author", "artist"]}
            result = await self._request_with_retry("GET", f"/manga/{manga_id}", params=params)

            if result.get("data"):
                await cache_service.set_cached(
                    cache_key, result, CacheTTL.MANGA_DETAILS, "mangadex"
                )
                logger.info(f"Fetched manga details for {manga_id}")
                return result

            return None
        except Exception as e:
            logger.error(f"Failed to fetch manga {manga_id}: {e}")
            return None

    async def get_manga_covers(self, manga_id: str) -> List[str]:
        """
        Get cover art URLs for a manga

        Args:
            manga_id: MangaDex manga UUID

        Returns:
            List of cover image URLs
        """
        cache_key = f"mangadex:covers:{manga_id}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached:
            return cached.get("covers", [])

        try:
            params = {"manga[]": manga_id, "limit": 10}
            result = await self._request_with_retry("GET", "/cover", params=params)

            covers = []
            for cover in result.get("data", []):
                filename = cover.get("attributes", {}).get("fileName")
                if filename:
                    cover_url = f"https://uploads.mangadex.org/covers/{manga_id}/{filename}"
                    covers.append(cover_url)

            cache_data = {"covers": covers}
            await cache_service.set_cached(
                cache_key, cache_data, CacheTTL.MANGA_DETAILS, "mangadex"
            )
            return covers
        except Exception as e:
            logger.error(f"Failed to fetch covers for {manga_id}: {e}")
            return []

    async def get_chapters(
        self, manga_id: str, lang: str = "en", limit: int = 100, offset: int = 0
    ) -> Dict[str, Any]:
        """
        Get chapters for a manga

        Args:
            manga_id: MangaDex manga UUID
            lang: Language code (default: en)
            limit: Number of chapters per page
            offset: Pagination offset

        Returns:
            Chapter data
        """
        cache_key = f"mangadex:chapters:{manga_id}:{lang}:{limit}:{offset}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached:
            return cached

        try:
            params = {
                "manga": manga_id,
                "translatedLanguage[]": lang,
                "limit": limit,
                "offset": offset,
                "order[chapter]": "desc",
                "includes[]": ["scanlation_group"],
            }
            result = await self._request_with_retry("GET", "/chapter", params=params)
            await cache_service.set_cached(cache_key, result, CacheTTL.MANGA_DETAILS, "mangadex")
            return result
        except Exception as e:
            logger.error(f"Failed to fetch chapters for {manga_id}: {e}")
            return {"data": [], "total": 0}

    async def get_manga_statistics(self, manga_ids: List[str]) -> Dict[str, Dict[str, Any]]:
        """
        Get statistics for multiple manga (ratings, follows, etc.)

        Args:
            manga_ids: List of MangaDex manga UUIDs

        Returns:
            Dictionary mapping manga_id to statistics
        """
        cache_key = f"mangadex:stats:{deterministic_hash(','.join(sorted(manga_ids)))}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached:
            return cached

        try:
            params = {"manga[]": manga_ids}
            result = await self._request_with_retry("GET", "/statistics/manga", params=params)

            stats = result.get("statistics", {})
            await cache_service.set_cached(cache_key, stats, CacheTTL.MANGA_DETAILS, "mangadex")
            return stats
        except Exception as e:
            logger.error(f"Failed to fetch statistics: {e}")
            return {}

    async def get_manga_chapter_count(self, manga_id: str) -> Optional[int]:
        """
        Get the highest chapter number for a manga via the aggregate endpoint.

        Calls /manga/{id}/aggregate and finds the max chapter number
        across all volumes. Cached with a 2-hour TTL.

        Returns:
            Highest chapter number as int, or None if unavailable
        """
        cache_key = f"mangadex:chapter_count:{manga_id}"
        cached = await cache_service.get_with_fallback(cache_key, "mangadex")
        if cached is not None:
            return cached.get("count")

        try:
            params = {"includeUnavailable": 1}
            result = await self._request_with_retry(
                "GET", f"/manga/{manga_id}/aggregate", params=params
            )

            max_chapter = 0
            for volume in result.get("volumes", {}).values():
                for ch_num in volume.get("chapters", {}).keys():
                    try:
                        num = float(ch_num)
                        if num > max_chapter:
                            max_chapter = num
                    except (ValueError, TypeError):
                        continue

            count = int(max_chapter) if max_chapter > 0 else None
            await cache_service.set_cached(
                cache_key, {"count": count}, CacheTTL.CHAPTER_COUNT, "mangadex"
            )
            return count
        except Exception as e:
            logger.warning(f"Failed to fetch chapter count for {manga_id}: {e}")
            return None

    async def get_manga_chapter_counts(self, manga_ids: List[str]) -> Dict[str, Optional[int]]:
        """
        Get chapter counts for multiple manga in parallel.

        Returns:
            Dictionary mapping manga_id to highest chapter number
        """
        tasks = {mid: self.get_manga_chapter_count(mid) for mid in manga_ids}
        results = await asyncio.gather(*tasks.values(), return_exceptions=True)
        counts = {}
        for mid, result in zip(tasks.keys(), results):
            counts[mid] = result if isinstance(result, (int, type(None))) else None
        return counts

    async def get_latest_chapters(self, manga_ids: List[str]) -> Dict[str, str]:
        """
        Get latest chapter number for multiple manga

        Args:
            manga_ids: List of MangaDex manga UUIDs

        Returns:
            Dictionary mapping manga_id to latest chapter number
        """
        latest_chapters = {}

        for manga_id in manga_ids:
            try:
                params = {
                    "manga": manga_id,
                    "translatedLanguage[]": "en",
                    "limit": 1,
                    "order[chapter]": "desc",
                }
                result = await self._request_with_retry("GET", "/chapter", params=params)

                chapters = result.get("data", [])
                if chapters:
                    chapter_num = chapters[0].get("attributes", {}).get("chapter", "N/A")
                    latest_chapters[manga_id] = chapter_num
            except Exception as e:
                logger.warning(f"Failed to fetch latest chapter for {manga_id}: {e}")

        return latest_chapters


# Global MangaDex client instance
mangadex_client = MangaDexClient()
