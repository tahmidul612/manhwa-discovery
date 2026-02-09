# BACKEND API KNOWLEDGE BASE

FastAPI routes + middleware (JWT auth, rate limiting). Endpoints for OAuth, user lists, search, and link management.

## STRUCTURE

```text
api/
├── routes/
│   ├── auth.py       # AniList OAuth callback, JWT creation (120L)
│   ├── user.py       # User lists, sync, connections (333L)
│   └── manhwa.py     # Search, trending, linking (899L)
└── middleware/
    ├── auth.py       # JWT verification, dependency injection (80L)
    └── rate_limit.py # Request throttling (stub)
```

## WHERE TO LOOK

| Task | File | Lines | Notes |
| ------ | ------ | ------- | ------- |
| Add OAuth provider | `routes/auth.py` | - | Follow AniList pattern |
| Modify JWT payload | `middleware/auth.py` | 25-35 | Token creation logic |
| Add search filter | `routes/manhwa.py` | 50-100 | Update `SearchParams` model |
| Change auto-match | `routes/user.py` | 200-250 | `auto_link_entry()` endpoint |
| Add rate limit | `middleware/rate_limit.py` | - | Currently stub |
| Parse new API response | `routes/manhwa.py` | 700-850 | `_parse_*()` helpers |

## CONVENTIONS

**Route Organization:**

- One router per domain (`auth`, `user`, `manhwa`)
- Tag routers in `main.py`: `app.include_router(auth.router, prefix="/auth", tags=["auth"])`
- Use FastAPI automatic OpenAPI generation (`/docs`)

**Authentication:**

- Protected routes: `Depends(get_current_user)` → raises 401 if missing/invalid
- Optional auth: `Depends(get_optional_user)` → returns None if missing (for public endpoints)
- JWT payload: `{sub: user_id, anilist_id, exp, iat}`
- Token header: `Authorization: Bearer {token}`

**Response Models:**

- Use Pydantic models for request/response schemas
- Exclude sensitive fields (e.g., `UserResponse` excludes tokens)
- Return `JSONResponse` for custom status codes

**Error Handling:**

- Use `HTTPException(status_code=..., detail=...)` for client errors
- Log full errors server-side, return generic messages to clients
- Raise custom errors from `utils/errors.py` for domain logic

## ANTI-PATTERNS

- **NEVER skip JWT auth on protected routes** — Always use `Depends(get_current_user)`
- **NEVER expose internal errors to clients** — Log server-side, return generic message
- **NEVER use sync DB calls** — All routes are async, use `await` for DB ops
- **NEVER return raw exceptions** — Wrap in `HTTPException` or custom error

## UNIQUE PATTERNS

**Dual-Platform Search (manhwa.py):**

```python
# Parallel queries to AniList + MangaDex
anilist_task = asyncio.create_task(anilist_client.search_manga(...))
mangadex_task = asyncio.create_task(mangadex_client.search_manga(...))
anilist_results, mangadex_results = await asyncio.gather(anilist_task, mangadex_task)
```

**Result Deduplication:**

- Parse both AniList and MangaDex results
- Check for existing connections in MongoDB
- Mark linked entries with `is_linked: true` and connection metadata

**Parsing Helpers (manhwa.py lines 700-850):**

- `_parse_mangadex_manga()`: Extracts cover URL from relationships, maps tags
- `_parse_anilist_manga()`: Normalizes title structure, maps status enums

**OAuth Flow (auth.py):**

1. Frontend redirects to `/auth/anilist/login` → returns AniList authorization URL
2. AniList redirects to `/auth/anilist/callback?code={code}`
3. Backend exchanges code for token → creates/updates user in MongoDB → creates JWT
4. Redirects to frontend with JWT in query param

## NOTES

**CORS:** Configured in `main.py` for `localhost:3009` and `localhost:5173`. Update for production domains.

**Health Check:** `/health` endpoint in `main.py` checks MongoDB + Redis connectivity.

**Rate Limiting:** `middleware/rate_limit.py` is a stub — not yet implemented.

**GraphQL vs REST:** AniList uses GraphQL (complex nested queries), MangaDex uses REST (simpler pagination).
