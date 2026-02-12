import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Star, BookOpen, Link2, LinkIcon, Unlink, Wrench, Loader2, Plus } from 'lucide-react';
import { apiClient } from '../services/api';

const STATUS_BADGES = {
  READING: 'badge-reading',
  COMPLETED: 'badge-completed',
  PAUSED: 'badge-paused',
  DROPPED: 'badge-dropped',
  PLANNING: 'badge-planning',
};

const ADD_LIST_OPTIONS = [
  { key: 'PLANNING', label: 'Plan to Read' },
  { key: 'READING', label: 'Reading' },
  { key: 'COMPLETED', label: 'Completed' },
];

export default function ManhwaCard({ manhwa, onHover, onLink, onUnlink, onFixLink, onAddToList, isLinked, isAutoLinking, connectionId }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const rating = manhwa.rating ? manhwa.rating.toFixed(1) : null;
  const chapters = manhwa.chapters_count || manhwa.chapters;
  const userProgress = manhwa.user_progress;
  const year = manhwa.year;
  const userStatus = manhwa.user_status;

  const hasProgress = userProgress != null && userProgress > 0;

  const handleHover = useCallback(() => {
    onHover?.(manhwa.id);
    queryClient.prefetchQuery({
      queryKey: ['manhwa', String(manhwa.id), manhwa.source || 'mangadex'],
      queryFn: () => apiClient.getManhwaDetails(manhwa.id, manhwa.source || 'mangadex'),
      staleTime: 5 * 60 * 1000,
    });
  }, [manhwa.id, manhwa.source, onHover, queryClient]);

  return (
    <motion.div
      className="group relative rounded-2xl glass glass-hover overflow-hidden transition-all duration-300 cursor-pointer"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={handleHover}
      onClick={() => navigate(`/manhwa/${manhwa.id}?source=${manhwa.source || 'mangadex'}`)}
      role="article"
      aria-label={`${manhwa.title} manga card`}
    >
      {/* Cover Image */}
      <div className="relative aspect-[3/4] overflow-hidden bg-surface-elevated">
        {!imgLoaded && (
          <div className="absolute inset-0 skeleton" />
        )}
        <img
          src={manhwa.cover_url || manhwa.cover_image || '/placeholder.png'}
          alt={`Cover of ${manhwa.title}`}
          className={`w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
          onLoad={() => setImgLoaded(true)}
          onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; setImgLoaded(true); }}
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Auto-linking overlay */}
        {isAutoLinking && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
              <span className="text-xs text-white font-medium">Linking...</span>
            </div>
          </div>
        )}

        {/* Top row: source + status */}
        <div className="absolute top-2 left-2 right-2 flex items-start justify-between">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium glass">
            {manhwa.source === 'mangadex' ? 'MangaDex' : 'AniList'}
          </span>
          {userStatus && (
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[userStatus] || ''}`}>
              {userStatus}
            </span>
          )}
        </div>

        {/* Bottom overlay: rating + link status + actions */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5 flex items-end justify-between">
          <div className="flex items-center gap-2">
            {rating && (
              <span className="flex items-center gap-1 text-xs text-white font-medium">
                <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
                {rating}
              </span>
            )}
            {isLinked && (
              <span className="flex items-center gap-0.5 text-[10px] text-accent-primary font-medium">
                <Link2 className="w-2.5 h-2.5" />
                Linked
              </span>
            )}
          </div>

          {/* Card actions */}
          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {isLinked ? (
              <>
                {onFixLink && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onFixLink(manhwa); }}
                    className="p-1.5 rounded-lg glass hover:bg-yellow-500/20 transition-colors"
                    aria-label="Fix link"
                    title="Fix Link"
                  >
                    <Wrench className="w-3.5 h-3.5 text-yellow-400" />
                  </button>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); onUnlink?.(connectionId); }}
                  className="p-1.5 rounded-lg glass hover:bg-red-500/20 transition-colors"
                  aria-label="Unlink manga"
                  title="Unlink"
                >
                  <Unlink className="w-3.5 h-3.5 text-red-400" />
                </button>
              </>
            ) : onLink ? (
              <button
                onClick={(e) => { e.stopPropagation(); onLink(manhwa); }}
                className="p-1.5 rounded-lg glass hover:bg-accent-primary/20 transition-colors"
                aria-label="Link manga"
                title="Link to MangaDex"
              >
                <LinkIcon className="w-3.5 h-3.5 text-accent-primary" />
              </button>
            ) : null}

            {/* Add to AniList */}
            {onAddToList && !userStatus && !manhwa.user_list_status && (
              <div className="relative">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAddMenu(!showAddMenu); }}
                  className="p-1.5 rounded-lg glass hover:bg-green-500/20 transition-colors"
                  aria-label="Add to AniList"
                  title="Add to AniList"
                >
                  <Plus className="w-3.5 h-3.5 text-green-400" />
                </button>
                {showAddMenu && (
                  <div className="absolute bottom-full right-0 mb-1 py-1 rounded-lg glass min-w-[120px] z-20">
                    {ADD_LIST_OPTIONS.map((opt) => (
                      <button
                        key={opt.key}
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowAddMenu(false);
                          onAddToList(manhwa, opt.key);
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
          </div>
        </div>
      </div>

      {/* Content — title + metadata */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-text-primary">
          {manhwa.title}
        </h3>

        <div className="flex items-center justify-between gap-2">
          {year && <span className="text-xs text-text-tertiary">{year}</span>}

          {(hasProgress || chapters) && (
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <BookOpen className="w-3.5 h-3.5 text-accent-primary" />
              {hasProgress && chapters ? (
                <>
                  <span className="text-text-primary">{userProgress}</span>
                  <span className="text-text-tertiary text-xs">/</span>
                  <span className="text-text-secondary">{chapters}</span>
                </>
              ) : (
                <span className="text-text-secondary">{chapters}</span>
              )}
            </div>
          )}
        </div>

        {hasProgress && chapters > 0 && (
          <div className="w-full h-1.5 rounded-full bg-surface-elevated overflow-hidden">
            <div
              className="h-full rounded-full bg-accent-primary"
              style={{ width: `${Math.min(100, (userProgress / chapters) * 100)}%` }}
            />
          </div>
        )}
      </div>
    </motion.div>
  );
}
