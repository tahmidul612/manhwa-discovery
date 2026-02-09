# BACKEND KNOWLEDGE BASE

Python 3.14 FastAPI server with async MongoDB (Motor), Redis caching, and external API integrations (AniList GraphQL, MangaDex REST).

## STRUCTURE

```text
backend/
├── api/              # Routes + middleware (auth, rate limit)
├── services/         # External API clients (AniList, MangaDex, comparison)
├── models/           # Pydantic data models (user, manhwa, connections)
├── database/         # MongoDB connection + two-tier cache
├── config/           # Pydantic settings from .env
├── utils/            # Errors, validators (stub), logger (stub)
└── main.py           # FastAPI app entry point, lifespan management
```

## WHERE TO LOOK

| Task | Location | Notes |
| ------ | ---------- | ------- |
| Start local dev | `uv run uvicorn backend.main:app --reload` | Auto-reload on changes |
| Add route | `api/routes/{domain}.py` | Import in `main.py` to register |
| Add external API | `services/{service}/client.py` | Follow AniList/MangaDex pattern |
| Modify data model | `models/{domain}.py` | Pydantic schemas with validation |
| Change cache TTL | `database/cache.py` | Lines 12-20 (constants) |
| Add custom error | `utils/errors.py` | Inherit from `ManhwaDiscoveryError` |
| Environment config | `config/settings.py` | Add field to `Settings` class |
| Health check | `main.py` | Lines 91-105 (`/health` endpoint) |

## CONVENTIONS

**Package Manager:** `uv` (not pip/poetry)

- Install: `uv sync`
- Run: `uv run {command}`
- Lock file: `uv.lock` (not requirements.txt)

**Code Style:**

- Black + Ruff (defaults, no custom config)
- Type hints required on all functions
- Docstrings on public functions
- Async/await for all external API calls
- Use `asyncio.gather()` for parallelism

**Architecture Patterns:**

- **Singleton services:** `comparison_service`, `mangadex_client`, `anilist_client`, `cache_service` (global instances)
- **Dependency injection:** JWT auth via `Depends(get_current_user)`
- **Lifespan management:** Startup/shutdown in `main.py` (MongoDB, Redis, external clients)
- **Two-tier caching:** Redis L1 (fast) → MongoDB L2 (persistent) with fallback

**Logging:**

- Conditional level: INFO (default) or DEBUG (if `DEBUG=true`)
- Format: `'%(asctime)s - %(name)s - %(levelname)s - %(message)s'`
- Logger per module: `logger = logging.getLogger(__name__)`

## ANTI-PATTERNS

- **NEVER use sync DB calls** — Use `motor` (async), not `pymongo` (sync)
- **NEVER skip JWT auth** — All protected routes need `Depends(get_current_user)`
- **NEVER lower auto-match confidence below 0.80** — Degrades link quality
- **NEVER commit .env** — Contains secrets (OAuth, JWT, API keys)
- **NEVER enable DEBUG in prod** — Exposes stack traces and env vars

## UNIQUE PATTERNS

**Fuzzy Matching Engine:** 5-stage confidence scoring in `services/comparison.py`

- Exact match (normalized) → 1.00
- High fuzzy (>95%) → 0.95
- Strong fuzzy (>85%) + year ± 1 → 0.90
- Alt titles (>90%) → 0.85
- Token overlap (>70%) + year → 0.80

**Cache Key Format:** `{service}:{resource}:{id}:{params}`

- Example: `anilist:user:123:list:reading`
- Pattern invalidation: `invalidate_pattern("anilist:user:123:*")`

**Rate Limiting:** MangaDex client enforces 5 req/sec with exponential backoff (2^attempt seconds, max 3 retries).

**Graceful Fallback:** If Redis unavailable, cache service switches to MongoDB-only mode with warning log.

## NOTES

**Entry Point:** `main.py` exports `app` (FastAPI instance) and `main()` (uvicorn dev server).

**Route Registration:** Import routers in `main.py` lines 120-124. FastAPI auto-generates OpenAPI docs at `/docs`.

**Middleware Order:** CORS → Auth → Rate Limit → Routes (defined by registration order in `main.py`).

**Database Indexes:** Created automatically on app startup via `create_indexes()` in `database/connection.py`.

**Test Infrastructure:** Pytest stubs exist in `/tests/backend/` but not implemented. No test runner in docker-compose.
