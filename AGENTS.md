# MANHWA-DISCOVERY KNOWLEDGE BASE

**Generated:** 2026-02-09 02:52 EST  
**Commit:** 1dd8a8e  
**Branch:** main

## OVERVIEW

Unified manga/manhwa discovery platform that bridges AniList reading lists with MangaDex catalog through fuzzy-matched linking, OAuth authentication, and dual-tier caching.

**Stack:** Python 3.14 + FastAPI + Motor (MongoDB) + Redis / React 18 + Vite + Tailwind + Zustand

## STRUCTURE

```text
manhwa-discovery/
├── backend/              # FastAPI server (Python 3.14, uv pkg manager)
│   ├── api/              # Routes (auth, user, manhwa) + middleware
│   ├── services/         # External APIs: AniList (GraphQL), MangaDex (REST), comparison engine
│   ├── models/           # Pydantic schemas (user, manhwa, connections)
│   ├── database/         # MongoDB (Motor) + two-tier cache (Redis L1 → MongoDB L2)
│   ├── config/           # Pydantic settings from .env
│   ├── utils/            # Errors, validators (stubs), logger (stub)
│   └── main.py           # Entry point, lifespan manager
│
├── frontend/             # React 18 + Vite (port 3009)
│   ├── src/              # main.jsx, App.jsx (router setup)
│   ├── pages/            # Home, search, profile, manhwa/[id]
│   ├── components/       # ManhwaCard, SearchBar, UserListView, FilterPanel, etc.
│   ├── services/         # Axios client, auth helpers
│   ├── stores/           # Zustand (auth state + localStorage)
│   ├── utils/            # Formatters, storage wrappers
│   └── styles/           # Tailwind globals (glass-morphism theme)
│
├── tests/                # Pytest (backend) + Jest (frontend) — all stubs, not implemented
├── docker-compose.yml    # Dev stack: backend, frontend, MongoDB, Redis with health checks
├── mongo-init.js         # DB initialization: collections, indexes, TTL setup
├── pyproject.toml        # uv dependencies (FastAPI, motor, redis, rapidfuzz, pytest, black, ruff)
└── .env.example          # Config template (AniList OAuth, MongoDB, Redis, JWT secrets)
```

## WHERE TO LOOK

| Task | Location | Notes |
| ------ | ---------- | ------- |
| Start dev server | `docker compose up` | Starts all 4 services with live reload |
| Backend entry | `backend/main.py` | FastAPI app, lifespan, CORS, route registration |
| Frontend entry | `frontend/src/main.jsx` → `App.jsx` | React Query + Router setup |
| AniList OAuth | `backend/api/routes/auth.py` | Token exchange, JWT creation, user upsert |
| Search/discovery | `backend/api/routes/manhwa.py` (899L) | Dual-platform search, deduplication, linking |
| Fuzzy matching | `backend/services/comparison.py` (395L) | 5-stage confidence scoring (0.80-1.00) |
| AniList client | `backend/services/anilist/client.py` (855L) | GraphQL queries, OAuth, list management |
| MangaDex client | `backend/services/mangadex/client.py` (392L) | REST API, rate limiter (5 req/s), retry logic |
| Cache layer | `backend/database/cache.py` (235L) | Redis L1 + MongoDB L2 fallback, TTL management |
| Data models | `backend/models/manhwa.py`, `user.py` | Pydantic schemas, enums, unified data structures |
| UI components | `frontend/components/` | 8 components (cards, search, filters, modals) |
| Pages/routing | `frontend/pages/` | Home, search, profile, detail (Next.js-style naming) |
| Tests | `tests/backend/`, `tests/frontend/` | Stubs only — pytest/jest not configured |

## CONVENTIONS

**Python (Backend):**

- **Package manager:** `uv` (not pip/poetry) — install via `uv sync`, run via `uv run`
- **Formatters:** Black (defaults), Ruff (defaults) — no custom config
- **Type hints:** Required on all functions
- **Logging:** Conditional (INFO default, DEBUG if `DEBUG=true`)
- **Async/await:** All external API calls async; use `asyncio.gather()` for parallelism
- **Singleton pattern:** `comparison_service`, `mangadex_client`, `anilist_client`, `cache_service`

**JavaScript (Frontend):**

- **File structure:** Non-standard — `src/` only has main.jsx/App.jsx; components/pages/services at root level
- **Route naming:** Next.js-style bracket notation (`manhwa/[id].jsx`) but manual React Router v6 definitions
- **Port:** 3009 (not Vite default 5173)
- **State:** Zustand with localStorage persistence (`auth-storage` key)
- **API calls:** Axios with JWT Bearer token injection, 30s timeout
- **Styling:** Tailwind with custom glass-morphism theme (dark mode, indigo/purple accents)
- **No ESLint/Prettier:** Uses Vite defaults

