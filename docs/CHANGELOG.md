# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


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

## v0.3.0 (2026-02-27)

### Feat

- ui redesign and persistent auto-link job tracking (#3)

## v0.2.0 (2026-02-27)

### Feat

- **ui**: redesign manga detail page with improved layout
- **ui**: add Alert component and integrate error warnings
- **cache**: add stale cache retrieval for graceful degradation
- add placeholder image for missing manga covers

### Fix

- **api**: fix cover image URLs and add error handling with stale cache
- always return all manga list status keys even when empty
- synchronize auth state on 401 errors

### Perf

- optimize profile page with single API call and local filtering

## v0.1.2 (2026-02-19)

### Fix

- add --frozen to uv run to prevent lock file write on read-only mount

## v0.1.1 (2026-02-19)

### Perf

- comprehensive caching, image proxy, and frontend optimization (#2)
