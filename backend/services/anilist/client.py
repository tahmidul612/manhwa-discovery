# AniList GraphQL API client with OAuth support
# API Docs: https://anilist.gitbook.io/anilist-apiv2-docs/

import logging
from typing import Optional, Dict, Any, List
from urllib.parse import urlencode
import httpx
from backend.config.settings import settings
from backend.database.cache import cache_service, CacheTTL

logger = logging.getLogger(__name__)


class AniListClient:
    """Async client for AniList GraphQL API with OAuth support"""

    def __init__(self):
        self.api_url = settings.ANILIST_API_URL
        self.client_id = settings.ANILIST_CLIENT_ID
        self.client_secret = settings.ANILIST_CLIENT_SECRET
        self.redirect_uri = settings.ANILIST_REDIRECT_URI
        self._client: Optional[httpx.AsyncClient] = None

    async def _get_client(self) -> httpx.AsyncClient:
        """Get or create HTTP client"""
        if self._client is None:
            self._client = httpx.AsyncClient(timeout=30.0)
        return self._client

    async def close(self):
        """Close HTTP client"""
        if self._client:
            await self._client.aclose()

    async def _graphql_request(
        self, query: str, variables: Optional[Dict[str, Any]] = None, token: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Make GraphQL request to AniList API

        Args:
            query: GraphQL query string
            variables: Query variables
            token: Optional OAuth access token

        Returns:
            Response data

        Raises:
            httpx.HTTPError: If request fails
        """
        client = await self._get_client()

        headers = {"Content-Type": "application/json", "Accept": "application/json"}

        if token:
            headers["Authorization"] = f"Bearer {token}"

        payload = {"query": query}
        if variables:
            payload["variables"] = variables

        try:
            response = await client.post(self.api_url, json=payload, headers=headers)
            response.raise_for_status()
            result = response.json()

            # Check for GraphQL errors
            if "errors" in result:
                logger.error(f"GraphQL errors: {result['errors']}")
                raise Exception(
                    f"GraphQL error: {result['errors'][0].get('message', 'Unknown error')}"
                )

            return result.get("data", {})

        except httpx.HTTPStatusError as e:
            logger.error(f"AniList API HTTP {e.response.status_code}: {e.response.text[:500]}")
            raise
        except httpx.HTTPError as e:
            logger.error(f"AniList API request failed: {e}")
            raise

    # OAuth Methods

    def get_authorization_url(self, state: str = "random_state") -> str:
        """
        Generate AniList OAuth authorization URL

        Args:
            state: Random state for CSRF protection

        Returns:
            Authorization URL
        """
        params = {
            "client_id": self.client_id,
            "redirect_uri": self.redirect_uri,
            "response_type": "code",
            "state": state,
        }
        auth_url = f"https://anilist.co/api/v2/oauth/authorize?{urlencode(params)}"
        logger.info(f"Generated OAuth URL with state: {state}")
        return auth_url

    async def exchange_code(self, code: str) -> Dict[str, Any]:
        """
        Exchange authorization code for access token

        Args:
            code: Authorization code from OAuth callback

        Returns:
            Token data (access_token, expires_in, etc.)

        Raises:
            httpx.HTTPError: If token exchange fails
        """
        client = await self._get_client()

        payload = {
            "grant_type": "authorization_code",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "redirect_uri": self.redirect_uri,
            "code": code,
        }

        try:
            response = await client.post(
                "https://anilist.co/api/v2/oauth/token",
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_data = response.json()
            logger.info("Successfully exchanged authorization code for access token")
            return token_data

        except httpx.HTTPError as e:
            logger.error(f"Failed to exchange code for token: {e}")
            raise

    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """
        Refresh expired access token

        Args:
            refresh_token: Refresh token

        Returns:
            New token data

        Raises:
            httpx.HTTPError: If refresh fails
        """
        client = await self._get_client()

        payload = {
            "grant_type": "refresh_token",
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "refresh_token": refresh_token,
        }

        try:
            response = await client.post(
                "https://anilist.co/api/v2/oauth/token",
                data=payload,
                headers={"Content-Type": "application/x-www-form-urlencoded"},
            )
            response.raise_for_status()
            token_data = response.json()
            logger.info("Successfully refreshed access token")
            return token_data

        except httpx.HTTPError as e:
            logger.error(f"Failed to refresh token: {e}")
            raise

    # GraphQL Queries

    async def get_current_user(self, token: str) -> Dict[str, Any]:
        """
        Get current authenticated user info

        Args:
            token: OAuth access token

        Returns:
            User data
        """
        query = """
        query {
            Viewer {
                id
                name
                avatar {
                    large
                }
            }
        }
        """

        result = await self._graphql_request(query, token=token)
        return result.get("Viewer", {})

    async def get_user_manga_list(
        self,
        user_id: Optional[int] = None,
        token: Optional[str] = None,
        status: Optional[str] = None,
    ) -> Dict[str, List[Dict[str, Any]]]:
        """
        Get user's manga list grouped by status

        Args:
            user_id: AniList user ID (if None, uses authenticated user)
            token: OAuth access token (required if user_id is None)
            status: Filter by specific status (READING, COMPLETED, PAUSED, DROPPED, PLANNING)

        Returns:
            Dictionary with lists grouped by status
        """
        # Check cache
        cache_key = f"anilist:user:{user_id or 'me'}:list:{status or 'all'}"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = """
        query ($userId: Int, $status: MediaListStatus) {
            MediaListCollection(userId: $userId, type: MANGA, status: $status) {
                lists {
                    name
                    status
                    entries {
                        id
                        status
                        progress
                        progressVolumes
                        score(format: POINT_10)
                        repeat
                        priority
                        private
                        notes
                        hiddenFromStatusLists
                        startedAt {
                            year
                            month
                            day
                        }
                        completedAt {
                            year
                            month
                            day
                        }
                        updatedAt
                        media {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                            synonyms
                            coverImage {
                                large
                                medium
                            }
                            bannerImage
                            description
                            status
                            chapters
                            volumes
                            averageScore
                            meanScore
                            popularity
                            favourites
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            genres
                            tags {
                                name
                                rank
                            }
                        }
                    }
                }
            }
        }
        """

        variables = {}
        if user_id:
            variables["userId"] = user_id
        if status:
            variables["status"] = status

        try:
            result = await self._graphql_request(query, variables, token)
        except Exception:
            if token and user_id:
                logger.warning("Token-based manga list request failed, retrying without token")
                result = await self._graphql_request(query, variables, None)
            else:
                raise

        # Map AniList status enum to user-friendly keys
        ANILIST_STATUS_MAP = {
            "CURRENT": "reading",
            "COMPLETED": "completed",
            "PAUSED": "paused",
            "DROPPED": "dropped",
            "PLANNING": "planning",
            "REPEATING": "repeating",
        }

        # Parse and group by status
        # Initialize with all possible statuses as empty lists
        grouped_lists = {
            "reading": [],
            "completed": [],
            "paused": [],
            "dropped": [],
            "planning": [],
            "repeating": [],
        }

        # Populate with actual data from AniList
        for list_data in result.get("MediaListCollection", {}).get("lists", []):
            raw_status = list_data.get("status", list_data.get("name", "unknown"))
            list_status = ANILIST_STATUS_MAP.get(raw_status, raw_status.lower())
            grouped_lists[list_status] = list_data.get("entries", [])

        # Cache result
        await cache_service.set_cached(
            cache_key,
            grouped_lists,
            CacheTTL.USER_LISTS,
            "anilist",
            user_id=str(user_id) if user_id else None,
        )

        logger.info(
            f"Fetched manga list for user {user_id or 'me'}: {sum(len(v) for v in grouped_lists.values())} total entries"
        )
        return grouped_lists

    async def get_trending_manga(self, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """Get trending manga from AniList sorted by TRENDING_DESC"""
        cache_key = f"anilist:trending:{page}:{per_page}"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = """
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                pageInfo { total currentPage lastPage hasNextPage perPage }
                media(type: MANGA, sort: [TRENDING_DESC]) {
                    id
                    title { romaji english native }
                    coverImage { large medium }
                    description
                    status
                    chapters
                    averageScore
                    popularity
                    startDate { year }
                    genres
                }
            }
        }
        """

        result = await self._graphql_request(query, {"page": page, "perPage": per_page})
        await cache_service.set_cached(cache_key, result, CacheTTL.SEARCH_RESULTS, "anilist")
        return result

    async def get_popular_manga(self, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """Get popular manga from AniList sorted by POPULARITY_DESC"""
        cache_key = f"anilist:popular:{page}:{per_page}"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = """
        query ($page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                pageInfo { total currentPage lastPage hasNextPage perPage }
                media(type: MANGA, sort: [POPULARITY_DESC]) {
                    id
                    title { romaji english native }
                    coverImage { large medium }
                    description
                    status
                    chapters
                    averageScore
                    popularity
                    startDate { year }
                    genres
                }
            }
        }
        """

        result = await self._graphql_request(query, {"page": page, "perPage": per_page})
        await cache_service.set_cached(cache_key, result, CacheTTL.SEARCH_RESULTS, "anilist")
        return result

    async def get_genre_collection(self) -> List[str]:
        """Get all available genres from AniList"""
        cache_key = "anilist:genres"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = "query { GenreCollection }"
        result = await self._graphql_request(query)
        genres = result.get("GenreCollection", [])
        await cache_service.set_cached(cache_key, genres, 86400, "anilist")  # 24h cache
        return genres

    async def get_tag_collection(self) -> List[Dict[str, Any]]:
        """Get all available media tags from AniList"""
        cache_key = "anilist:tags"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = """
        query {
            MediaTagCollection {
                name
                description
                category
                isAdult
            }
        }
        """
        result = await self._graphql_request(query)
        tags = result.get("MediaTagCollection", [])
        # Filter out adult tags
        tags = [t for t in tags if not t.get("isAdult")]
        await cache_service.set_cached(cache_key, tags, 86400, "anilist")  # 24h cache
        return tags

    async def browse_manga(
        self,
        page: int = 1,
        per_page: int = 20,
        genres: Optional[List[str]] = None,
        tags: Optional[List[str]] = None,
        country: Optional[str] = None,
        format_in: Optional[List[str]] = None,
        status: Optional[str] = None,
        year_greater: Optional[int] = None,
        year_lesser: Optional[int] = None,
        sort: str = "POPULARITY_DESC",
    ) -> Dict[str, Any]:
        """Browse manga with filters using AniList API"""
        # Build cache key from all params
        cache_parts = [
            f"anilist:browse:{page}:{per_page}:{sort}",
            f"g={','.join(sorted(genres or []))}",
            f"t={','.join(sorted(tags or []))}",
            f"c={country or ''}",
            f"f={','.join(sorted(format_in or []))}",
            f"s={status or ''}",
            f"y={year_greater or ''}-{year_lesser or ''}",
        ]
        cache_key = ":".join(cache_parts)
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        # Build dynamic query variables
        var_defs = ["$page: Int", "$perPage: Int", "$sort: [MediaSort]"]
        media_args = ["type: MANGA", "page: $page", "perPage: $perPage", "sort: $sort"]
        variables: Dict[str, Any] = {"page": page, "perPage": per_page, "sort": [sort]}

        if genres:
            var_defs.append("$genre_in: [String]")
            media_args.append("genre_in: $genre_in")
            variables["genre_in"] = genres

        if tags:
            var_defs.append("$tag_in: [String]")
            media_args.append("tag_in: $tag_in")
            variables["tag_in"] = tags

        if country:
            var_defs.append("$countryOfOrigin: CountryCode")
            media_args.append("countryOfOrigin: $countryOfOrigin")
            variables["countryOfOrigin"] = country

        if format_in:
            var_defs.append("$format_in: [MediaFormat]")
            media_args.append("format_in: $format_in")
            variables["format_in"] = format_in

        if status:
            var_defs.append("$status: MediaStatus")
            media_args.append("status: $status")
            variables["status"] = status

        if year_greater:
            var_defs.append("$startDate_greater: FuzzyDateInt")
            media_args.append("startDate_greater: $startDate_greater")
            variables["startDate_greater"] = year_greater * 10000  # AniList uses YYYYMMDD format

        if year_lesser:
            var_defs.append("$startDate_lesser: FuzzyDateInt")
            media_args.append("startDate_lesser: $startDate_lesser")
            variables["startDate_lesser"] = year_lesser * 10000 + 9999

        # Build page-level args string - separate page args from media args
        page_args = "page: $page, perPage: $perPage"
        media_filter_args = ", ".join(
            a for a in media_args if a not in ("page: $page", "perPage: $perPage")
        )

        graphql_query = f"""
        query ({', '.join(var_defs)}) {{
            Page({page_args}) {{
                pageInfo {{ total currentPage lastPage hasNextPage perPage }}
                media({media_filter_args}) {{
                    id
                    title {{ romaji english native }}
                    coverImage {{ large medium }}
                    description
                    status
                    chapters
                    averageScore
                    popularity
                    countryOfOrigin
                    format
                    startDate {{ year }}
                    genres
                    tags {{ name rank }}
                }}
            }}
        }}
        """

        result = await self._graphql_request(graphql_query, variables)
        await cache_service.set_cached(cache_key, result, CacheTTL.SEARCH_RESULTS, "anilist")
        return result

    async def search_manga(self, query: str, page: int = 1, per_page: int = 20) -> Dict[str, Any]:
        """
        Search for manga on AniList

        Args:
            query: Search query
            page: Page number
            per_page: Results per page

        Returns:
            Search results
        """
        # Check cache
        cache_key = f"anilist:search:{query}:{page}:{per_page}"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        graphql_query = """
        query ($search: String, $page: Int, $perPage: Int) {
            Page(page: $page, perPage: $perPage) {
                pageInfo {
                    total
                    currentPage
                    lastPage
                    hasNextPage
                    perPage
                }
                media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                    synonyms
                    coverImage {
                        large
                        medium
                    }
                    description
                    status
                    chapters
                    volumes
                    averageScore
                    meanScore
                    popularity
                    startDate {
                        year
                        month
                        day
                    }
                    genres
                    tags {
                        name
                        rank
                    }
                }
            }
        }
        """

        variables = {"search": query, "page": page, "perPage": per_page}

        result = await self._graphql_request(graphql_query, variables)

        # Cache result
        await cache_service.set_cached(cache_key, result, CacheTTL.SEARCH_RESULTS, "anilist")

        logger.info(
            f"AniList search for '{query}' returned {len(result.get('Page', {}).get('media', []))} results"
        )
        return result

    async def get_manga_details(self, manga_id: int) -> Optional[Dict[str, Any]]:
        """
        Get detailed manga information by ID

        Args:
            manga_id: AniList manga ID

        Returns:
            Manga details or None if not found
        """
        # Check cache
        cache_key = f"anilist:manga:{manga_id}"
        cached = await cache_service.get_with_fallback(cache_key, "anilist")
        if cached:
            return cached

        query = """
        query ($id: Int) {
            Media(id: $id, type: MANGA) {
                id
                title {
                    romaji
                    english
                    native
                }
                synonyms
                coverImage {
                    large
                    extraLarge
                }
                bannerImage
                description
                status
                chapters
                volumes
                averageScore
                meanScore
                popularity
                favourites
                startDate {
                    year
                    month
                    day
                }
                endDate {
                    year
                    month
                    day
                }
                genres
                tags {
                    name
                    description
                    rank
                    isMediaSpoiler
                }
                staff {
                    edges {
                        node {
                            name {
                                full
                            }
                        }
                        role
                    }
                }
            }
        }
        """

        variables = {"id": manga_id}

        try:
            result = await self._graphql_request(query, variables)
            manga_data = result.get("Media")

            if manga_data:
                # Cache result
                await cache_service.set_cached(
                    cache_key, manga_data, CacheTTL.MANGA_DETAILS, "anilist"
                )
                logger.info(f"Fetched manga details for ID {manga_id}")
                return manga_data

            return None

        except Exception as e:
            logger.error(f"Failed to fetch manga details for ID {manga_id}: {e}")
            return None

    async def add_manga_to_list(
        self,
        token: str,
        manga_id: int,
        status: str = "PLANNING",
        progress: int = 0,
        score: Optional[float] = None,
        user_id: Optional[int] = None,
    ) -> Dict[str, Any]:
        """
        Add manga to user's list

        Args:
            token: OAuth access token
            manga_id: AniList manga ID
            status: List status (READING, COMPLETED, PAUSED, DROPPED, PLANNING)
            progress: Current progress (chapters read)
            score: User score (0-10)

        Returns:
            Created list entry
        """
        mutation = """
        mutation ($mediaId: Int, $status: MediaListStatus, $progress: Int, $score: Float) {
            SaveMediaListEntry(mediaId: $mediaId, status: $status, progress: $progress, score: $score) {
                id
                status
                progress
                score
                media {
                    id
                    title {
                        romaji
                        english
                        native
                    }
                }
            }
        }
        """

        variables = {"mediaId": manga_id, "status": status, "progress": progress}

        if score is not None:
            variables["score"] = score

        result = await self._graphql_request(mutation, variables, token)
        logger.info(f"Added manga {manga_id} to user's list with status {status}")

        if user_id:
            await cache_service.invalidate_pattern(f"anilist:user:{user_id}:*", "anilist")

        return result.get("SaveMediaListEntry", {})

    async def update_manga_in_list(
        self, token: str, entry_id: int, updates: Dict[str, Any], user_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """
        Update manga entry in user's list

        Args:
            token: OAuth access token
            entry_id: List entry ID
            updates: Dictionary of fields to update (status, progress, score, etc.)

        Returns:
            Updated list entry
        """
        mutation = """
        mutation (
            $id: Int,
            $status: MediaListStatus,
            $progress: Int,
            $score: Float,
            $repeat: Int,
            $notes: String
        ) {
            SaveMediaListEntry(
                id: $id,
                status: $status,
                progress: $progress,
                score: $score,
                repeat: $repeat,
                notes: $notes
            ) {
                id
                status
                progress
                score
                repeat
                notes
                updatedAt
            }
        }
        """

        variables = {"id": entry_id, **updates}

        result = await self._graphql_request(mutation, variables, token)
        logger.info(f"Updated list entry {entry_id}")

        if user_id:
            await cache_service.invalidate_pattern(f"anilist:user:{user_id}:*", "anilist")

        return result.get("SaveMediaListEntry", {})

    async def delete_manga_from_list(
        self, token: str, entry_id: int, user_id: Optional[int] = None
    ) -> bool:
        """
        Delete manga from user's list

        Args:
            token: OAuth access token
            entry_id: List entry ID

        Returns:
            True if deleted successfully
        """
        mutation = """
        mutation ($id: Int) {
            DeleteMediaListEntry(id: $id) {
                deleted
            }
        }
        """

        variables = {"id": entry_id}

        try:
            result = await self._graphql_request(mutation, variables, token)
            logger.info(f"Deleted list entry {entry_id}")

            if user_id:
                await cache_service.invalidate_pattern(f"anilist:user:{user_id}:*", "anilist")

            return result.get("DeleteMediaListEntry", {}).get("deleted", False)
        except Exception as e:
            logger.error(f"Failed to delete entry {entry_id}: {e}")
            return False


# Global AniList client instance
anilist_client = AniListClient()
