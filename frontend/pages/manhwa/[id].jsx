import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Star, BookOpen, Calendar, Clock, Tag,
  ExternalLink, ChevronDown, Loader2,
  Link2, LinkIcon, Unlink, Wrench, Plus,
} from 'lucide-react';

const ADD_STATUS_OPTIONS = [
  { key: 'PLANNING', label: 'Plan to Read' },
  { key: 'READING', label: 'Reading' },
  { key: 'COMPLETED', label: 'Completed' },
];
import { apiClient } from '../../services/api';
import { useAuthStore } from '../../stores/useAuthStore';
import ComparisonView from '../../components/ComparisonView';
import LinkManagementModal from '../../components/LinkManagementModal';

export default function ManhwaDetailPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const source = searchParams.get('source') || 'mangadex';
  const [showAllChapters, setShowAllChapters] = useState(false);
  const [linkModal, setLinkModal] = useState({ open: false, mode: 'link' });
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: manhwa, isLoading, error } = useQuery({
    queryKey: ['manhwa', id, source],
    queryFn: () => apiClient.getManhwaDetails(id, source),
    select: (res) => res.data,
  });

  const { data: chaptersData, isLoading: chaptersLoading } = useQuery({
    queryKey: ['chapters', id],
    queryFn: () => apiClient.getChapters(id),
    enabled: source === 'mangadex',
    select: (res) => res.data,
  });

  const unlinkMutation = useMutation({
    mutationFn: (connectionId) => apiClient.removeConnection(connectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manhwa', id, source] });
      queryClient.invalidateQueries({ queryKey: ['userLists'] });
    },
  });

  const addToListMutation = useMutation({
    mutationFn: (status) => {
      if (source === 'anilist') {
        return apiClient.addToAniListById(id, status);
      }
      return apiClient.addToAniList({ mangadex_id: id, status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manhwa', id, source] });
      queryClient.invalidateQueries({ queryKey: ['userLists'] });
    },
  });

  const [showAddMenu, setShowAddMenu] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
      </div>
    );
  }

  if (error || !manhwa) {
    return (
      <div className="text-center py-24">
        <p className="text-text-secondary">Failed to load manga details.</p>
      </div>
    );
  }

  const chapters = chaptersData?.chapters || [];
  const displayChapters = showAllChapters ? chapters : chapters.slice(0, 20);
  const isLinked = manhwa.is_linked;
  const connection = manhwa.connection;

  // Chapter progress from connection data
  const userProgress = connection?.anilist_data?.progress;
  const totalChapters = connection?.mangadex_data?.chapters_count || manhwa.chapters_count;
  const hasProgress = userProgress != null && userProgress > 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl glass p-6"
      >
        <div className="flex gap-6">
          {/* Cover */}
          <div className="flex-shrink-0">
            {manhwa.cover_url && (
              <img
                src={manhwa.cover_url}
                alt={manhwa.title}
                className="w-40 h-56 object-cover rounded-xl shadow-lg"
              />
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 space-y-3">
            <h1 className="text-2xl font-bold leading-tight">{manhwa.title}</h1>

            {manhwa.alternative_titles?.length > 0 && (
              <p className="text-sm text-text-tertiary">
                {manhwa.alternative_titles.slice(0, 3).join(' / ')}
              </p>
            )}

            <div className="flex flex-wrap gap-4 text-sm text-text-secondary">
              {manhwa.rating && (
                <span className="flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                  {typeof manhwa.rating === 'number' ? manhwa.rating.toFixed(1) : manhwa.rating}/10
                </span>
              )}
              {totalChapters && (
                <span className="flex items-center gap-1.5">
                  <BookOpen className="w-4 h-4" />
                  {hasProgress ? `${userProgress} / ${totalChapters}` : totalChapters} chapters
                </span>
              )}
              {manhwa.year && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  {manhwa.year}
                </span>
              )}
              {manhwa.status && (
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {manhwa.status}
                </span>
              )}
            </div>

            {/* Chapter progress bar */}
            {hasProgress && totalChapters > 0 && (
              <div className="w-full max-w-xs">
                <div className="w-full h-2 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-accent-primary"
                    style={{ width: `${Math.min(100, (userProgress / totalChapters) * 100)}%` }}
                  />
                </div>
                <p className="text-xs text-text-tertiary mt-1">
                  {Math.round((userProgress / totalChapters) * 100)}% read
                </p>
              </div>
            )}

            {/* Tags */}
            {manhwa.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {manhwa.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full glass text-xs"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* External links + Link management */}
            <div className="flex flex-wrap gap-3 pt-2">
              {source === 'mangadex' && (
                <a
                  href={`https://mangadex.org/title/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-orange-400 hover:text-orange-300 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  MangaDex
                </a>
              )}
              {source === 'anilist' && (
                <a
                  href={`https://anilist.co/manga/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:text-accent-secondary transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  AniList
                </a>
              )}

              {/* Link management buttons */}
              {isAuthenticated && source === 'anilist' && (
                <>
                  {isLinked ? (
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1 text-sm text-green-400">
                        <Link2 className="w-3.5 h-3.5" />
                        Linked
                      </span>
                      <button
                        onClick={() => setLinkModal({ open: true, mode: 'relink' })}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg glass hover:bg-yellow-500/20 text-sm text-yellow-400 transition-colors"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Fix Link
                      </button>
                      <button
                        onClick={() => unlinkMutation.mutate(connection?._id)}
                        disabled={unlinkMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg glass hover:bg-red-500/20 text-sm text-red-400 transition-colors disabled:opacity-50"
                      >
                        {unlinkMutation.isPending ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Unlink className="w-3.5 h-3.5" />
                        )}
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setLinkModal({ open: true, mode: 'link' })}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg glass hover:bg-accent-primary/20 text-sm text-accent-primary transition-colors"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Link to MangaDex
                    </button>
                  )}
                </>
              )}

              {/* Add to AniList */}
              {isAuthenticated && !manhwa.user_list_status && !manhwa.user_status && (
                <div className="relative">
                  <button
                    onClick={() => setShowAddMenu(!showAddMenu)}
                    disabled={addToListMutation.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg glass hover:bg-green-500/20 text-sm text-green-400 transition-colors disabled:opacity-50"
                  >
                    {addToListMutation.isPending ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Plus className="w-3.5 h-3.5" />
                    )}
                    Add to AniList
                  </button>
                  {showAddMenu && (
                    <div className="absolute top-full left-0 mt-1 py-1 rounded-lg glass min-w-[140px] z-20">
                      {ADD_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setShowAddMenu(false);
                            addToListMutation.mutate(opt.key);
                          }}
                          className="w-full px-3 py-1.5 text-left text-xs hover:bg-glass-highlight transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {addToListMutation.isSuccess && (
                <span className="text-xs text-green-400">Added!</span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {manhwa.description && (
          <div className="mt-6 pt-4 border-t border-glass-border">
            <p className="text-sm text-text-secondary leading-relaxed">
              {manhwa.description}
            </p>
          </div>
        )}
      </motion.div>

      {/* Comparison view (if connection data available) */}
      {manhwa.anilist_data && manhwa.mangadex_data && (
        <ComparisonView
          anilistData={manhwa.anilist_data}
          mangadexData={manhwa.mangadex_data}
          confidence={manhwa.match_confidence}
        />
      )}

      {/* Chapters list */}
      {source === 'mangadex' && (
        <div className="rounded-2xl glass p-6 space-y-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Chapters
          </h2>

          {chaptersLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
            </div>
          ) : chapters.length === 0 ? (
            <p className="text-sm text-text-tertiary py-4">No chapters found.</p>
          ) : (
            <>
              <div className="space-y-1">
                {displayChapters.map((chapter) => (
                  <a
                    key={chapter.id}
                    href={`https://mangadex.org/chapter/${chapter.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-glass-highlight transition-colors group"
                  >
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium">
                        Ch. {chapter.chapter || '?'}
                      </span>
                      {chapter.title && (
                        <span className="text-sm text-text-secondary ml-2">
                          — {chapter.title}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-tertiary flex-shrink-0">
                      {chapter.translated_language && (
                        <span className="uppercase">{chapter.translated_language}</span>
                      )}
                      {chapter.published_at && (
                        <span>{new Date(chapter.published_at).toLocaleDateString()}</span>
                      )}
                      <ExternalLink className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </a>
                ))}
              </div>

              {chapters.length > 20 && !showAllChapters && (
                <button
                  onClick={() => setShowAllChapters(true)}
                  className="flex items-center gap-1.5 mx-auto text-sm text-accent-primary hover:text-accent-secondary transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show all {chapters.length} chapters
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Link modal */}
      <LinkManagementModal
        isOpen={linkModal.open}
        onClose={() => setLinkModal({ open: false, mode: 'link' })}
        manhwa={manhwa}
        mode={linkModal.mode}
      />
    </div>
  );
}
