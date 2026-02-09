# FRONTEND COMPONENTS KNOWLEDGE BASE

8 React components for UI: cards, search, filters, modals, list views. Tailwind + Framer Motion.

## COMPONENTS

| Component | Lines | Purpose |
| ----------- | ------- | --------- |
| `ManhwaCard.jsx` | 80 | Manga card with cover, title, rating, chapters, link status |
| `SearchBar.jsx` | 120 | Debounced search input with icon, clear button |
| `FilterPanel.jsx` | 180 | Advanced filters (rating, chapters, date range, tags) |
| `UserListView.jsx` | 512 | AniList lists grouped by status (reading, completed, etc.) with multi-dimensional filtering |
| `BrowsePanel.jsx` | 312 | Browse by genre/tag with dynamic filter state |
| `LinkManagementModal.jsx` | 250 | Manual AniList ↔ MangaDex linking UI |
| `ComparisonView.jsx` | 200 | Side-by-side AniList/MangaDex comparison |
| `SkeletonCard.jsx` | 40 | Loading placeholder with shimmer animation |

## WHERE TO LOOK

| Task | Component | Notes |
| ------ | ----------- | ------- |
| Modify card UI | `ManhwaCard.jsx` | Cover, title, metadata display |
| Change search debounce | `SearchBar.jsx` | Currently 300ms |
| Add filter type | `FilterPanel.jsx` | Add to state + UI + pass to parent |
| Modify list grouping | `UserListView.jsx` | Status tabs, filtering, sorting logic |
| Add browse filter | `BrowsePanel.jsx` | Genres, tags, countries, status |
| Change linking UI | `LinkManagementModal.jsx` | Manual link creation/editing |
| Add loading state | `SkeletonCard.jsx` | Shimmer animation pattern |

## CONVENTIONS

**Component Structure:**

- Functional components with hooks
- Props destructured in function signature
- React Query for server state (`useQuery`, `useMutation`)
- Framer Motion for animations (`motion.div`, `AnimatePresence`)

**Styling:**

- Tailwind utility classes (no CSS modules or styled-components)
- Glass-morphism theme: `glass`, `glass-highlight`, `glass-border`
- Responsive: `sm:`, `md:`, `lg:` breakpoints
- Animations: `animate-slide-up`, `animate-fade-in`, `animate-shimmer`

**Icons:**

- Lucide React (`import { IconName } from 'lucide-react'`)
- Size: `w-4 h-4` or `w-5 h-5` (consistent sizing)

**State Management:**

- Local state: `useState` for UI-only state
- Server state: React Query (`useQuery`, `useMutation`)
- Global state: Zustand (`useAuthStore`) for auth

## ANTI-PATTERNS

- **NEVER use inline styles** — Use Tailwind classes
- **NEVER skip loading states** — Use `SkeletonCard` or React Query `isLoading`
- **NEVER hardcode colors** — Use Tailwind theme colors (`accent-primary`, `status-reading`, etc.)
- **NEVER forget key prop** — Always use unique key in `.map()` loops

## UNIQUE PATTERNS

**ManhwaCard Link Status:**

- Shows link badge if manga is linked to MangaDex
- Badge color indicates match confidence (green >0.90, yellow 0.85-0.90, gray <0.85)

**UserListView Multi-Dimensional Filtering:**

- Filter by link status (linked, unlinked, all)
- Filter by rating (1-10)
- Filter by score (0-100)
- Filter by unread count (min/max chapters)
- Filter by year range (start date)
- All filters applied simultaneously with `&&` logic

**SearchBar Debouncing:**

- 300ms delay before triggering search
- Clear button appears when input has text
- Icon changes based on loading state

**BrowsePanel Dynamic Filters:**

- Tag search with debouncing (500ms)
- Multi-select for genres, tags, countries, status
- Apply/Clear buttons for filter control

## NOTES

**Complexity Hotspot:** `UserListView.jsx` (512 lines) — Most complex component with extensive filtering/sorting logic. Consider refactoring if adding more features.

**Animation Performance:** Framer Motion animations use GPU acceleration (`will-change: transform`) for smooth 60fps.

**Accessibility:** Components use semantic HTML but could improve ARIA labels and keyboard navigation.
