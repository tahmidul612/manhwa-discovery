import { Star, BookOpen, Calendar, Percent, ExternalLink } from 'lucide-react';

export default function ComparisonView({ anilistData, mangadexData, confidence }) {
  if (!anilistData && !mangadexData) return null;

  const confidencePercent = confidence ? Math.round(confidence * 100) : null;
  const confidenceColor = confidence >= 0.9 ? 'text-green-400' : confidence >= 0.8 ? 'text-yellow-400' : 'text-orange-400';

  return (
    <div className="rounded-2xl glass p-6 space-y-4">
      {/* Confidence indicator */}
      {confidencePercent !== null && (
        <div className="flex items-center justify-center gap-2 pb-4 border-b border-glass-border">
          <Percent className={`w-5 h-5 ${confidenceColor}`} />
          <span className={`text-lg font-semibold ${confidenceColor}`}>
            {confidencePercent}% Match Confidence
          </span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* AniList Side */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-accent-primary">
            <span className="px-2 py-0.5 rounded-full bg-accent-primary/20 border border-accent-primary/30 text-xs">
              AniList
            </span>
            {anilistData?.id && (
              <a
                href={`https://anilist.co/manga/${anilistData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-accent-primary transition-colors"
                aria-label="View on AniList"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {anilistData ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                {anilistData.cover_image && (
                  <img
                    src={anilistData.cover_image}
                    alt="AniList cover"
                    className="w-20 h-28 object-cover rounded-lg"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
                  />
                )}
                <div className="space-y-1.5 min-w-0">
                  <h4 className="font-medium text-sm leading-tight">
                    {anilistData.title?.english || anilistData.title?.romaji || 'Unknown'}
                  </h4>
                  {anilistData.title?.romaji && anilistData.title?.english && (
                    <p className="text-xs text-text-tertiary">{anilistData.title.romaji}</p>
                  )}
                </div>
              </div>

              <DataRow icon={Star} label="Score" value={anilistData.average_score ? `${anilistData.average_score / 10}/10` : 'N/A'} />
              <DataRow icon={BookOpen} label="Chapters" value={anilistData.chapters || 'N/A'} />
              <DataRow label="Status" value={anilistData.status || 'N/A'} />
              <DataRow label="User Progress" value={`${anilistData.progress || 0} chapters`} />
              {anilistData.score && <DataRow label="User Score" value={`${anilistData.score}/10`} />}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No AniList data available</p>
          )}
        </div>

        {/* MangaDex Side */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-400">
            <span className="px-2 py-0.5 rounded-full bg-orange-400/20 border border-orange-400/30 text-xs">
              MangaDex
            </span>
            {mangadexData?.id && (
              <a
                href={`https://mangadex.org/title/${mangadexData.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-tertiary hover:text-orange-400 transition-colors"
                aria-label="View on MangaDex"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {mangadexData ? (
            <div className="space-y-3">
              <div className="flex gap-3">
                {mangadexData.cover_url && (
                  <img
                    src={mangadexData.cover_url}
                    alt="MangaDex cover"
                    className="w-20 h-28 object-cover rounded-lg"
                    loading="lazy"
                    onError={(e) => { e.target.onerror = null; e.target.src = '/placeholder.png'; }}
                  />
                )}
                <div className="space-y-1.5 min-w-0">
                  <h4 className="font-medium text-sm leading-tight">{mangadexData.title || 'Unknown'}</h4>
                  {mangadexData.description && (
                    <p className="text-xs text-text-tertiary line-clamp-3">{mangadexData.description}</p>
                  )}
                </div>
              </div>

              <DataRow icon={Star} label="Rating" value={mangadexData.rating ? `${mangadexData.rating}/10` : 'N/A'} />
              <DataRow icon={BookOpen} label="Chapters" value={mangadexData.chapters_count || 'N/A'} />
              <DataRow icon={Calendar} label="Year" value={mangadexData.year || 'N/A'} />
              <DataRow label="Status" value={mangadexData.status || 'N/A'} />
              {mangadexData.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {mangadexData.tags.slice(0, 6).map((tag) => (
                    <span key={tag} className="px-2 py-0.5 rounded-full glass text-[10px]">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-text-tertiary">No MangaDex data available</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DataRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {Icon && <Icon className="w-3.5 h-3.5 text-text-tertiary" />}
      <span className="text-text-tertiary">{label}:</span>
      <span className="text-text-primary">{value}</span>
    </div>
  );
}
