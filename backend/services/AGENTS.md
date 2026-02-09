# BACKEND SERVICES KNOWLEDGE BASE

External API integrations: AniList (GraphQL OAuth), MangaDex (REST with rate limiting), and fuzzy matching engine.

## STRUCTURE

```text
services/
├── anilist/
│   └── client.py     # AniList GraphQL API (OAuth2, user lists, manga queries)
├── mangadex/
│   └── client.py     # MangaDex REST API (rate limiter, retry logic, search)
└── comparison.py     # Fuzzy matching engine (5-stage confidence scoring)
```

## WHERE TO LOOK

| Task | File | Lines | Notes |
| ------ | ------ | ------- | ------- |
| AniList OAuth flow | `anilist/client.py` | 35-80 | Token exchange, refresh |
| User manga lists | `anilist/client.py` | 120-200 | Grouped by status |
| AniList search | `anilist/client.py` | 300-400 | GraphQL queries with filters |
| MangaDex search | `mangadex/client.py` | 80-150 | REST with pagination |
| Rate limiting | `mangadex/client.py` | 40-70 | 5 req/sec enforcer |
| Retry logic | `mangadex/client.py` | 50-65 | Exponential backoff |
| Fuzzy matching | `comparison.py` | 100-250 | Title normalization + scoring |
| Auto-match user list | `comparison.py` | 300-395 | Batch matching with threshold |

## CONVENTIONS

**Singleton Pattern:** All service clients are global instances

- `anilist_client = AniListClient()` (instantiated once)
- `mangadex_client = MangaDexClient()` (instantiated once)
- `comparison_service = ComparisonService()` (instantiated once)

**Async/Await:** All API calls are async

- Use `await client.method()` in route handlers
- Use `asyncio.gather()` for parallel requests (e.g., search both AniList + MangaDex)

**Caching:** All clients use `cache_service.get_with_fallback()`

- Cache keys: `{service}:{resource}:{id}:{params}`
- TTLs: User lists (5min Redis/30min MongoDB), manga details (1hr/24hr), search (15min/1hr)

**Error Handling:**

- AniList: Falls back to public queries if token invalid
- MangaDex: Retries 429 (rate limit) and 5xx with exponential backoff (2^attempt seconds, max 3 retries)
- Both: Raise `APIError` on persistent failures

## UNIQUE PATTERNS

**AniList GraphQL Query Construction:**

- Variables extracted to `variables` dict
- Query string uses GraphQL syntax with fragments
- Nested fields accessed via dot notation (e.g., `data.Media.title.romaji`)

**MangaDex Rate Limiter:**

- Token bucket algorithm: 5 requests/second
- Enforced in `_request_with_retry()` before every request
- Blocks until token available (async sleep)

**Fuzzy Matching Stages (comparison.py):**

1. **Exact match** (normalized) → 1.00 confidence
2. **High fuzzy** (>95% ratio) → 0.95
3. **Strong fuzzy** (>85%) + year validation (±1 year) → 0.90
4. **Alternative titles** (>90% match on alt titles) → 0.85
5. **Token overlap** (>70% common tokens) + year → 0.80

**Auto-match threshold:** 0.85 (configurable via `settings.AUTO_MATCH_THRESHOLD`)

**Title Normalization Pipeline:**

- Lowercase → remove punctuation → remove articles ("the", "a", "an") → remove common prefixes ("manhwa", "manga", "webtoon") → deduplicate whitespace

## ANTI-PATTERNS

- **NEVER call external APIs without caching** — Use `cache_service.get_with_fallback()`
- **NEVER lower MangaDex rate limit below 5 req/sec** — API blocks at higher rates
- **NEVER skip year validation when available** — Improves match accuracy
- **NEVER auto-match below 0.80 confidence** — Manual review required

## NOTES

**OAuth Token Storage:** AniList tokens stored in `users` collection with expiration timestamp. Client auto-refreshes if expired.

**GraphQL Error Handling:** AniList returns 200 OK even with errors. Check `response["errors"]` field.

**MangaDex Cover Art:** Extracted from relationships array (`type: "cover_art"`) → construct URL from `fileName`.

**Comparison Service Dependencies:** Uses `rapidfuzz` library (Levenshtein distance) for fuzzy matching. Configured with `scorer=fuzz.ratio` for consistency.
