import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { Search, TrendingUp, BookOpen, Sparkles } from 'lucide-react';
import { apiClient } from '../services/api';
import ManhwaCard from '../components/ManhwaCard';
import { SkeletonGrid } from '../components/SkeletonCard';

export default function HomePage() {
  const [heroQuery, setHeroQuery] = useState('');
  const navigate = useNavigate();

  const { data: trending, isLoading } = useQuery({
    queryKey: ['trending'],
    queryFn: () => apiClient.searchManhwa('', { sort_by: 'rating', per_page: 10 }),
    select: (res) => res.data?.results || [],
    staleTime: 10 * 60 * 1000,
  });

  const handleSearch = (e) => {
    e.preventDefault();
    if (heroQuery.trim()) {
      navigate(`/search?q=${encodeURIComponent(heroQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 max-w-2xl"
        >
          <div className="flex items-center justify-center gap-2 text-accent-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium tracking-wide uppercase">Discover your next read</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            Your Manhwa,{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-primary to-accent-secondary">
              Unified
            </span>
          </h1>

          <p className="text-text-secondary text-lg max-w-lg mx-auto">
            Bridge your AniList collection with MangaDex. Search, discover, and track
            manga across platforms in one place.
          </p>

          {/* Hero search */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto w-full">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
              <input
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
                placeholder="Search manhwa..."
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl glass focus:border-accent-primary focus:shadow-glow transition-all outline-none text-text-primary placeholder:text-text-tertiary"
                aria-label="Search manhwa"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3.5 rounded-2xl bg-accent-primary hover:bg-accent-secondary transition-colors text-white font-medium"
            >
              Search
            </button>
          </form>
        </motion.div>

        {/* Background glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-accent-primary/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* Trending / Top Rated Section */}
      <section className="space-y-6">
        <div className="flex items-center gap-3">
          <TrendingUp className="w-5 h-5 text-accent-primary" />
          <h2 className="text-xl font-semibold">Top Rated</h2>
        </div>

        {isLoading ? (
          <SkeletonGrid count={10} />
        ) : trending?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {trending.map((manhwa) => (
              <ManhwaCard key={manhwa.id} manhwa={manhwa} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-text-secondary">
            <BookOpen className="w-8 h-8 mx-auto mb-3 opacity-50" />
            <p>No trending manga found. Try searching above!</p>
          </div>
        )}
      </section>

      {/* Features Section */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          {
            icon: Search,
            title: 'Unified Search',
            desc: 'Search across AniList and MangaDex simultaneously with intelligent fuzzy matching.',
          },
          {
            icon: BookOpen,
            title: 'Smart Linking',
            desc: 'Automatically match your AniList entries with MangaDex for enriched metadata.',
          },
          {
            icon: TrendingUp,
            title: 'Track Progress',
            desc: 'View your reading progress alongside chapter counts and latest updates.',
          },
        ].map((feature) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="rounded-2xl glass p-6 space-y-3"
          >
            <feature.icon className="w-8 h-8 text-accent-primary" />
            <h3 className="font-semibold">{feature.title}</h3>
            <p className="text-sm text-text-secondary">{feature.desc}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
