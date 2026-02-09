# 📚 Manhwa Discovery

> *Bridge Your Reading Lists Across Platforms*

Unified manga/manhwa discovery platform that bridges your AniList reading lists with MangaDex's catalog. Search, link, filter, and manage your collection from one place.

<div align="center">

[![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)](https://redis.io/)
[![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)
[![Python 3.14](https://img.shields.io/badge/Python-3.14-3776AB?style=for-the-badge&logo=python&logoColor=white)](https://www.python.org/)

</div>

---

## 📖 Table of Contents

- [📖 Table of Contents](#-table-of-contents)
- [✨ Features](#-features)
- [🙏 Attributions \& Credits](#-attributions--credits)
  - [Built With \& Powered By](#built-with--powered-by)
  - [📜 Data Usage \& Attribution](#-data-usage--attribution)
- [🛠️ Tech Stack](#️-tech-stack)
- [📁 Project Structure](#-project-structure)
- [🚀 Quick Start](#-quick-start)
  - [Prerequisites](#prerequisites)
  - [1. Configure environment](#1-configure-environment)
  - [2. Start the stack](#2-start-the-stack)
  - [3. Verify](#3-verify)
- [💻 Development](#-development)
  - [Backend (without Docker)](#backend-without-docker)
  - [Frontend (without Docker)](#frontend-without-docker)
  - [Running both with Docker](#running-both-with-docker)
- [🔌 API Endpoints](#-api-endpoints)
  - [Auth](#auth)
  - [User Lists](#user-lists)
  - [Manhwa](#manhwa)
  - [Health](#health)
- [🌐 External APIs](#-external-apis)
- [⚙️ Environment Variables](#️-environment-variables)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🔒 Security](#-security)
- [📞 Support \& Community](#-support--community)

## ✨ Features

- 🔗 **AniList Integration** - View your manga lists grouped by status (reading, completed, on hold, dropped, planning) via AniList OAuth
- 📘 **MangaDex Linking** - Connect AniList entries to MangaDex manga with automatic fuzzy matching; manually link, unlink, or relink at any time
- 🔍 **Global Search** - Search across your AniList library and MangaDex simultaneously with fuzzy matching on primary and alternative titles
- 🎯 **Smart Matching** - Automatic confidence-scored matching between AniList and MangaDex using title similarity and release date comparison
- 🎛️ **Sort & Filter** - Sort by rating, chapter count, release date, or latest update; filter by chapters, rating, date ranges, and unread count
- ➕ **Add to AniList** - Add manga to your AniList directly from search results, automatically preserving the MangaDex link
- ⚡ **Caching** - Two-tier cache (Redis + MongoDB TTL) minimizes API calls to both platforms

---

## 🙏 Attributions & Credits

<div align="center">

### Built With & Powered By

This project wouldn't exist without the incredible work of these platforms and tools:

<table>
<tr>
<td align="center" width="33%">
<img src="https://cdn.simpleicons.org/claude" alt="Claude" width="120" height="120" style="margin: 20px 0;"><br>
<h3>🤖 Claude Code</h3>
<p><strong>AI-Powered Development</strong></p>
<p>This project was built with assistance from Claude, Anthropic's AI assistant. Claude Code helped architect the codebase, implement fuzzy matching algorithms, and ensure best practices throughout development.</p>
<a href="https://claude.ai" target="_blank">Learn More →</a>
</td>
<td align="center" width="33%">
<img src="https://mangadex.org/img/brand/mangadex-logo.svg" alt="MangaDex" width="120" height="120" style="margin: 20px 0;"><br>
<h3>📚 MangaDex</h3>
<p><strong>Manga Database & API</strong></p>
<p>MangaDex provides the comprehensive manga catalog, chapter information, and cover images that power this platform. Their free and open API makes cross-platform manga discovery possible.</p>
<a href="https://mangadex.org" target="_blank">Visit MangaDex →</a>
</td>
<td align="center" width="33%">
<img src="https://anilist.co/img/icons/android-chrome-512x512.png" alt="AniList" width="120" height="120" style="margin: 20px 0;"><br>
<h3>📖 AniList</h3>
<p><strong>Anime & Manga Tracking</strong></p>
<p>AniList's OAuth2 integration and GraphQL API enable seamless user authentication and access to personal manga libraries. Their platform is the foundation for user data in this application.</p>
<a href="https://anilist.co" target="_blank">Visit AniList →</a>
</td>
</tr>
</table>

</div>

### 📜 Data Usage & Attribution

- **MangaDex**: All manga metadata, cover images, and chapter information are provided by [MangaDex](https://mangadex.org) under their [Terms of Service](https://mangadex.org/terms).
- **AniList**: User data and manga information are accessed via the [AniList API](https://anilist.gitbook.io/anilist-apiv2-docs/) with user consent through OAuth2.
- **Claude Code**: Development assistance and code architecture provided by [Anthropic's Claude](https://claude.ai).

> **Important**: This is an unofficial fan project. It is not affiliated with, endorsed by, or connected to MangaDex or AniList. All trademarks and service marks are the property of their respective owners.

---

## 🛠️ Tech Stack

| Layer | Tech |
| ------- | ------ |
| Backend | Python 3.14, FastAPI, uvicorn |
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Database | MongoDB 7 (Motor async driver) |
| Cache | Redis 7 + MongoDB TTL collections |
| Search | rapidfuzz for fuzzy string matching |
| Auth | AniList OAuth2, JWT sessions |
| Infra | Docker, docker compose |

## 📁 Project Structure

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

## 🚀 Quick Start

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

## 💻 Development

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

## 🔌 API Endpoints

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

## 🌐 External APIs

- **MangaDex**: <https://api.mangadex.org/docs/>
- **AniList GraphQL**: <https://anilist.gitbook.io/anilist-apiv2-docs/>

## ⚙️ Environment Variables

See [`.env.example`](.env.example) for the full list. Key variables:

| Variable | Description |
| ---------- | ------------- |
| `MONGODB_URL` | MongoDB connection string |
| `REDIS_URL` | Redis connection string |
| `ANILIST_CLIENT_ID` | AniList OAuth app client ID |
| `ANILIST_CLIENT_SECRET` | AniList OAuth app client secret |
| `JWT_SECRET` | Secret for signing JWT tokens |

---

## 🤝 Contributing

We welcome contributions! Please see our [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development environment setup
- Code standards and style guide
- Pull request process
- Commit message conventions

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🔒 Security

For information about reporting security vulnerabilities, please see our [SECURITY.md](SECURITY.md).

---

## 📞 Support & Community

- 🐛 **Bug Reports**: [Open an issue](https://github.com/tahmidul612/manhwa-discovery/issues)
- 💡 **Feature Requests**: [Start a discussion](https://github.com/tahmidul612/manhwa-discovery/discussions)
- 📖 **Documentation**: Check the [`AGENTS.md`](AGENTS.md) knowledge base for technical details

---

<div align="center">

--  **Made with ❤️ by the Manhwa Discovery team (me and Claude Code 😜)** --

Powered by *MangaDex and AniList*

</div>
