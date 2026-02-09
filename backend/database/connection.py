# Database connection management
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo import ASCENDING, DESCENDING
from typing import Optional
import logging
from backend.config.settings import settings

logger = logging.getLogger(__name__)

# Global database client
_client: Optional[AsyncIOMotorClient] = None
_db = None


async def connect_db():
    """Initialize MongoDB connection and create indexes"""
    global _client, _db

    try:
        logger.info(f"Connecting to MongoDB at {settings.MONGODB_URL}")
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
        _db = _client[settings.MONGODB_DB_NAME]

        # Test connection
        await _client.admin.command('ping')
        logger.info("MongoDB connection established successfully")

        # Create indexes
        await create_indexes()

    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_db():
    """Close MongoDB connection"""
    global _client

    if _client:
        _client.close()
        logger.info("MongoDB connection closed")


def get_db():
    """Get database instance"""
    if _db is None:
        raise RuntimeError("Database not initialized. Call connect_db() first.")
    return _db


async def create_indexes():
    """Create database indexes for optimal query performance"""
    db = get_db()

    try:
        # Users collection indexes
        await db.users.create_index([("anilist_id", ASCENDING)], unique=True)
        await db.users.create_index([("username", ASCENDING)])
        logger.info("Created indexes for 'users' collection")

        # Manhwa connections collection indexes
        await db.manhwa_connections.create_index([
            ("user_id", ASCENDING),
            ("anilist_id", ASCENDING)
        ], unique=True)
        await db.manhwa_connections.create_index([("user_id", ASCENDING)])
        await db.manhwa_connections.create_index([("anilist_id", ASCENDING)])
        await db.manhwa_connections.create_index([("mangadex_id", ASCENDING)])
        await db.manhwa_connections.create_index([("match_confidence", DESCENDING)])
        logger.info("Created indexes for 'manhwa_connections' collection")

        # AniList cache collection with TTL index
        await db.anilist_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
        await db.anilist_cache.create_index([("user_id", ASCENDING)])
        logger.info("Created TTL indexes for 'anilist_cache' collection")

        # MangaDex cache collection with TTL index
        await db.mangadex_cache.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
        logger.info("Created TTL indexes for 'mangadex_cache' collection")

        logger.info("All database indexes created successfully")

    except Exception as e:
        logger.error(f"Failed to create indexes: {e}")
        raise


# Helper functions for database operations
async def get_collection(collection_name: str):
    """Get a collection from the database"""
    db = get_db()
    return db[collection_name]


async def health_check() -> bool:
    """Check database health"""
    try:
        if _client is None:
            return False
        await _client.admin.command('ping')
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False
