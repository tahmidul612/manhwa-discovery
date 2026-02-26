import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Link2, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { apiClient } from '../services/api';
import ManhwaCard from './ManhwaCard';
import LinkManagementModal from './LinkManagementModal';
import { SkeletonGrid } from './SkeletonCard';
import Alert from './Alert';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'READING', label: 'Reading', badge: 'badge-reading' },
  { key: 'COMPLETED', label: 'Completed', badge: 'badge-completed' },
  { key: 'PAUSED', label: 'On Hold', badge: 'badge-paused' },
  { key: 'DROPPED', label: 'Dropped', badge: 'badge-dropped' },
  { key: 'PLANNING', label: 'Plan to Read', badge: 'badge-planning' },
];

const SORT_OPTIONS = [
  { key: 'title_asc', label: 'Title A-Z' },
  { key: 'title_desc', label: 'Title Z-A' },
  { key: 'rating_desc', label: 'Highest Rating' },
  { key: 'rating_asc', label: 'Lowest Rating' },
  { key: 'progress_desc', label: 'Most Progress' },
  { key: 'unread_desc', label: 'Most Unread' },
  { key: 'chapters_desc', label: 'Most Chapters' },
  { key: 'score_desc', label: 'Your Score (High)' },
];

const LINK_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'linked', label: 'Linked' },
  { key: 'unlinked', label: 'Unlinked' },
];

const DEFAULT_FILTERS = {
  linkStatus: 'all',
  minRating: 0,
  minScore: 0,
  minUnread: 0,
  yearMin: '',
  yearMax: '',
};

function hasActiveFilters(filters) {
  return filters.linkStatus !== 'all'
    || filters.minRating > 0
    || filters.minScore > 0
    || filters.minUnread > 0
    || filters.yearMin !== ''
    || filters.yearMax !== '';
}

function getEntryTitle(entry) {
  const t = entry.media?.title;
  return (t?.english || t?.romaji || t?.native || '').toLowerCase();
}

function getEntryRating(entry) {
  return entry.media?.averageScore || 0;
}

function getEntryChapters(entry) {
  return entry.mangadex_data?.chapters_count || entry.media?.chapters || 0;
}

function getEntryUnread(entry) {
  const total = getEntryChapters(entry);
  const progress = entry.progress || 0;
  return Math.max(0, total - progress);
}

