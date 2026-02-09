import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Loader2, SearchX } from 'lucide-react';
import { apiClient } from '../services/api';
import { useAuthStore } from '../stores/useAuthStore';
import SearchBar from '../components/SearchBar';
import ManhwaCard from '../components/ManhwaCard';
import LinkManagementModal from '../components/LinkManagementModal';
import { SkeletonGrid } from '../components/SkeletonCard';

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') || '');
  const [filters, setFilters] = useState({});
  const [page, setPage] = useState(1);
  const [linkModal, setLinkModal] = useState({ open: false, manhwa: null });
  const { user } = useAuthStore();

  // Sync URL query param with state
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== searchQuery) {
      setSearchQuery(q);
    }
  }, [searchParams]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['search', searchQuery, filters, page],
    queryFn: () =>
      apiClient.searchManhwa(searchQuery, {
        ...filters,
        page,
        per_page: 20,
        user_id: user?.anilist_id,
      }),
    enabled: searchQuery.length > 0,
    select: (res) => res.data,
    keepPreviousData: true,
  });

  const results = data?.results || [];
  const totalPages = data?.total_pages || 1;

  const handleSearch = (query) => {
    setSearchQuery(query);
    setPage(1);
    setSearchParams(query ? { q: query } : {});
  };

  const handleFilterChange = (newFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <SearchBar
        onSearch={handleSearch}
        filters={filters}
        onFilterChange={handleFilterChange}
      />

      {/* Results info */}
      {searchQuery && data && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <p>
            {data.total || 0} results for &ldquo;{searchQuery}&rdquo;
            {isFetching && !isLoading && (
              <Loader2 className="inline w-3.5 h-3.5 ml-2 animate-spin" />
            )}
          </p>
          {totalPages > 1 && (
            <p>Page {page} of {totalPages}</p>
          )}
        </div>
      )}

      {/* Results grid */}
      {isLoading ? (
        <SkeletonGrid count={20} />
      ) : results.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {results.map((manhwa) => (
            <ManhwaCard
              key={`${manhwa.source}-${manhwa.id}`}
              manhwa={manhwa}
              isLinked={manhwa.is_linked}
              connectionId={manhwa.connection_id}
              onLink={(m) => setLinkModal({ open: true, manhwa: m })}
            />
          ))}
        </div>
      ) : searchQuery ? (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <SearchX className="w-12 h-12 mb-4 opacity-40" />
          <p className="text-lg font-medium">No results found</p>
          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-text-secondary">
          <p className="text-lg">Start searching to discover manhwa</p>
          <p className="text-sm mt-1">Search across AniList and MangaDex simultaneously.</p>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-xl glass text-sm disabled:opacity-40 hover:bg-glass-highlight transition-colors"
          >
            Previous
          </button>

          {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
            const start = Math.max(1, Math.min(page - 2, totalPages - 4));
            const pageNum = start + i;
            if (pageNum > totalPages) return null;
            return (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-xl text-sm transition-colors ${
                  page === pageNum
                    ? 'bg-accent-primary/20 border border-accent-primary font-medium'
                    : 'glass hover:bg-glass-highlight'
                }`}
              >
                {pageNum}
              </button>
            );
          })}

          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 rounded-xl glass text-sm disabled:opacity-40 hover:bg-glass-highlight transition-colors"
          >
            Next
          </button>
        </div>
      )}

      {/* Link modal */}
      <LinkManagementModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, manhwa: null })}
        manhwa={linkModal.manhwa}
        mode="link"
      />
    </div>
  );
}
