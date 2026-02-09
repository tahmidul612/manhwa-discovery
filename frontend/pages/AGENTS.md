# FRONTEND PAGES KNOWLEDGE BASE

4 route-level pages: home, search, profile, detail. React Router v6 with manual route definitions.

## PAGES

| Page | File | Lines | Route | Purpose |
| ------ | ------ | ------- | ------- | --------- |
| Home | `index.jsx` | 180 | `/` | Landing with trending/popular manga |
| Search | `search.jsx` | 252 | `/search` | Global search with filters, dual-source results |
| Profile | `profile.jsx` | 280 | `/profile` | User's AniList lists grouped by status |
| Detail | `manhwa/[id].jsx` | 375 | `/manhwa/:id` | Manga detail page with chapters, linking |

## WHERE TO LOOK

| Task | Page | Notes |
| ------ | ------ | ------- |
| Add landing section | `index.jsx` | Hero, trending, popular sections |
| Modify search logic | `search.jsx` | Debounced input, filter integration, deduplication |
| Change list layout | `profile.jsx` | Status tabs, UserListView component |
| Add detail section | `manhwa/[id].jsx` | Chapters, metadata, link management |
| Add new page | Create `pages/{name}.jsx` | Then register in `App.jsx` routes |

## CONVENTIONS

**Route Registration (App.jsx):**

```jsx
<Route path="/" element={<HomePage />} />
<Route path="/search" element={<SearchPage />} />
<Route path="/profile" element={<ProfilePage />} />
<Route path="/manhwa/:id" element={<ManhwaDetailPage />} />
```

**Next.js-Style Naming:**

- File: `manhwa/[id].jsx` (bracket notation)
- Route: `<Route path="/manhwa/:id" />` (manual React Router definition)
- Cosmetic only — no auto-parsing

**Data Fetching:**

- React Query hooks (`useQuery`, `useMutation`)
- Queries in `services/api.js`
- Loading states with skeleton components
- Error boundaries for failed requests

**Protected Routes:**

- Profile page checks auth: `if (!isAuthenticated) return <Navigate to="/" />`
- Detail page works for both authed and guest users (optional features disabled for guests)

## ANTI-PATTERNS

- **NEVER fetch on mount without loading state** — Use React Query `isLoading`
- **NEVER skip error handling** — Use React Query `isError` + `error` state
- **NEVER use useEffect for data fetching** — Use React Query (handles caching, refetching, errors)
- **NEVER hardcode backend URL** — Use `import.meta.env.VITE_API_URL`

## UNIQUE PATTERNS

**Home Page (index.jsx):**

- Parallel queries for trending + popular (`Promise.all` via React Query)
- Horizontal scroll for manga cards (touch-friendly)
- Hero section with call-to-action

**Search Page (search.jsx):**

- Debounced search input (500ms delay)
- Dual-source results (AniList + MangaDex) with deduplication
- Filter panel integration (rating, chapters, date range, tags)
- Pagination with "Load More" button

**Profile Page (profile.jsx):**

- Status tabs: reading, completed, paused, dropped, planning
- UserListView component with advanced filtering/sorting
- Sync button (force refresh from AniList)
- Auto-link button (batch fuzzy matching)

**Detail Page (manhwa/[id].jsx):**

- Source detection from URL param (`source=anilist` or `source=mangadex`)
- Chapter list with pagination (50 per page)
- Link management modal (create/edit/remove connections)
- Add to AniList button (authenticated users only)
- Conditional rendering based on link status

## NOTES

**URL Parameters:**

- Detail page: `/manhwa/:id?source=anilist` or `/manhwa/:id?source=mangadex`
- Search page: `/search?q=naruto&status=ongoing&minRating=7`
- Profile page: `/profile?status=reading` (optional status filter)

**Navigation:**

- Navbar in `App.jsx` handles auth state (login/logout buttons)
- Breadcrumbs on detail page (Home → Search → Detail)

**Complexity Hotspot:** `manhwa/[id].jsx` (375 lines) — Most complex page with multiple data sources, modals, and conditional logic.
