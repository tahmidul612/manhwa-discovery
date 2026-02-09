import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ChevronDown, ChevronUp } from 'lucide-react';
import { apiClient } from '../services/api';

const COUNTRIES = [
  { code: 'KR', label: 'Korea (Manhwa)' },
  { code: 'JP', label: 'Japan (Manga)' },
  { code: 'CN', label: 'China (Manhua)' },
  { code: 'TW', label: 'Taiwan' },
];

const FORMATS = [
  { code: 'MANGA', label: 'Manga' },
  { code: 'ONE_SHOT', label: 'One Shot' },
];

const STATUSES = [
  { code: 'RELEASING', label: 'Releasing' },
  { code: 'FINISHED', label: 'Finished' },
  { code: 'NOT_YET_RELEASED', label: 'Not Yet Released' },
  { code: 'CANCELLED', label: 'Cancelled' },
  { code: 'HIATUS', label: 'Hiatus' },
];

const SORT_OPTIONS = [
  { value: 'POPULARITY_DESC', label: 'Popularity' },
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'FAVOURITES_DESC', label: 'Favourites' },
];

export default function BrowsePanel({ filters, onFilterChange }) {
  const [tagSearch, setTagSearch] = useState('');
  const [showAllGenres, setShowAllGenres] = useState(false);
  const [showTags, setShowTags] = useState(false);

  const { data: genres } = useQuery({
    queryKey: ['genres'],
    queryFn: () => apiClient.getGenres(),
    select: (res) => res.data?.genres || [],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const { data: allTags } = useQuery({
    queryKey: ['tags'],
    queryFn: () => apiClient.getTags(),
    select: (res) => res.data?.tags || [],
    staleTime: 24 * 60 * 60 * 1000,
  });

  const filteredTags = useMemo(() => {
    if (!allTags) return [];
    if (!tagSearch) return allTags.slice(0, 30);
    const q = tagSearch.toLowerCase();
    return allTags.filter((t) => t.name.toLowerCase().includes(q)).slice(0, 30);
  }, [allTags, tagSearch]);

  const toggleGenre = (genre) => {
    const current = filters.genres || [];
    const updated = current.includes(genre)
      ? current.filter((g) => g !== genre)
      : [...current, genre];
    onFilterChange({ ...filters, genres: updated });
  };

  const toggleTag = (tagName) => {
    const current = filters.tags || [];
    const updated = current.includes(tagName)
      ? current.filter((t) => t !== tagName)
      : [...current, tagName];
    onFilterChange({ ...filters, tags: updated });
  };

  const displayGenres = showAllGenres ? genres : genres?.slice(0, 12);

  return (
    <div className="space-y-5 rounded-2xl glass p-5">
      {/* Sort */}
      <div className="flex items-center gap-3">
        <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider shrink-0">Sort by</label>
        <div className="flex flex-wrap gap-1.5">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onFilterChange({ ...filters, sort: opt.value })}
              className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                (filters.sort || 'POPULARITY_DESC') === opt.value
                  ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                  : 'glass hover:bg-glass-highlight'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Genres */}
      {genres && genres.length > 0 && (
        <div className="space-y-2">
          <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Genres</label>
          <div className="flex flex-wrap gap-1.5">
            {displayGenres?.map((genre) => (
              <button
                key={genre}
                onClick={() => toggleGenre(genre)}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  (filters.genres || []).includes(genre)
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                    : 'glass hover:bg-glass-highlight'
                }`}
              >
                {genre}
              </button>
            ))}
            {genres.length > 12 && (
              <button
                onClick={() => setShowAllGenres(!showAllGenres)}
                className="px-3 py-1.5 rounded-lg text-xs glass hover:bg-glass-highlight flex items-center gap-1 text-text-secondary"
              >
                {showAllGenres ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                {showAllGenres ? 'Less' : `+${genres.length - 12} more`}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tags */}
      <div className="space-y-2">
        <button
          onClick={() => setShowTags(!showTags)}
          className="flex items-center gap-2 text-xs text-text-tertiary font-medium uppercase tracking-wider hover:text-text-secondary transition-colors"
        >
          Tags {(filters.tags || []).length > 0 && `(${filters.tags.length})`}
          {showTags ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>

        {showTags && (
          <div className="space-y-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-tertiary" />
              <input
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                placeholder="Search tags..."
                className="w-full pl-9 pr-3 py-2 rounded-xl glass text-xs outline-none focus:border-accent-primary transition-colors"
              />
            </div>

            {/* Selected tags */}
            {(filters.tags || []).length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {filters.tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="px-2.5 py-1 rounded-lg text-xs bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium flex items-center gap-1"
                  >
                    {tag}
                    <X className="w-3 h-3" />
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {filteredTags.map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => toggleTag(tag.name)}
                  className={`px-2.5 py-1 rounded-lg text-xs transition-colors ${
                    (filters.tags || []).includes(tag.name)
                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                      : 'glass hover:bg-glass-highlight'
                  }`}
                  title={tag.description}
                >
                  {tag.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Country / Format / Status row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Country */}
        <div className="space-y-2">
          <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Country</label>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map((c) => (
              <button
                key={c.code}
                onClick={() =>
                  onFilterChange({ ...filters, country: filters.country === c.code ? null : c.code })
                }
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filters.country === c.code
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                    : 'glass hover:bg-glass-highlight'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Format */}
        <div className="space-y-2">
          <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Format</label>
          <div className="flex flex-wrap gap-1.5">
            {FORMATS.map((f) => (
              <button
                key={f.code}
                onClick={() => {
                  const current = filters.format || [];
                  const updated = current.includes(f.code)
                    ? current.filter((x) => x !== f.code)
                    : [...current, f.code];
                  onFilterChange({ ...filters, format: updated });
                }}
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  (filters.format || []).includes(f.code)
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                    : 'glass hover:bg-glass-highlight'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div className="space-y-2">
          <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Status</label>
          <div className="flex flex-wrap gap-1.5">
            {STATUSES.map((s) => (
              <button
                key={s.code}
                onClick={() =>
                  onFilterChange({ ...filters, status: filters.status === s.code ? null : s.code })
                }
                className={`px-3 py-1.5 rounded-lg text-xs transition-colors ${
                  filters.status === s.code
                    ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary/40 font-medium'
                    : 'glass hover:bg-glass-highlight'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Year range */}
      <div className="space-y-2">
        <label className="text-xs text-text-tertiary font-medium uppercase tracking-wider">Year Range</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={filters.yearMin || ''}
            onChange={(e) => onFilterChange({ ...filters, yearMin: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="From"
            min={1970}
            max={2030}
            className="w-24 px-3 py-2 rounded-xl glass text-xs outline-none focus:border-accent-primary transition-colors"
          />
          <span className="text-text-tertiary text-xs">to</span>
          <input
            type="number"
            value={filters.yearMax || ''}
            onChange={(e) => onFilterChange({ ...filters, yearMax: e.target.value ? parseInt(e.target.value) : null })}
            placeholder="To"
            min={1970}
            max={2030}
            className="w-24 px-3 py-2 rounded-xl glass text-xs outline-none focus:border-accent-primary transition-colors"
          />
        </div>
      </div>

      {/* Clear all */}
      {hasActiveFilters(filters) && (
        <button
          onClick={() => onFilterChange({ sort: 'POPULARITY_DESC' })}
          className="text-xs text-red-400 hover:text-red-300 transition-colors"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

function hasActiveFilters(filters) {
  return (
    (filters.genres && filters.genres.length > 0) ||
    (filters.tags && filters.tags.length > 0) ||
    filters.country ||
    (filters.format && filters.format.length > 0) ||
    filters.status ||
    filters.yearMin ||
    filters.yearMax ||
    (filters.sort && filters.sort !== 'POPULARITY_DESC')
  );
}
