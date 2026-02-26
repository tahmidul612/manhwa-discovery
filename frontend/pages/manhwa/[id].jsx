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
    <div className="space-y-6 max-w-6xl mx-auto px-4">
      {/* Hero Section with Cover and Key Info */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl glass overflow-hidden"
      >
        <div className="flex flex-col md:flex-row gap-8 p-6 md:p-8">
          {/* Cover Image */}
          <div className="flex-shrink-0 mx-auto md:mx-0">
            {manhwa.cover_url ? (
              <img
                src={manhwa.cover_url}
                alt={manhwa.title}
                className="w-64 h-auto rounded-xl shadow-2xl hover:shadow-accent-primary/20 transition-shadow duration-300"
                style={{ aspectRatio: '2/3' }}
              />
            ) : (
              <div className="w-64 h-96 rounded-xl bg-surface-elevated flex items-center justify-center">
                <BookOpen className="w-16 h-16 text-text-tertiary" />
              </div>
            )}
          </div>

          {/* Main Info */}
          <div className="flex-1 min-w-0 space-y-4">
            {/* Title */}
            <div>
              <h1 className="text-3xl md:text-4xl font-bold leading-tight mb-2">{manhwa.title}</h1>
              {manhwa.alternative_titles?.length > 0 && (
                <p className="text-sm text-text-tertiary italic">
                  {manhwa.alternative_titles.slice(0, 2).join(' • ')}
                </p>
              )}
            </div>

            {/* Meta Info Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {manhwa.rating && (
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
                  <div>
                    <div className="text-lg font-semibold">
                      {typeof manhwa.rating === 'number' ? manhwa.rating.toFixed(1) : manhwa.rating}
                    </div>
                    <div className="text-xs text-text-tertiary">Rating</div>
                  </div>
                </div>
              )}
              {totalChapters && (
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-accent-primary" />
                  <div>
                    <div className="text-lg font-semibold">
                      {hasProgress ? `${userProgress}/${totalChapters}` : totalChapters}
                    </div>
                    <div className="text-xs text-text-tertiary">Chapters</div>
                  </div>
                </div>
              )}
              {manhwa.year && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-accent-secondary" />
                  <div>
                    <div className="text-lg font-semibold">{manhwa.year}</div>
                    <div className="text-xs text-text-tertiary">Year</div>
                  </div>
                </div>
              )}
              {manhwa.status && (
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-green-400" />
                  <div>
                    <div className="text-lg font-semibold capitalize">{manhwa.status.toLowerCase().replace('_', ' ')}</div>
                    <div className="text-xs text-text-tertiary">Status</div>
                  </div>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {hasProgress && totalChapters > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">Reading Progress</span>
                  <span className="text-accent-primary font-semibold">
                    {Math.round((userProgress / totalChapters) * 100)}%
                  </span>
                </div>
                <div className="w-full h-3 rounded-full bg-surface-elevated overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary transition-all duration-500"
                    style={{ width: `${Math.min(100, (userProgress / totalChapters) * 100)}%` }}
                  />
                </div>
              </div>
            )}

            {/* Tags */}
            {manhwa.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {manhwa.tags.slice(0, 8).map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full glass text-xs font-medium hover:bg-glass-highlight transition-colors"
                  >
                    <Tag className="w-3 h-3" />
                    {tag}
                  </span>
                ))}
                {manhwa.tags.length > 8 && (
                  <span className="inline-flex items-center px-3 py-1 rounded-full glass text-xs text-text-tertiary">
                    +{manhwa.tags.length - 8} more
                  </span>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              {source === 'mangadex' && (
                <a
                  href={`https://mangadex.org/title/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-orange-500/20 text-sm font-medium text-orange-400 transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on MangaDex
                </a>
              )}
              {source === 'anilist' && (
                <a
                  href={`https://anilist.co/manga/${id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-accent-primary/20 text-sm font-medium text-accent-primary transition-colors"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on AniList
                </a>
              )}

              {/* Link management buttons */}
              {isAuthenticated && source === 'anilist' && (
                <>
                  {isLinked ? (
                    <div className="flex gap-2">
                      <span className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg glass text-sm font-medium text-green-400">
                        <Link2 className="w-4 h-4" />
                        Linked to MangaDex
                      </span>
                      <button
                        onClick={() => setLinkModal({ open: true, mode: 'relink' })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg glass hover:bg-yellow-500/20 text-sm font-medium text-yellow-400 transition-colors"
                      >
                        <Wrench className="w-4 h-4" />
                        Fix Link
                      </button>
                      <button
                        onClick={() => unlinkMutation.mutate(connection?._id)}
                        disabled={unlinkMutation.isPending}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg glass hover:bg-red-500/20 text-sm font-medium text-red-400 transition-colors disabled:opacity-50"
                      >
                        {unlinkMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Unlink className="w-4 h-4" />
                        )}
                        Unlink
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setLinkModal({ open: true, mode: 'link' })}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-accent-primary/20 text-sm font-medium text-accent-primary transition-colors"
                    >
                      <LinkIcon className="w-4 h-4" />
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
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg glass hover:bg-green-500/20 text-sm font-medium text-green-400 transition-colors disabled:opacity-50"
                  >
                    {addToListMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    Add to AniList
                  </button>
                  {showAddMenu && (
                    <div className="absolute top-full left-0 mt-1 py-1 rounded-lg glass min-w-[160px] z-20 shadow-xl">
                      {ADD_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.key}
                          onClick={() => {
                            setShowAddMenu(false);
                            addToListMutation.mutate(opt.key);
                          }}
                          className="w-full px-4 py-2 text-left text-sm hover:bg-glass-highlight transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {addToListMutation.isSuccess && (
                <span className="inline-flex items-center px-4 py-2 text-sm font-medium text-green-400">✓ Added!</span>
              )}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Description */}
      {manhwa.description && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl glass p-6"
        >
          <h2 className="text-xl font-semibold mb-3 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Synopsis
          </h2>
          <div
            className="text-text-secondary leading-relaxed prose prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: manhwa.description.replace(/<br\s*\/?>/gi, '<br />') }}
          />
        </motion.div>
      )}

      {/* Comparison view (if connection data available) */}
      {manhwa.anilist_data && manhwa.mangadex_data && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ComparisonView
            anilistData={manhwa.anilist_data}
            mangadexData={manhwa.mangadex_data}
            confidence={manhwa.match_confidence}
          />
        </motion.div>
      )}

      {/* Chapters list */}
      {source === 'mangadex' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="rounded-2xl glass p-6 space-y-4"
        >
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-accent-primary" />
            Chapters
          </h2>

          {chaptersLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent-primary" />
            </div>
          ) : chapters.length === 0 ? (
            <p className="text-center text-text-tertiary py-12">No chapters available yet.</p>
          ) : (
            <>
              <div className="space-y-2">
                {displayChapters.map((chapter) => (
                  <a
                    key={chapter.id}
                    href={`https://mangadex.org/chapter/${chapter.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-between p-4 rounded-xl hover:bg-glass-highlight transition-all duration-200 group border border-transparent hover:border-accent-primary/20"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="text-base font-semibold text-accent-primary">
                          Ch. {chapter.chapter || '?'}
                        </span>
                        {chapter.title && (
                          <span className="text-sm text-text-secondary truncate">
                            {chapter.title}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-text-tertiary flex-shrink-0 ml-4">
                      {chapter.translated_language && (
                        <span className="uppercase font-medium px-2 py-1 rounded glass">{chapter.translated_language}</span>
                      )}
                      {chapter.published_at && (
                        <span className="hidden sm:inline">{new Date(chapter.published_at).toLocaleDateString()}</span>
                      )}
                      <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-accent-primary" />
                    </div>
                  </a>
                ))}
              </div>

              {chapters.length > 20 && !showAllChapters && (
                <button
                  onClick={() => setShowAllChapters(true)}
                  className="flex items-center justify-center gap-2 mx-auto px-6 py-3 rounded-lg glass hover:bg-glass-highlight text-sm font-medium text-accent-primary transition-colors"
                >
                  <ChevronDown className="w-4 h-4" />
                  Show all {chapters.length} chapters
                </button>
              )}
            </>
          )}
        </motion.div>
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
