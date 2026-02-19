import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, Link2, Loader2 } from 'lucide-react';
import { apiClient } from '../services/api';

export default function LinkManagementModal({ isOpen, onClose, manhwa, mode = 'link' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);
  const queryClient = useQueryClient();

  const linkMutation = useMutation({
    mutationFn: (data) => apiClient.createConnection(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userLists'] });
      queryClient.invalidateQueries({ queryKey: ['userConnections'] });
      onClose();
    },
  });

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await apiClient.searchManhwa(searchQuery, { per_page: 10 });
      const results = res.data?.results || [];
      // Filter to only show MangaDex results for linking
      setSearchResults(results.filter((r) => r.source === 'mangadex'));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleLink = () => {
    if (!selectedResult || !manhwa) return;

    linkMutation.mutate({
      anilist_id: String(manhwa.id),
      mangadex_id: selectedResult.id,
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative w-full max-w-lg max-h-[80vh] rounded-2xl glass overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-glass-border">
            <div>
              <h3 className="font-semibold">
                {mode === 'relink' ? 'Relink' : 'Link'} to MangaDex
              </h3>
              {manhwa && (
                <p className="text-xs text-text-tertiary mt-0.5 truncate max-w-[300px]">
                  {manhwa.title}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-glass-highlight transition-colors"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-glass-border">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex gap-2"
            >
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search MangaDex..."
                  className="w-full pl-9 pr-4 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 rounded-xl bg-accent-primary/20 border border-accent-primary text-sm hover:bg-accent-primary/30 transition-colors disabled:opacity-50"
              >
                {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
              </button>
            </form>
          </div>

          {/* Results */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 min-h-[200px]">
            {searching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
              </div>
            ) : searchResults.length === 0 ? (
              <p className="text-center text-sm text-text-tertiary py-8">
                {searchQuery ? 'No MangaDex results found.' : 'Search for a manga on MangaDex to link.'}
              </p>
            ) : (
              searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => setSelectedResult(result)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                    selectedResult?.id === result.id
                      ? 'bg-accent-primary/20 border border-accent-primary'
                      : 'glass glass-hover'
                  }`}
                >
                  {result.cover_url && (
                    <img
                      src={result.cover_url}
                      alt=""
                      className="w-10 h-14 object-cover rounded-lg flex-shrink-0"
                      loading="lazy"
                      onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{result.title}</p>
                    <p className="text-xs text-text-tertiary mt-0.5">
                      {result.year ? `${result.year} - ` : ''}
                      {result.status || 'Unknown status'}
                      {result.chapters_count ? ` - ${result.chapters_count} ch` : ''}
                    </p>
                  </div>
                  {selectedResult?.id === result.id && (
                    <Link2 className="w-4 h-4 text-accent-primary flex-shrink-0" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-glass-border flex gap-2 justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl glass text-sm hover:bg-glass-highlight transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleLink}
              disabled={!selectedResult || linkMutation.isPending}
              className="px-4 py-2 rounded-xl bg-accent-primary text-white text-sm hover:bg-accent-secondary transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {linkMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Link2 className="w-4 h-4" />
              )}
              {mode === 'relink' ? 'Relink' : 'Link'}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
