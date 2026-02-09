import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Star, BookOpen, Calendar, Link2, LinkIcon, Unlink } from 'lucide-react';

const STATUS_BADGES = {
  READING: 'badge-reading',
  COMPLETED: 'badge-completed',
  PAUSED: 'badge-paused',
  DROPPED: 'badge-dropped',
  PLANNING: 'badge-planning',
};

export default function ManhwaCard({ manhwa, onHover, onLink, onUnlink, isLinked, connectionId }) {
  const [imgLoaded, setImgLoaded] = useState(false);
  const navigate = useNavigate();

  const rating = manhwa.rating ? manhwa.rating.toFixed(1) : null;
  const chapters = manhwa.chapters_count || manhwa.chapters;
  const year = manhwa.year;
  const userStatus = manhwa.user_status;

  return (
    <motion.div
      className="group relative rounded-2xl glass glass-hover overflow-hidden transition-all duration-300 cursor-pointer"
      whileHover={{ y: -4 }}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      onHoverStart={() => onHover?.(manhwa.id)}
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
          loading="lazy"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Source badge */}
        <div className="absolute top-2 left-2">
          <span className="px-2 py-0.5 rounded-full text-[10px] font-medium glass">
            {manhwa.source === 'mangadex' ? 'MangaDex' : 'AniList'}
          </span>
        </div>

        {/* User status badge */}
        {userStatus && (
          <div className="absolute top-2 right-2">
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${STATUS_BADGES[userStatus] || ''}`}>
              {userStatus}
            </span>
          </div>
        )}

        {/* Link status */}
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          {isLinked ? (
            <button
              onClick={(e) => { e.stopPropagation(); onUnlink?.(connectionId); }}
              className="p-1.5 rounded-lg glass hover:bg-red-500/20 transition-colors"
              aria-label="Unlink manga"
              title="Unlink"
            >
              <Unlink className="w-3.5 h-3.5 text-red-400" />
            </button>
          ) : (
            <button
              onClick={(e) => { e.stopPropagation(); onLink?.(manhwa); }}
              className="p-1.5 rounded-lg glass hover:bg-accent-primary/20 transition-colors"
              aria-label="Link manga"
              title="Link to MangaDex"
            >
              <LinkIcon className="w-3.5 h-3.5 text-accent-primary" />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-3 space-y-1.5">
        <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-text-primary">
          {manhwa.title}
        </h3>

        <div className="flex flex-wrap gap-3 text-xs text-text-secondary">
          {rating && (
            <span className="flex items-center gap-1" aria-label={`Rating: ${rating}`}>
              <Star className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400" />
              {rating}
            </span>
          )}
          {chapters && (
            <span className="flex items-center gap-1" aria-label={`${chapters} chapters`}>
              <BookOpen className="w-3.5 h-3.5" />
              {chapters}
            </span>
          )}
          {year && (
            <span className="flex items-center gap-1" aria-label={`Year: ${year}`}>
              <Calendar className="w-3.5 h-3.5" />
              {year}
            </span>
          )}
        </div>

        {/* Link indicator */}
        {isLinked && (
          <div className="flex items-center gap-1 text-[10px] text-accent-primary">
            <Link2 className="w-3 h-3" />
            <span>Linked</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}
