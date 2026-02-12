// MongoDB initialization script
// Creates collections, indexes, and TTL indexes for the manhwa_discovery database

db = db.getSiblingDB('manhwa_discovery');

// --- Users collection ---
db.createCollection('users');
db.users.createIndex({ "anilist_id": 1 }, { unique: true });
db.users.createIndex({ "username": 1 });

// --- Manhwa connections (AniList <-> MangaDex links) ---
db.createCollection('manhwa_connections');
db.manhwa_connections.createIndex({ "user_id": 1, "anilist_id": 1 }, { unique: true });
db.manhwa_connections.createIndex({ "user_id": 1, "mangadex_id": 1 });
db.manhwa_connections.createIndex({ "user_id": 1 });

// --- AniList API response cache with TTL ---
db.createCollection('anilist_cache');
db.anilist_cache.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });
db.anilist_cache.createIndex({ "user_id": 1 });

// --- MangaDex API response cache with TTL ---
db.createCollection('mangadex_cache');
db.mangadex_cache.createIndex({ "expires_at": 1 }, { expireAfterSeconds: 0 });

// --- Search history with 30-day TTL ---
db.createCollection('search_history');
db.search_history.createIndex({ "created_at": 1 }, { expireAfterSeconds: 2592000 }); // 30 days
db.search_history.createIndex({ "user_id": 1 });

print('--- manhwa_discovery database initialized ---');
print('Collections: users, manhwa_connections, anilist_cache, mangadex_cache, search_history');
print('All indexes and TTL indexes created.');