**Database:**

- **Collections:** users, manhwa_connections, anilist_cache, mangadex_cache, search_history
- **Indexes:** Unique on user.anilist_id, compound on connections(user_id + anilist_id), TTL on caches
- **Cache keys:** `{service}:{resource}:{id}:{params}` (e.g., `anilist:user:123:list:reading`)

**Docker:**

- **Dev:** Volumes mounted for live reload (backend auto-reloads, frontend HMR)
- **Prod:** Multi-stage builds (backend 4 workers, frontend nginx), no volumes

## ANTI-PATTERNS (THIS PROJECT)

**Security (CRITICAL):**

- **NEVER commit .env** — Contains AniList OAuth secrets, JWT keys, API credentials
- **NEVER use default secrets in prod** — Change `JWT_SECRET="change-me-in-production"`
- **NEVER enable DEBUG in prod** — Exposes stack traces, env vars, internal paths
- **NEVER store unencrypted OAuth tokens** — Currently stored plain in MongoDB (TODO: encrypt)
- **NEVER expose error details to clients** — Log server-side, return generic messages

**Code Quality:**

- **NEVER use `as any` or `@ts-ignore`** — Type errors must be fixed, not suppressed
- **NEVER skip JWT auth** — Use `Depends(get_current_user)` on protected routes
- **NEVER use sync DB calls in async context** — Use `motor` (async), not `pymongo` (sync)
- **NEVER lower auto-match confidence below 0.80** — Causes poor link quality

**Development:**

- **NEVER push to main without testing** — No CI/CD; manual testing required
- **NEVER delete failing tests to "pass"** — Tests are stubs; implement don't delete
- **NEVER commit secrets in comments** — No API keys, tokens, or passwords in code

## UNIQUE STYLES

**Two-Tier Caching:** Redis (L1, 5-60min) → MongoDB TTL (L2, 30min-24hr) with automatic fallback if Redis unavailable.

**Fuzzy Matching:** 5-stage confidence scoring:

1. Exact match (normalized) → 1.00
2. High fuzzy (>95% similarity) → 0.95
3. Strong fuzzy (>85%) + year validation (±1yr) → 0.90
4. Alt titles match (>90%) → 0.85
5. Token overlap (>70%) + year → 0.80

Auto-matches at ≥0.85 confidence; <0.70 rejected; 0.70-0.85 manual review.

**Next.js Naming in React Router:** Files named `[id].jsx` but React Router v6 requires manual route definitions — cosmetic only.

**Dual-Source Architecture:** Manga data from AniList OR MangaDex, unified into single `Manhwa` model with `source` field. Connections link AniList ↔ MangaDex per user.

## COMMANDS

```bash
# Development (Docker)
docker compose up                                   # Start all 4 services with live reload
docker compose up --build                           # Rebuild after dependency changes
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d  # Production

# Backend (local, without Docker)
uv sync                                             # Install dependencies
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8009 --reload  # Dev server
uv run pytest                                       # Run tests (not configured)
uv run black backend/                               # Format code
uv run ruff check backend/                          # Lint code

# Frontend (local, without Docker)
cd frontend
npm install                                         # Install dependencies
npm run dev                                         # Vite dev server on port 3009
npm run build                                       # Build for production
npm run preview                                     # Preview production build

# Database
curl http://localhost:8009/health                   # Check DB + cache status
```

## NOTES

**OAuth Flow:** User clicks "Login with AniList" → redirected to AniList → callback to backend `/auth/anilist/callback` → token exchange → user upserted to MongoDB → JWT created → frontend stores in localStorage.

**Search Flow:** Frontend → backend `/manhwa/search` → parallel queries to AniList + MangaDex (cached) → fuzzy match/deduplicate → enrich with user connections → return unified results.

**Auto-Linking:** On user sync (`/users/{id}/sync`), comparison service fuzzy-matches entire AniList library against MangaDex, storing connections with confidence scores ≥0.85.

**Rate Limiting:** MangaDex enforces 5 req/sec; client implements exponential backoff on 429 errors (2^attempt seconds, max 3 retries).

**Cache Invalidation:** Pattern-based for Redis (`invalidate_pattern()`), document-based for MongoDB. User cache cleared on sync.

**Testing:** Infrastructure exists but stubs only — pytest/jest not configured, no test runner in docker-compose, no CI/CD.

**Gotchas:**

- Frontend uses Next.js-style `[id].jsx` naming but React Router doesn't auto-parse — routes manually defined in App.jsx
- Tests exist but are empty stubs with TODO comments (78 lines total)
- `requirements.txt` exists but unused — `uv.lock` is the actual dependency lock
- Redis unavailable → graceful fallback to MongoDB-only caching (check logs for ⚠)
