import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { RefreshCw, Link2 } from 'lucide-react';
import { apiClient } from '../services/api';
import ManhwaCard from './ManhwaCard';
import LinkManagementModal from './LinkManagementModal';
import { SkeletonGrid } from './SkeletonCard';

const STATUS_TABS = [
  { key: 'all', label: 'All' },
  { key: 'READING', label: 'Reading', badge: 'badge-reading' },
  { key: 'COMPLETED', label: 'Completed', badge: 'badge-completed' },
  { key: 'PAUSED', label: 'On Hold', badge: 'badge-paused' },
  { key: 'DROPPED', label: 'Dropped', badge: 'badge-dropped' },
  { key: 'PLANNING', label: 'Plan to Read', badge: 'badge-planning' },
];

export default function UserListView({ userId, onStatsLoaded }) {
  const [activeTab, setActiveTab] = useState('all');
  const [linkModal, setLinkModal] = useState({ open: false, manhwa: null, mode: 'link' });
  const [autoLinking, setAutoLinking] = useState(false);
  const [linkingEntryId, setLinkingEntryId] = useState(null); // anilist media id currently being linked
  const [autoLinkResults, setAutoLinkResults] = useState(null); // { linked: n, failed: n, total: n }
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ['userLists', userId, activeTab === 'all' ? null : activeTab],
    queryFn: () => apiClient.getUserLists(userId, activeTab === 'all' ? null : activeTab),
    enabled: !!userId,
    select: (res) => res.data,
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

  // Flatten entries for display based on active tab
  const displayList = activeTab === 'all'
    ? Object.values(lists).flat()
    : lists[activeTab.toLowerCase()] || [];

  // Count entries per status
  const statusCounts = {};
  for (const [status, entries] of Object.entries(lists)) {
    statusCounts[status.toUpperCase()] = entries.length;
  }
  const totalCount = Object.values(lists).reduce((sum, entries) => sum + entries.length, 0);

  // Auto-link all unlinked entries one by one
  const handleAutoLinkAll = useCallback(async () => {
    // Get ALL entries (not just currently displayed tab)
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

      {/* Grid */}
      {isLoading ? (
        <SkeletonGrid count={10} />
      ) : displayList.length === 0 ? (
        <div className="text-center py-16 text-text-secondary">
          <p>No entries found{activeTab !== 'all' ? ` in ${activeTab}` : ''}.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {displayList.map((entry) => {
            const media = entry.media || {};
            const manhwa = {
              id: media.id,
              title: media.title?.english || media.title?.romaji || media.title?.native || 'Unknown',
              cover_url: entry.mangadex_data?.cover_url || media.coverImage?.large,
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
