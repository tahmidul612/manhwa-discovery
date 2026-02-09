# Manhwa Discovery

Unified manga/manhwa discovery platform that bridges your AniList reading lists with MangaDex's catalog. Search, link, filter, and manage your collection from one place.

## Features

- **AniList Integration** - View your manga lists grouped by status (reading, completed, on hold, dropped, planning) via AniList OAuth
- **MangaDex Linking** - Connect AniList entries to MangaDex manga with automatic fuzzy matching; manually link, unlink, or relink at any time
- **Global Search** - Search across your AniList library and MangaDex simultaneously with fuzzy matching on primary and alternative titles
- **Smart Matching** - Automatic confidence-scored matching between AniList and MangaDex using title similarity and release date comparison
- **Sort & Filter** - Sort by rating, chapter count, release date, or latest update; filter by chapters, rating, date ranges, and unread count
- **Add to AniList** - Add manga to your AniList directly from search results, automatically preserving the MangaDex link
- **Caching** - Two-tier cache (Redis + MongoDB TTL) minimizes API calls to both platforms

## Tech Stack

| Layer | Tech |
| ------- | ------ |
| Backend | Python 3.14, FastAPI, uvicorn |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Database | MongoDB 7 (Motor async driver) |
| Cache | Redis 7 + MongoDB TTL collections |
| Search | rapidfuzz for fuzzy string matching |
| Auth | AniList OAuth2, JWT sessions |
| Infra | Docker, docker compose |

## Project Structure

```text
manhwa-discovery/
├── backend/
│   ├── api/
│   │   ├── routes/            # auth, user, manhwa endpoints
│   │   └── middleware/        # JWT auth, rate limiting
│   ├── services/
│   │   ├── mangadex/          # MangaDex REST client
│   │   ├── anilist/           # AniList GraphQL client
│   │   └── comparison.py      # Fuzzy matching engine
│   ├── models/                # Pydantic models
│   ├── database/
│   │   ├── connection.py      # MongoDB connection (Motor)
│   │   └── cache.py           # Two-tier cache service
│   ├── config/settings.py     # Pydantic settings
│   └── main.py                # FastAPI app entry point
│
├── frontend/
│   ├── src/                   # App entry point (main.jsx, App.jsx)
│   ├── components/            # React components
│   ├── pages/                 # Page components with routing
│   ├── services/              # API client, auth helpers
│   ├── stores/                # Zustand state stores
│   ├── styles/                # Tailwind globals
│   └── utils/                 # Formatters, storage helpers
│
├── Dockerfile.backend         # Multi-stage: dev (reload) / prod (4 workers)
├── Dockerfile.frontend        # Multi-stage: dev (Vite HMR) / prod (nginx)
├── docker-compose.yml         # Development stack
├── docker-compose.prod.yml    # Production overrides
├── mongo-init.js              # DB indexes and TTL setup
├── nginx.conf                 # Production frontend proxy
└── .env.example               # Environment template
```

## Quick Start

### Prerequisites

- Docker and docker compose
- An [AniList API client](https://anilist.co/settings/developer) (for OAuth)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env with your AniList client ID/secret
```

### 2. Start the stack

```bash
docker compose up
```

This starts all four services:

| Service | URL | Purpose |
| --------- | ----- | --------- |
| Frontend | <http://localhost:3009> | Vite dev server with HMR |
| Backend | <http://localhost:8009> | FastAPI with auto-reload |
| MongoDB | localhost:27017 | Database |
| Redis | localhost:6379 | Cache |

The backend waits for MongoDB and Redis health checks before starting. On first run, `mongo-init.js` creates all collections and indexes automatically.

### 3. Verify

```bash
curl http://localhost:8009/health
```

## Development

### Backend (without Docker)

```bash
# Install uv if you haven't already
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Start dev server
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8009 --reload
```

### Frontend (without Docker)

```bash
cd frontend
npm install
npm run dev
```

### Running both with Docker

```bash
# Development (live reload on both sides)
docker compose up

# Rebuild after dependency changes
docker compose up --build

# Production
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

## API Endpoints

### Auth

- `GET /auth/anilist/login` - Get AniList OAuth URL
- `GET /auth/anilist/callback` - Handle OAuth callback
- `GET /auth/me` - Current user info

### User Lists

- `GET /users/{id}/lists` - AniList manga lists grouped by status
- `POST /users/{id}/sync` - Force sync and auto-match with MangaDex
- `GET /users/{id}/connections` - All AniList-MangaDex links

### Manhwa

- `GET /manhwa/search` - Global search with filters and sorting
- `GET /manhwa/{id}` - Manga details from MangaDex or AniList
- `POST /manhwa/connect` - Create AniList-MangaDex link
- `DELETE /manhwa/connect/{id}` - Remove a link
- `POST /manhwa/anilist/add` - Add to AniList from search results
- `GET /manhwa/{id}/chapters` - Chapter list

### Health

- `GET /health` - Service health (DB + cache status)

## External APIs

- **MangaDex**: <https://api.mangadex.org/docs/>
- **AniList GraphQL**: <https://anilist.gitbook.io/anilist-apiv2-docs/>

## Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
| ---------- | ------------- |
| `MONGODB_URL` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `ANILIST_CLIENT_ID` | AniList OAuth app client ID |
| `ANILIST_CLIENT_SECRET` | AniList OAuth app client secret |
| `JWT_SECRET` | Secret for signing JWT tokens |
