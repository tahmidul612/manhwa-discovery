# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Comprehensive documentation suite (README, CONTRIBUTING, CODE_OF_CONDUCT, SECURITY, CHANGELOG)
- Visual attributions for Claude Code, MangaDex, and AniList
- Security policy and vulnerability reporting guidelines
- Contributor guidelines with conventional commit standards

### Changed
- Enhanced README with improved UX/UI and table of contents
- Updated project documentation with badges and visual elements

## [0.1.0] - 2026-02-09

### Added

#### Core Features
- **AniList Integration**: OAuth2 authentication and GraphQL API integration
- **MangaDex Integration**: REST API client with rate limiting and retry logic
- **Fuzzy Matching Engine**: 5-stage confidence scoring system (0.80-1.00) for automatic manga linking
- **Two-Tier Caching**: Redis L1 cache with MongoDB L2 fallback for optimized API performance
- **Global Search**: Cross-platform search across AniList and MangaDex with deduplication
- **User Lists**: View AniList manga lists grouped by status (reading, completed, on hold, dropped, planning)
- **Manual Linking**: Create, update, and remove AniList-MangaDex connections
- **Auto-Sync**: Automatic fuzzy matching of entire AniList library with MangaDex

#### Backend
- FastAPI server with async/await architecture
- Motor (async MongoDB driver) for database operations
- Redis integration for L1 caching
- JWT-based authentication with AniList OAuth
- Pydantic models for data validation
- Comprehensive API endpoints for auth, users, and manga
- Health check endpoint with DB and cache status
- Middleware for CORS and authentication
- Lifespan management for startup/shutdown tasks

#### Frontend
- React 18 with Vite for fast development
- Tailwind CSS with custom glass-morphism theme
- Zustand for state management with localStorage persistence
- React Query for server state management
- Responsive UI with mobile support
- Framer Motion animations
- Search page with filters (rating, chapters, date ranges)
- Profile page with user lists
- Detail page for manga information
- Authentication flow with OAuth callback handling

#### Infrastructure
- Docker Compose setup for development
- Multi-stage Dockerfiles for backend and frontend
- MongoDB initialization script with indexes
- Redis configuration
- Production-ready docker-compose with nginx
- Environment configuration via .env files

#### Documentation
- Project README with setup instructions
- Backend and Frontend knowledge bases (AGENTS.md)
- Environment configuration examples
- API documentation via FastAPI Swagger UI

### Technical Details

#### Fuzzy Matching Algorithm
- **Stage 1**: Exact match (normalized) → 1.00 confidence
- **Stage 2**: High fuzzy (>95% similarity) → 0.95 confidence
- **Stage 3**: Strong fuzzy (>85%) + year validation (±1yr) → 0.90 confidence
- **Stage 4**: Alternative titles match (>90%) → 0.85 confidence
- **Stage 5**: Token overlap (>70%) + year → 0.80 confidence

Auto-matches at ≥0.85 confidence; <0.70 rejected; 0.70-0.85 manual review.

#### Cache Strategy
- **Redis L1**: Fast in-memory cache (5-60 min TTL)
- **MongoDB L2**: Persistent cache with TTL indexes (30 min - 24 hr)
- **Graceful Fallback**: Automatic fallback to MongoDB-only if Redis unavailable
- **Pattern Invalidation**: Wildcard-based cache invalidation for user data updates

#### Rate Limiting
- MangaDex: 5 requests/second with exponential backoff
- Retry logic: 2^attempt seconds, max 3 retries on 429 errors

### Known Limitations

- Test infrastructure exists but tests are not implemented (stubs only)
- OAuth tokens stored unencrypted in MongoDB (planned for future encryption)
- Rate limiting not implemented for internal API endpoints
- Frontend uses Next.js-style file naming but React Router v6 (manual route definitions)

---

## Release Notes

### Version 0.1.0 - Initial Release

This is the initial release of Manhwa Discovery, a unified manga/manhwa discovery platform that bridges AniList and MangaDex. The project provides a seamless way to manage your manga collection across both platforms with intelligent fuzzy matching and caching.

**Highlights:**
- 🔗 Connect your AniList account and automatically link entries to MangaDex
- 🔍 Search across both platforms simultaneously
- 🎯 Smart fuzzy matching with 5-stage confidence scoring
- ⚡ Two-tier caching for optimal performance
- 🎨 Beautiful glass-morphism UI with dark mode

**Getting Started:**
1. Clone the repository
2. Copy `.env.example` to `.env` and add your AniList OAuth credentials
3. Run `docker compose up`
4. Visit http://localhost:3009

**Known Issues:**
- Tests are stubbed but not implemented
- OAuth tokens not encrypted (low priority for personal use)
- Rate limiting only on external APIs

**Next Steps:**
- Implement comprehensive test suite
- Add token encryption
- Expand rate limiting
- Performance optimizations
- UI/UX improvements based on user feedback

---

## How to Read This Changelog

### Types of Changes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** for vulnerability fixes

### Semantic Versioning

Given a version number MAJOR.MINOR.PATCH:

- **MAJOR**: Incompatible API changes
- **MINOR**: Add functionality in a backwards compatible manner
- **PATCH**: Backwards compatible bug fixes

### Links

[Unreleased]: https://github.com/tahmidul612/manhwa-discovery/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/tahmidul612/manhwa-discovery/releases/tag/v0.1.0
