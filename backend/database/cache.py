# Two-tier caching layer (Redis L1 + MongoDB L2)
import hashlib
import json
import logging
from typing import Optional, Any, Dict
from datetime import datetime, timedelta
import redis.asyncio as redis
from backend.config.settings import settings
from backend.database.connection import get_db

logger = logging.getLogger(__name__)


class CacheService:
    """Two-tier cache service with Redis (L1) and MongoDB TTL (L2) fallback"""

    def __init__(self):
        self._redis: Optional[redis.Redis] = None
        self._connected = False

    async def connect(self):
        """Initialize Redis connection"""
        if not settings.CACHE_ENABLED:
            logger.info("Caching is disabled")
            return

        try:
            self._redis = await redis.from_url(
                settings.REDIS_URL, encoding="utf-8", decode_responses=True
            )
            await self._redis.ping()
            self._connected = True
            logger.info("Redis connection established")
        except Exception as e:
            logger.warning(f"Failed to connect to Redis: {e}. Will use MongoDB-only caching.")
            self._connected = False

    async def close(self):
        """Close Redis connection"""
        if self._redis:
            await self._redis.close()
            logger.info("Redis connection closed")

    async def get_with_fallback(
        self, key: str, cache_type: str = "mangadex"
    ) -> Optional[Dict[str, Any]]:
        """
        Get cached value with L1 (Redis) -> L2 (MongoDB) fallback

        Args:
            key: Cache key
            cache_type: Cache collection type ("mangadex" or "anilist")

        Returns:
            Cached data if found, None otherwise
        """
        # Try Redis first (L1)
        if self._connected and self._redis:
            try:
                redis_value = await self._redis.get(key)
                if redis_value:
                    logger.debug(f"Cache hit (Redis): {key}")
                    return json.loads(redis_value)
            except Exception as e:
                logger.warning(f"Redis get failed for key {key}: {e}")

        # Fallback to MongoDB (L2)
        try:
            db = get_db()
            collection_name = f"{cache_type}_cache"
            collection = db[collection_name]

            cached_doc = await collection.find_one({"_id": key})
            if cached_doc:
                # Check if expired (shouldn't happen with TTL, but double-check)
                if cached_doc.get("expires_at", datetime.min) > datetime.utcnow():
                    logger.debug(f"Cache hit (MongoDB): {key}")
                    data = cached_doc.get("data")

                    # Repopulate Redis if available
                    if self._connected and self._redis and data:
                        try:
                            ttl_seconds = int(
                                (cached_doc["expires_at"] - datetime.utcnow()).total_seconds()
                            )
                            if ttl_seconds > 0:
                                await self._redis.setex(key, ttl_seconds, json.dumps(data))
                        except Exception as e:
                            logger.warning(f"Failed to repopulate Redis: {e}")

                    return data
                else:
                    # Expired entry, delete it
                    await collection.delete_one({"_id": key})
        except Exception as e:
            logger.error(f"MongoDB cache get failed for key {key}: {e}")

        logger.debug(f"Cache miss: {key}")
        return None

    async def get_stale(self, key: str, cache_type: str = "mangadex") -> Optional[Dict[str, Any]]:
        """
        Get cached value even if expired (for fallback on API errors)

        Args:
            key: Cache key
            cache_type: Cache collection type ('mangadex' or 'anilist')

        Returns:
            Cached data if found (even if expired), None otherwise
        """
        # Try MongoDB even for expired data
        try:
            db = get_db()
            collection_name = f"{cache_type}_cache"
            collection = db[collection_name]

            cached_doc = await collection.find_one({"_id": key})
            if cached_doc:
                logger.info(
                    f"Serving stale cache: {key} (expired at {cached_doc.get('expires_at')})"
                )
                return cached_doc.get("data")
        except Exception as e:
            logger.error(f"Failed to get stale cache for key {key}: {e}")

        return None

    async def set_cached(
        self,
        key: str,
        value: Dict[str, Any],
        ttl: int,
        cache_type: str = "mangadex",
        user_id: Optional[str] = None,
    ):
        """
        Set cached value in both L1 (Redis) and L2 (MongoDB)

        Args:
            key: Cache key
            value: Data to cache
            ttl: Time to live in seconds
            cache_type: Cache collection type ("mangadex" or "anilist")
            user_id: Optional user ID for user-specific caching
        """
        if not settings.CACHE_ENABLED:
            return

        # Write to Redis (L1)
        if self._connected and self._redis:
            try:
                await self._redis.setex(key, ttl, json.dumps(value))
                logger.debug(f"Cached to Redis: {key} (TTL: {ttl}s)")
            except Exception as e:
                logger.warning(f"Redis set failed for key {key}: {e}")

        # Write to MongoDB (L2)
        try:
            db = get_db()
            collection_name = f"{cache_type}_cache"
            collection = db[collection_name]

            cache_doc = {
                "_id": key,
                "data": value,
                "expires_at": datetime.utcnow() + timedelta(seconds=ttl),
                "created_at": datetime.utcnow(),
            }

            if user_id:
                cache_doc["user_id"] = user_id

            await collection.update_one({"_id": key}, {"$set": cache_doc}, upsert=True)
            logger.debug(f"Cached to MongoDB: {key} (TTL: {ttl}s)")
        except Exception as e:
            logger.error(f"MongoDB cache set failed for key {key}: {e}")

    async def invalidate(self, key: str, cache_type: str = "mangadex"):
        """
        Invalidate (delete) cached entry from both layers

        Args:
            key: Cache key
            cache_type: Cache collection type ("mangadex" or "anilist")
        """
        # Delete from Redis
        if self._connected and self._redis:
            try:
                await self._redis.delete(key)
                logger.debug(f"Invalidated from Redis: {key}")
            except Exception as e:
                logger.warning(f"Redis delete failed for key {key}: {e}")

        # Delete from MongoDB
        try:
            db = get_db()
            collection_name = f"{cache_type}_cache"
            collection = db[collection_name]
            await collection.delete_one({"_id": key})
            logger.debug(f"Invalidated from MongoDB: {key}")
        except Exception as e:
            logger.error(f"MongoDB cache delete failed for key {key}: {e}")

    async def invalidate_pattern(self, pattern: str, cache_type: str = "mangadex"):
        """
        Invalidate all keys matching a pattern (Redis only for efficiency)

        Args:
            pattern: Key pattern (e.g., "user:123:*")
            cache_type: Cache collection type ("mangadex" or "anilist")
        """
        if self._connected and self._redis:
            try:
                cursor = 0
                while True:
                    cursor, keys = await self._redis.scan(cursor, match=pattern, count=100)
                    if keys:
                        await self._redis.delete(*keys)
                    if cursor == 0:
                        break
                logger.debug(f"Invalidated pattern from Redis: {pattern}")
            except Exception as e:
                logger.warning(f"Redis pattern delete failed for {pattern}: {e}")

    async def clear_user_cache(self, user_id: str):
        """
        Clear all cache entries for a specific user

        Args:
            user_id: User ID
        """
        # Clear Redis pattern (matches cache keys like "anilist:user:{id}:list:*")
        await self.invalidate_pattern(f"anilist:user:{user_id}:*", "anilist")

        # Clear MongoDB entries
        try:
            db = get_db()
            await db.anilist_cache.delete_many({"user_id": user_id})
            logger.info(f"Cleared all cache for user {user_id}")
        except Exception as e:
            logger.error(f"Failed to clear user cache: {e}")

    def is_connected(self) -> bool:
        """Check if Redis is connected"""
        return self._connected


# Global cache service instance
cache_service = CacheService()


def deterministic_hash(value: str) -> str:
    """Create a deterministic short hash for use in cache keys."""
    return hashlib.md5(value.encode()).hexdigest()[:12]


# Cache TTL constants (in seconds)
class CacheTTL:
    USER_LISTS = 300  # 5 minutes
    MANGA_DETAILS = 3600  # 1 hour
    SEARCH_RESULTS = 900  # 15 minutes
    RATE_LIMIT = 60  # 1 minute
    CHAPTER_COUNT = 7200  # 2 hours
    USER_LISTS_MONGO = 1800  # 30 minutes (MongoDB fallback)
    MANGA_DETAILS_MONGO = 86400  # 24 hours (MongoDB fallback)
    SEARCH_RESULTS_MONGO = 3600  # 1 hour (MongoDB fallback)
