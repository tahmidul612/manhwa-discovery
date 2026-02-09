import { motion } from 'framer-motion';
import { RotateCcw } from 'lucide-react';

const SORT_OPTIONS = [
  { value: 'relevance', label: 'Relevance' },
  { value: 'rating', label: 'Rating' },
  { value: 'chapters', label: 'Chapter Count' },
  { value: 'latest_update', label: 'Latest Update' },
  { value: 'release_date', label: 'Release Date' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'hiatus', label: 'Hiatus' },
  { value: 'cancelled', label: 'Cancelled' },
];

export default function FilterPanel({ filters = {}, onFilterChange }) {
  const update = (key, value) => {
    onFilterChange({ ...filters, [key]: value || undefined });
  };

  const reset = () => {
    onFilterChange({});
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      className="rounded-2xl glass p-4 space-y-4"
    >
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-text-secondary">Filters & Sorting</h3>
        <button
          onClick={reset}
          className="flex items-center gap-1 text-xs text-text-tertiary hover:text-text-primary transition-colors"
          aria-label="Reset all filters"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Reset
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Sort by */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Sort by</label>
          <select
            value={filters.sort_by || 'relevance'}
            onChange={(e) => update('sort_by', e.target.value)}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface-elevated">{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Status</label>
          <select
            value={filters.status || ''}
            onChange={(e) => update('status', e.target.value)}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-surface-elevated">{opt.label}</option>
            ))}
          </select>
        </div>

        {/* Min Rating */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">
            Min Rating: {filters.min_rating || 0}
          </label>
          <input
            type="range"
            min="0"
            max="10"
            step="0.5"
            value={filters.min_rating || 0}
            onChange={(e) => update('min_rating', parseFloat(e.target.value) || undefined)}
            className="w-full accent-accent-primary"
            aria-label="Minimum rating filter"
          />
        </div>

        {/* Min Chapters */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Min Chapters</label>
          <input
            type="number"
            min="0"
            placeholder="0"
            value={filters.min_chapters || ''}
            onChange={(e) => update('min_chapters', parseInt(e.target.value) || undefined)}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
          />
        </div>

        {/* Release Year Min */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Year From</label>
          <input
            type="number"
            min="1990"
            max="2026"
            placeholder="Any"
            value={filters.release_year_min || ''}
            onChange={(e) => update('release_year_min', parseInt(e.target.value) || undefined)}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
          />
        </div>

        {/* Release Year Max */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Year To</label>
          <input
            type="number"
            min="1990"
            max="2026"
            placeholder="Any"
            value={filters.release_year_max || ''}
            onChange={(e) => update('release_year_max', parseInt(e.target.value) || undefined)}
            className="w-full px-3 py-2 rounded-xl glass text-sm outline-none focus:border-accent-primary bg-transparent"
          />
        </div>

        {/* Sort order */}
        <div>
          <label className="block text-xs text-text-tertiary mb-1.5">Order</label>
          <div className="flex gap-1">
            <button
              onClick={() => update('sort_order', 'desc')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm transition-colors ${
                (filters.sort_order || 'desc') === 'desc'
                  ? 'bg-accent-primary/20 border border-accent-primary'
                  : 'glass'
              }`}
            >
              Desc
            </button>
            <button
              onClick={() => update('sort_order', 'asc')}
              className={`flex-1 px-3 py-2 rounded-xl text-sm transition-colors ${
                filters.sort_order === 'asc'
                  ? 'bg-accent-primary/20 border border-accent-primary'
                  : 'glass'
              }`}
            >
              Asc
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
