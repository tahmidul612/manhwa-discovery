# FRONTEND KNOWLEDGE BASE

React 18 + Vite with Tailwind, Zustand, React Query, and custom glass-morphism theme. Ports 3009 dev, 80 prod (nginx).

## STRUCTURE

```text
frontend/
├── src/
│   ├── main.jsx      # React DOM render, QueryClient setup
│   └── App.jsx       # Router, navbar, auth callback
├── pages/            # Route-level components
│   ├── index.jsx     # Home (trending, popular)
│   ├── search.jsx    # Global search with filters
│   ├── profile.jsx   # User lists grouped by status
│   └── manhwa/[id].jsx  # Detail page (Next.js-style naming)
├── components/       # Reusable UI (cards, search, filters, modals)
├── services/         # Axios API client, auth helpers
├── stores/           # Zustand (auth state + localStorage)
├── utils/            # Formatters, storage wrappers
└── styles/           # Tailwind globals (glass theme)
```

## WHERE TO LOOK

| Task | Location | Notes |
| ------ | ---------- | ------- |
| Add route | `src/App.jsx` | Manual React Router v6 definitions |
| Add page | `pages/{name}.jsx` | Then add to `App.jsx` routes |
| Add component | `components/{Name}.jsx` | Import in pages |
| Add API endpoint | `services/api.js` | Axios methods with auth |
| Modify auth flow | `stores/useAuthStore.js` | Zustand + localStorage |
| Change theme colors | `tailwind.config.js` | Glass-morphism palette |
| Add animation | Use Framer Motion | Already imported |
| Add formatter | `utils/formatters.js` | Date, number, text utils |

## CONVENTIONS

**File Structure (NON-STANDARD):**

- `src/` only contains main.jsx + App.jsx
- Components, pages, services, stores at root level (not in src/)
- Vite configured with `root: '.'` to accommodate this

**Route Naming:**

- Files use Next.js-style brackets: `manhwa/[id].jsx`
- Routes manually defined in `App.jsx`: `<Route path="/manhwa/:id" element={<ManhwaDetailPage />} />`
- Bracket notation is cosmetic only — no auto-parsing

**State Management:**

- **Zustand:** Auth state with localStorage persistence (`auth-storage` key)
- **React Query:** Server state (5min staleTime, 30min cacheTime, no refetch on focus)
- **Local state:** useState for component-specific state

**API Calls:**

- Axios instance with JWT Bearer token injection
- Base URL: `VITE_API_URL` (default: <http://localhost:8009>)
- Timeout: 30s
- 401 responses trigger logout

**Styling:**

- Tailwind with custom glass-morphism theme (dark mode, indigo/purple accents)
- Framer Motion for animations (`slide-up`, `fade-in`, `shimmer`)
- Lucide React for icons

**No Linters:** No ESLint or Prettier config — uses Vite/React defaults

## ANTI-PATTERNS

- **NEVER store sensitive data in localStorage unencrypted** — Tokens currently stored plain (TODO: encrypt)
- **NEVER skip error handling on API calls** — Use React Query error states
- **NEVER hardcode API URLs** — Use `import.meta.env.VITE_API_URL`
- **NEVER use inline styles** — Use Tailwind utility classes

## UNIQUE PATTERNS

**Next.js-Style Naming in React Router:**

- File: `pages/manhwa/[id].jsx`
- Route: `<Route path="/manhwa/:id" element={...} />` (manual definition in App.jsx)
- Cosmetic only — React Router doesn't auto-parse brackets

**Glass-Morphism Theme:**

- Background: `rgba(15, 15, 25, 0.7)` with backdrop blur
- Accents: Indigo (`#6366f1`) and purple (`#8b5cf6`)
- Status colors: Reading (blue), completed (green), paused (yellow), dropped (red), planning (gray)
- Animations: `slide-up`, `shimmer`, `pulse-glow`

**Auth Flow:**

1. User clicks "Login with AniList" → redirects to backend `/auth/anilist/login`
2. Backend handles OAuth → redirects to frontend `/auth/callback?token={jwt}&user={json}`
3. Frontend parses query params → calls `login(user, token)` → stores in Zustand + localStorage

**React Query Configuration:**

- Stale time: 5 minutes (data considered fresh)
- Cache time: 30 minutes (data kept in cache)
- No refetch on window focus (prevents unnecessary API calls)
- Retry: 2 attempts on failure

## NOTES

**Port:** 3009 (not Vite default 5173) — configured in `vite.config.js`.

**HMR:** Fast Refresh enabled for instant feedback during development.

**Production Build:** Served via nginx with gzip compression, 1-year static asset caching, API proxy to backend.

**Test Stubs:** `/tests/frontend/` contains Jest test stubs but framework not configured in package.json.

**No TypeScript:** Pure JavaScript project (could migrate to TypeScript for type safety).
