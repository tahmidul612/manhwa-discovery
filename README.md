# Manhwa Discovery

> Simple webapp to discover manhwa by interfacing with MangaDex and AniList APIs

## Project Structure

```
manhwa-discovery/
├── backend/                    # Python backend API
│   ├── api/                   # API routes and middleware
│   │   ├── routes/           # Endpoint definitions
│   │   └── middleware/       # Auth, rate limiting, etc.
│   ├── services/             # External API clients
│   │   ├── mangadex/        # MangaDex API integration
│   │   ├── anilist/         # AniList API integration
│   │   └── comparison.py    # Cross-platform comparison logic
│   ├── models/              # Data models
│   ├── database/            # Database and caching
│   ├── config/              # Configuration management
│   ├── utils/               # Utilities and helpers
│   └── main.py             # Backend entry point
│
├── frontend/                   # Frontend application
│   ├── components/            # React/Vue components
│   ├── pages/                # Page components
│   ├── services/             # API client and auth
│   ├── utils/               # Frontend utilities
│   └── styles/              # CSS styles
│
├── tests/                     # Test suites
│   ├── backend/              # Backend tests
│   └── frontend/             # Frontend tests
│
├── .env.example              # Environment variables template
├── requirements.txt          # Python dependencies
├── docker-compose.yml        # Docker orchestration
└── README.md                 # This file
```

## Features (Planned)

- Search manhwa on MangaDex
- View detailed manhwa information
- Compare manhwa with user's AniList
- Display user's manga/manhwa list
- Recommendations based on reading history

## Setup

TODO: Add setup instructions

## API Integrations

- **MangaDex API**: https://api.mangadex.org/docs/
- **AniList API**: https://anilist.gitbook.io/anilist-apiv2-docs/

## Development

TODO: Add development instructions
