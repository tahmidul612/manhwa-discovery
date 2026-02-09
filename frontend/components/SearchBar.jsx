import { useState, useCallback, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { apiClient } from '../services/api';
import FilterPanel from './FilterPanel';

export default function SearchBar({ onSearch, filters, onFilterChange }) {
  const [query, setQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Suggestions query
  const { data: suggestions } = useQuery({
    queryKey: ['suggestions', query],
    queryFn: () => apiClient.searchManhwa(query, { per_page: 5 }),
    enabled: query.length > 2 && showSuggestions,
    select: (res) => res.data?.results?.slice(0, 5) || [],
  });

  const debouncedSearch = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (q.length > 2) onSearch(q);
    }, 500);
  }, [onSearch]);

  const handleInputChange = (e) => {
    const value = e.target.value;
    setQuery(value);
    setShowSuggestions(true);
    debouncedSearch(value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (query.trim()) onSearch(query.trim());
  };

  const handleSuggestionClick = (title) => {
    setQuery(title);
    setShowSuggestions(false);
    onSearch(title);
  };

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

  // Close suggestions on click outside
  useEffect(() => {
    const handleClickOutside = () => setShowSuggestions(false);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const activeFilterCount = Object.values(filters || {}).filter(Boolean).length;

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative" onClick={(e) => e.stopPropagation()}>
        <div className="flex gap-2">
          {/* Search input */}
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
            <input
              ref={inputRef}
              value={query}
              onChange={handleInputChange}
              onFocus={() => query.length > 2 && setShowSuggestions(true)}
              placeholder="Search manhwa..."
              className="w-full pl-12 pr-10 py-3 rounded-2xl glass focus:border-accent-primary focus:shadow-glow transition-all outline-none text-text-primary placeholder:text-text-tertiary"
              aria-label="Search manhwa"
            />
            {query && (
              <button
                type="button"
                onClick={clearQuery}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-glass-highlight"
                aria-label="Clear search"
              >
                <X className="w-4 h-4 text-text-tertiary" />
              </button>
            )}

            {/* Suggestions dropdown */}
            {showSuggestions && suggestions?.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 rounded-2xl glass overflow-hidden z-50 shadow-glass animate-slide-down">
                {suggestions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSuggestionClick(item.title)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-glass-highlight transition-colors text-left"
                  >
                    {item.cover_url && (
                      <img src={item.cover_url} alt="" className="w-8 h-11 object-cover rounded" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-text-tertiary">
                        {item.source === 'mangadex' ? 'MangaDex' : 'AniList'}
                        {item.year ? ` - ${item.year}` : ''}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Filter toggle */}
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-3 rounded-2xl glass transition-all relative ${
              showFilters ? 'border-accent-primary shadow-glow' : 'hover:border-accent-primary/50'
            }`}
            aria-label="Toggle filters"
            aria-expanded={showFilters}
          >
            <SlidersHorizontal className="w-5 h-5" />
            {activeFilterCount > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-accent-primary rounded-full text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>
      </form>

      {/* Filter panel */}
      {showFilters && (
        <FilterPanel filters={filters} onFilterChange={onFilterChange} />
      )}
    </div>
  );
}
