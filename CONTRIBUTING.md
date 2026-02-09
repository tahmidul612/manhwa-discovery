---
"markdown.extension.toc.levels": "2..2"
---

# 🤝 Contributing to Manhwa Discovery

Thank you for your interest in contributing to Manhwa Discovery! This document provides guidelines and instructions for contributing to the project.

## 📋 Table of Contents

- [📋 Table of Contents](#-table-of-contents)
- [📜 Code of Conduct](#-code-of-conduct)
- [🚀 Getting Started](#-getting-started)
- [💻 Development Environment](#-development-environment)
- [📁 Project Structure](#-project-structure)
- [🎨 Coding Standards](#-coding-standards)
- [📝 Commit Conventions](#-commit-conventions)
- [🔀 Pull Request Process](#-pull-request-process)
- [🧪 Testing Guidelines](#-testing-guidelines)
- [🆘 Getting Help](#-getting-help)
- [🙏 Attribution](#-attribution)

---

## 📜 Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the project maintainers.

---

## 🚀 Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Docker & Docker Compose** (recommended for development)
- **Python 3.14+** (if running backend locally without Docker)
- **Node.js 18+** and **npm** (if running frontend locally without Docker)
- **uv** package manager for Python (install via `curl -LsSf https://astral.sh/uv/install.sh | sh`)
- **Git** for version control
- **AniList Developer Account** (for OAuth credentials)

### First-Time Setup

1. **Fork the repository** on GitHub

2. **Clone your fork**:

   ```bash
   git clone https://github.com/YOUR_USERNAME/manhwa-discovery.git
   cd manhwa-discovery
   ```

3. **Add upstream remote**:

   ```bash
   git remote add upstream https://github.com/tahmidul612/manhwa-discovery.git
   ```

4. **Copy environment configuration**:

   ```bash
   cp .env.example .env
   ```

5. **Edit `.env`** with your AniList OAuth credentials:
   - Create an AniList app at <https://anilist.co/settings/developer>
   - Set `ANILIST_CLIENT_ID` and `ANILIST_CLIENT_SECRET`
   - Generate strong random strings for `JWT_SECRET` and `SESSION_SECRET`

6. **Start the development stack**:

   ```bash
   docker compose up
   ```

7. **Verify the installation**:
   - Frontend: <http://localhost:3009>
   - Backend: <http://localhost:8009/docs> (FastAPI Swagger UI)
   - Health check: <http://localhost:8009/health>

---

## 💻 Development Environment

### Using Docker (Recommended)

Docker provides a consistent development environment for all contributors:

```bash
# Start all services (frontend, backend, MongoDB, Redis)
docker compose up

# Rebuild after dependency changes
docker compose up --build

# Run in detached mode
docker compose up -d

# View logs
docker compose logs -f backend
docker compose logs -f frontend

# Stop all services
docker compose down
```

### Running Backend Locally (Without Docker)

If you prefer to run the backend directly:

```bash
# Install dependencies
uv sync

# Start MongoDB and Redis (required)
docker compose up mongodb redis -d

# Run the development server
uv run uvicorn backend.main:app --host 0.0.0.0 --port 8009 --reload

# Format code
uv run black backend/

# Lint code
uv run ruff check backend/
```

### Running Frontend Locally (Without Docker)

If you prefer to run the frontend directly:

```bash
cd frontend

# Install dependencies
npm install

# Start the development server (Vite HMR)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 📁 Project Structure

### Backend (`/backend`)

```text
backend/
├── api/
│   ├── routes/          # API endpoints (auth, user, manhwa)
│   └── middleware/      # JWT auth, rate limiting, CORS
├── services/
│   ├── anilist/         # AniList GraphQL client
│   ├── mangadex/        # MangaDex REST client
│   └── comparison.py    # Fuzzy matching engine (5-stage confidence scoring)
├── models/              # Pydantic schemas (user, manhwa, connections)
├── database/
│   ├── connection.py    # MongoDB Motor async driver
│   └── cache.py         # Two-tier cache (Redis L1 → MongoDB L2)
├── config/              # Pydantic settings from .env
├── utils/               # Error handlers, validators, loggers
└── main.py              # FastAPI app, lifespan management, route registration
```

### Frontend (`/frontend`)

```text
frontend/
├── src/
│   ├── main.jsx         # React DOM render, React Query setup
│   └── App.jsx          # React Router, navbar, auth callback
├── pages/               # Route-level components
│   ├── index.jsx        # Home page (trending, popular)
│   ├── search.jsx       # Global search with filters
│   ├── profile.jsx      # User lists grouped by status
│   └── manhwa/[id].jsx  # Detail page (Next.js-style naming)
├── components/          # Reusable UI (cards, search, filters, modals)
├── services/            # Axios API client, auth helpers
├── stores/              # Zustand state management (auth + localStorage)
├── utils/               # Formatters, storage wrappers
└── styles/              # Tailwind globals (glass-morphism theme)
```

---

## 🎨 Coding Standards

### Python (Backend)

- **Package Manager**: Use `uv` (not pip or poetry)
  - Install: `uv sync`
  - Run commands: `uv run {command}`
  - Lock file: `uv.lock` (not requirements.txt)

- **Code Formatting**: Black with default settings

  ```bash
  uv run black backend/
  ```

- **Linting**: Ruff with default settings

  ```bash
  uv run ruff check backend/
  ```

- **Type Hints**: Required on all functions

  ```python
  def get_user(user_id: int) -> User:
      pass
  ```

- **Async/Await**: All external API calls must be async

  ```python
  # Use asyncio.gather() for parallel calls
  results = await asyncio.gather(
      anilist_client.get_user(user_id),
      mangadex_client.search(query)
  )
  ```

- **Docstrings**: Required on public functions

  ```python
  def calculate_confidence(title1: str, title2: str) -> float:
      """
      Calculate fuzzy matching confidence score between two titles.
      
      Args:
          title1: First title (normalized)
          title2: Second title (normalized)
          
      Returns:
          Confidence score between 0.0 and 1.0
      """
  ```

- **Logging**: Use the configured logger

  ```python
  import logging
  logger = logging.getLogger(__name__)
  logger.info("Processing user sync")
  logger.error("Failed to fetch data", exc_info=True)
  ```

### JavaScript (Frontend)

- **No ESLint/Prettier**: Uses Vite and React defaults

- **Component Structure**: Functional components with hooks

  ```jsx
  export function ManhwaCard({ manga, onSelect }) {
    const [isHovered, setIsHovered] = useState(false);
    // ...
  }
  ```

- **State Management**:
  - **Zustand**: For global state (auth)
  - **React Query**: For server state (API calls)
  - **useState**: For component-local state

- **Styling**: Tailwind CSS utility classes (no inline styles)

  ```jsx
  <div className="bg-slate-800/70 backdrop-blur-lg rounded-xl p-6">
  ```

- **API Calls**: Use the Axios client from `services/api.js`

  ```javascript
  import api from '../services/api';
  const response = await api.get('/manhwa/search', { params: { query } });
  ```

### Anti-Patterns (NEVER DO THIS)

**Backend:**

- ❌ NEVER use sync DB calls (use `motor`, not `pymongo`)
- ❌ NEVER skip JWT auth on protected routes
- ❌ NEVER lower auto-match confidence below 0.80
- ❌ NEVER commit `.env` files
- ❌ NEVER enable DEBUG in production

**Frontend:**

- ❌ NEVER store sensitive data unencrypted in localStorage
- ❌ NEVER hardcode API URLs (use `import.meta.env.VITE_API_URL`)
- ❌ NEVER skip error handling on API calls

---

## 📝 Commit Conventions

We follow **Conventional Commits** for clear, standardized commit messages:

### Format

```text
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

- **feat**: New feature
- **fix**: Bug fix
- **docs**: Documentation changes
- **style**: Code style changes (formatting, no logic change)
- **refactor**: Code refactoring (no feature or bug fix)
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Maintenance tasks (dependencies, config)
- **ci**: CI/CD changes

### Examples

```bash
# Feature
git commit -m "feat(search): add fuzzy matching for alternative titles"

# Bug fix
git commit -m "fix(auth): resolve JWT token expiration issue"

# Documentation
git commit -m "docs(readme): update installation instructions"

# Refactor
git commit -m "refactor(cache): simplify Redis fallback logic"

# Breaking change
git commit -m "feat(api)!: change response format for search endpoint

BREAKING CHANGE: Search results now return nested objects instead of flat arrays"
```

### Scope Guidelines

- **Backend**: `auth`, `api`, `cache`, `search`, `matching`, `database`
- **Frontend**: `ui`, `components`, `pages`, `services`, `stores`
- **Infra**: `docker`, `config`, `ci`, `deploy`

---

## 🔀 Pull Request Process

### Create a Feature Branch

Use descriptive branch names following this pattern:

```bash
# Feature branches
git checkout -b feat/fuzzy-matching-improvements

# Bug fix branches
git checkout -b fix/cache-invalidation

# Documentation branches
git checkout -b docs/api-reference
```

### Make Your Changes

- Follow the [coding standards](#-coding-standards)
- Write clear commit messages using [conventional commits](#-commit-conventions)
- Test your changes thoroughly
- Update documentation if needed

### Keep Your Branch Updated

```bash
# Fetch latest changes from upstream
git fetch upstream

# Rebase your branch on upstream/main
git rebase upstream/main

# Force push to your fork (after rebase)
git push origin your-branch-name --force-with-lease
```

### Run Linters and Tests

Before submitting, ensure your code passes all checks:

```bash
# Backend
uv run black backend/
uv run ruff check backend/
uv run pytest  # (when tests are implemented)

# Frontend
cd frontend
npm run lint  # (when configured)
npm run test  # (when tests are implemented)
```

### Submit the Pull Request

1. Push your branch to your fork on GitHub
2. Open a Pull Request against the `main` branch of the upstream repository
3. Fill out the PR template with:
   - **Description**: What does this PR do?
   - **Motivation**: Why is this change needed?
   - **Testing**: How was this tested?
   - **Screenshots**: For UI changes
   - **Breaking Changes**: If any

### PR Review Checklist

Your PR should meet these criteria:

- ✅ Code follows project conventions
- ✅ Commits follow conventional commit format
- ✅ No merge conflicts with main branch
- ✅ Documentation updated (if applicable)
- ✅ No new linter warnings or errors
- ✅ Manually tested in local environment
- ✅ PR description is clear and complete

### Address Review Feedback

- Respond to all review comments
- Make requested changes in new commits (don't force push during review)
- Re-request review after addressing feedback
- Once approved, maintainers will merge your PR

---

## 🧪 Testing Guidelines

### Current State

The project has test infrastructure in place but tests are not yet implemented:

- Backend: Pytest stubs in `/tests/backend/`
- Frontend: Jest stubs in `/tests/frontend/`

### Contributing Tests

If you'd like to contribute test implementations:

1. **Backend Tests** (Pytest + pytest-asyncio):

   ```python
   # tests/backend/test_comparison.py
   import pytest
   from backend.services.comparison import calculate_confidence
   
   def test_exact_match():
       score = calculate_confidence("One Piece", "One Piece")
       assert score == 1.0
   ```

2. **Frontend Tests** (Jest + React Testing Library):

   ```javascript
   // tests/frontend/components/ManhwaCard.test.jsx
   import { render, screen } from '@testing-library/react';
   import { ManhwaCard } from '../../../components/ManhwaCard';
   
   test('renders manga title', () => {
     render(<ManhwaCard manga={{ title: 'One Piece' }} />);
     expect(screen.getByText('One Piece')).toBeInTheDocument();
   });
   ```

### Manual Testing

For now, all changes must be manually tested:

1. Start the full stack: `docker compose up`
2. Test the affected features through the UI
3. Check API responses using Swagger UI at <http://localhost:8009/docs>
4. Verify MongoDB data using a MongoDB client
5. Check logs for errors: `docker compose logs -f`

---

## 🆘 Getting Help

### Resources

- **Technical Documentation**: See [`AGENTS.md`](AGENTS.md) for detailed architecture
- **API Reference**: <http://localhost:8009/docs> (FastAPI Swagger UI)
- **Backend Knowledge Base**: [`backend/AGENTS.md`](backend/AGENTS.md)
- **Frontend Knowledge Base**: [`frontend/AGENTS.md`](frontend/AGENTS.md)

### Communication Channels

- **Bug Reports**: [Open an issue](https://github.com/tahmidul612/manhwa-discovery/issues/new?template=bug_report.md)
- **Feature Requests**: [Start a discussion](https://github.com/tahmidul612/manhwa-discovery/discussions/new?category=ideas)
- **Questions**: [Ask in discussions](https://github.com/tahmidul612/manhwa-discovery/discussions/new?category=q-a)

### Good First Issues

Look for issues labeled `good first issue` to find beginner-friendly tasks:

- Documentation improvements
- UI/UX enhancements
- Bug fixes with clear reproduction steps
- Adding missing test cases

---

## 🙏 Attribution

When contributing, you're agreeing that:

- Your contributions will be licensed under the project's MIT License
- You have the right to submit the work under this license
- You understand and agree to the [Code of Conduct](CODE_OF_CONDUCT.md)

Thank you for contributing to Manhwa Discovery! Your efforts help make manga discovery better for everyone. 🎉