export default function UserListView({ userId, onStatsLoaded }) {
  const [activeTab, setActiveTab] = useState('all');
  const [linkModal, setLinkModal] = useState({ open: false, manhwa: null, mode: 'link' });
  const [autoLinking, setAutoLinking] = useState(false);
  const [linkingEntryId, setLinkingEntryId] = useState(null);
  const [autoLinkResults, setAutoLinkResults] = useState(null);
  const [sortBy, setSortBy] = useState('title_asc');
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  const updateFilter = (key, value) => setFilters((prev) => ({ ...prev, [key]: value }));
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userLists', userId],  // Single cache key - fetch all statuses once
    queryFn: () => apiClient.getUserLists(userId, null),  // Always fetch all statuses
    enabled: !!userId,
    select: (res) => res.data,
    staleTime: 2 * 60 * 1000, // 2 minutes - balance freshness and API calls
  });

  const syncMutation = useMutation({
    mutationFn: () => apiClient.syncUserList(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userLists'] });
    },
  });

  const unlinkMutation = useMutation({
    mutationFn: (connectionId) => apiClient.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userLists'] });
    },
  });

  // Report stats to parent
  useEffect(() => {
    if (data && onStatsLoaded) {
      onStatsLoaded({
        total_entries: data.total_entries ?? 0,
        total_linked: data.total_linked ?? 0,
      });
    }
  }, [data, onStatsLoaded]);

  const lists = data?.lists || {};

  // Flatten entries for display based on active tab (filter locally from cached data)
  const rawList = useMemo(() => {
    if (activeTab === 'all') {
      return Object.values(lists).flat();
    }
    // Filter by status locally - backend returns lowercase keys
    const statusKey = activeTab.toLowerCase();
    return lists[statusKey] || [];
  }, [lists, activeTab]);

  // Apply filters and sorting
  const displayList = useMemo(() => {
    let filtered = [...rawList];

    // Link status filter
    if (filters.linkStatus === 'linked') {
      filtered = filtered.filter((e) => e.is_linked);
    } else if (filters.linkStatus === 'unlinked') {
      filtered = filtered.filter((e) => !e.is_linked);
    }

    // Min rating (AniList averageScore is 0-100, displayed as /10)
    if (filters.minRating > 0) {
      const threshold = filters.minRating * 10;
      filtered = filtered.filter((e) => (e.media?.averageScore || 0) >= threshold);
    }

    // Min user score
    if (filters.minScore > 0) {
      filtered = filtered.filter((e) => (e.score || 0) >= filters.minScore);
    }

    // Min unread chapters
    if (filters.minUnread > 0) {
      filtered = filtered.filter((e) => getEntryUnread(e) >= filters.minUnread);
    }

    // Year range
    if (filters.yearMin !== '') {
      const yr = Number(filters.yearMin);
      filtered = filtered.filter((e) => (e.media?.startDate?.year || 0) >= yr);
    }
    if (filters.yearMax !== '') {
      const yr = Number(filters.yearMax);
      filtered = filtered.filter((e) => (e.media?.startDate?.year || 9999) <= yr);
    }

    // Sort
    const [field, dir] = sortBy.split('_');
    const asc = dir === 'asc' ? 1 : -1;

    filtered.sort((a, b) => {
      switch (field) {
        case 'title':
          return asc * getEntryTitle(a).localeCompare(getEntryTitle(b));
        case 'rating':
          return asc * (getEntryRating(a) - getEntryRating(b));
        case 'progress':
          return asc * ((a.progress || 0) - (b.progress || 0));
        case 'unread':
          return asc * (getEntryUnread(a) - getEntryUnread(b));
        case 'chapters':
          return asc * (getEntryChapters(a) - getEntryChapters(b));
        case 'score':
          return asc * ((a.score || 0) - (b.score || 0));
        default:
          return 0;
      }
    });

    return filtered;
  }, [rawList, filters, sortBy]);

  // Count entries per status (memoized to prevent recalculation on every render)
  const { statusCounts, totalCount } = useMemo(() => {
    const counts = {};
    for (const [status, entries] of Object.entries(lists)) {
      counts[status.toUpperCase()] = entries.length;
    }
    const total = Object.values(lists).reduce((sum, entries) => sum + entries.length, 0);
    return { statusCounts: counts, totalCount: total };
  }, [lists]);

  // Auto-link all unlinked entries one by one
  const handleAutoLinkAll = useCallback(async () => {
    const allEntries = Object.values(lists).flat();
    const unlinked = allEntries.filter((e) => !e.is_linked);
    if (unlinked.length === 0) return;

    setAutoLinking(true);
    setAutoLinkResults(null);
    let linked = 0;
    let failed = 0;

    for (const entry of unlinked) {
      const media = entry.media || {};
      const mediaId = String(media.id);
      setLinkingEntryId(mediaId);

      try {
        const res = await apiClient.autoLinkEntry(userId, mediaId, entry);
        if (res.data?.status === 'linked') {
          linked++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    setLinkingEntryId(null);
    setAutoLinking(false);
    setAutoLinkResults({ linked, failed, total: unlinked.length });
    queryClient.invalidateQueries({ queryKey: ['userLists'] });
  }, [lists, userId, queryClient]);

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-text-secondary">Failed to load manga list.</p>
        {error?.response?.data?.detail && (
          <p className="text-xs text-text-tertiary mt-2">{error.response.data.detail}</p>
        )}
        <button
          onClick={() => queryClient.invalidateQueries({ queryKey: ['userLists'] })}
          className="mt-4 px-4 py-2 rounded-xl glass glass-hover text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with sync button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">My Manga List</h2>
          <p className="text-sm text-text-secondary mt-1">
            {data?.total_entries || 0} entries, {data?.total_linked || 0} linked to MangaDex
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || autoLinking}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/20 border border-accent-primary hover:bg-accent-primary/30 transition-colors text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Sync'}
          </button>
          <button
            onClick={handleAutoLinkAll}
            disabled={autoLinking || syncMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-green-500/20 border border-green-500 hover:bg-green-500/30 transition-colors text-sm disabled:opacity-50"
          >
            <Link2 className={`w-4 h-4 ${autoLinking ? 'animate-pulse' : ''}`} />
            {autoLinking ? 'Linking...' : 'Auto-Link All'}
          </button>
        </div>
      </div>

      {/* Warning message if serving stale data */}
      {data?.warning && (
        <Alert
          variant="warning"
          message={data.warning}
          dismissible={true}
        />
      )}
      {/* Sync result message */}
      {syncMutation.isSuccess && (
        <div className="rounded-xl glass p-3 text-sm text-green-400 border border-green-400/20">
          <RefreshCw className="w-4 h-4 inline mr-2" />
          AniList data refreshed ({syncMutation.data?.data?.total_entries || 0} entries)
        </div>
      )}

      {/* Auto-link result message */}
      {autoLinkResults && (
        <div className="rounded-xl glass p-3 text-sm text-green-400 border border-green-400/20">
          <Link2 className="w-4 h-4 inline mr-2" />
          Auto-link complete: {autoLinkResults.linked} linked, {autoLinkResults.failed} unmatched
          (out of {autoLinkResults.total})
        </div>
      )}

      {/* Status Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === 'all' ? totalCount : (statusCounts[tab.key] || 0);
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm transition-all ${
                activeTab === tab.key
                  ? `${tab.badge || 'bg-accent-primary/20 border-accent-primary'} font-medium`
                  : 'glass hover:border-glass-highlight'
              }`}
            >
              {tab.label}
              {count > 0 && (
                <span className="ml-1.5 text-xs text-text-tertiary">({count})</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Sort & Filter bar */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm transition-colors ${
            showFilters || hasActiveFilters(filters)
              ? 'bg-accent-primary/20 text-accent-primary'
              : 'glass hover:border-glass-highlight text-text-secondary'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          Filters
          {hasActiveFilters(filters) && (
            <span className="w-1.5 h-1.5 rounded-full bg-accent-primary" />
          )}
        </button>

        {hasActiveFilters(filters) && (
          <button
            onClick={() => setFilters(DEFAULT_FILTERS)}
            className="text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            Clear all
          </button>
        )}

        <div className="flex items-center gap-1.5 ml-auto">
          <ArrowUpDown className="w-3.5 h-3.5 text-text-tertiary" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="bg-transparent text-sm text-text-secondary outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.key} value={opt.key}>{opt.label}</option>
            ))}
          </select>
        </div>

        {displayList.length !== rawList.length && (
          <span className="text-xs text-text-tertiary">
            {displayList.length} of {rawList.length}
          </span>
        )}
      </div>

      {/* Filter panel (collapsible) */}
      {showFilters && (
        <div className="rounded-xl glass p-4 grid grid-cols-2 sm:grid-cols-3 gap-4">
          {/* Link Status */}
          <div>
            <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">Link Status</p>
            <div className="flex gap-1.5 flex-wrap">
              {LINK_FILTERS.map((f) => (
                <button
                  key={f.key}
                  onClick={() => updateFilter('linkStatus', f.key)}
                  className={`px-3 py-1 rounded-full text-xs transition-all ${
                    filters.linkStatus === f.key
                      ? 'bg-accent-primary/20 text-accent-primary border border-accent-primary'
                      : 'glass hover:border-glass-highlight text-text-secondary'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Min Rating */}
          <div>
            <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
              Min Rating {filters.minRating > 0 && <span className="text-accent-primary">({filters.minRating}+)</span>}
            </p>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={filters.minRating}
              onChange={(e) => updateFilter('minRating', parseFloat(e.target.value))}
              className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
              <span>Any</span>
              <span>10</span>
            </div>
          </div>

          {/* Min User Score */}
          <div>
            <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">
              Min Your Score {filters.minScore > 0 && <span className="text-accent-primary">({filters.minScore}+)</span>}
            </p>
            <input
              type="range"
              min="0"
              max="10"
              step="1"
              value={filters.minScore}
              onChange={(e) => updateFilter('minScore', parseInt(e.target.value))}
              className="w-full accent-accent-primary"
            />
            <div className="flex justify-between text-[10px] text-text-tertiary mt-0.5">
              <span>Any</span>
              <span>10</span>
            </div>
          </div>

          {/* Min Unread */}
          <div>
            <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">Min Unread Chapters</p>
            <input
              type="number"
              min="0"
              placeholder="0"
              value={filters.minUnread || ''}
              onChange={(e) => updateFilter('minUnread', parseInt(e.target.value) || 0)}
              className="w-full px-3 py-1.5 rounded-lg glass text-sm bg-transparent outline-none focus:border-accent-primary"
            />
          </div>

          {/* Year Range */}
          <div className="col-span-2 sm:col-span-2">
            <p className="text-xs text-text-tertiary mb-2 font-medium uppercase tracking-wider">Year Range</p>
            <div className="flex gap-2 items-center">
              <input
                type="number"
                min="1990"
                max="2030"
                placeholder="From"
                value={filters.yearMin}
                onChange={(e) => updateFilter('yearMin', e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg glass text-sm bg-transparent outline-none focus:border-accent-primary"
              />
              <span className="text-text-tertiary text-xs">to</span>
              <input
                type="number"
                min="1990"
                max="2030"
                placeholder="To"
                value={filters.yearMax}
                onChange={(e) => updateFilter('yearMax', e.target.value)}
                className="w-24 px-3 py-1.5 rounded-lg glass text-sm bg-transparent outline-none focus:border-accent-primary"
              />
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={10} />
      ) : displayList.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          {activeTab === 'all' ? (
            <>
              <p>Your manga list is empty.</p>
              <p className="text-sm mt-2">Add manga from the search page to get started!</p>
            </>
          ) : (
            <>
              <p>No manga in {STATUS_TABS.find(t => t.key === activeTab)?.label || activeTab}.</p>
              <p className="text-sm mt-2">Entries with this status will appear here.</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayList.map((entry) => {
            const media = entry.media || {};
            const manhwa = {
              id: media.id,
              title: media.title?.english || media.title?.romaji || media.title?.native || 'Unknown',
              cover_url: entry.mangadex_data?.cover_url || `/api/images/cover/anilist/${media.id}`,
              rating: media.averageScore ? media.averageScore / 10 : null,
              chapters_count: entry.mangadex_data?.chapters_count || media.chapters,
              year: media.startDate?.year,
              source: 'anilist',
              user_status: entry.status,
              user_progress: entry.progress,
              user_score: entry.score,
            };

            const isCurrentlyLinking = linkingEntryId === String(media.id);

            return (
              <ManhwaCard
                key={entry.id}
                manhwa={manhwa}
                isLinked={entry.is_linked}
                isAutoLinking={isCurrentlyLinking}
                connectionId={entry.connection?._id}
                onLink={(m) => setLinkModal({ open: true, manhwa: m, mode: 'link' })}
                onFixLink={(m) => setLinkModal({ open: true, manhwa: m, mode: 'relink' })}
                onUnlink={(connId) => unlinkMutation.mutate(connId)}
              />
            );
          })}
        </div>
      )}

      {/* Link modal */}
      <LinkManagementModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, manhwa: null, mode: 'link' })}
        manhwa={linkModal.manhwa}
        mode={linkModal.mode}
      />
    </div>
  );
}
