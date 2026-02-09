import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { User, BookOpen, Link2, LogIn } from 'lucide-react';
import { useAuthStore } from '../stores/useAuthStore';
import { apiClient } from '../services/api';
import UserListView from '../components/UserListView';

export default function ProfilePage() {
  const { isAuthenticated, user, token, updateUser } = useAuthStore();

  // Fetch fresh user data
  const { data: userData } = useQuery({
    queryKey: ['me'],
    queryFn: () => apiClient.getMe(),
    enabled: isAuthenticated && !!token,
    select: (res) => res.data,
    onSuccess: (data) => {
      if (data) updateUser(data);
    },
  });

  const displayUser = userData || user;

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="rounded-2xl glass p-8 text-center max-w-md space-y-4"
        >
          <User className="w-12 h-12 mx-auto text-text-tertiary" />
          <h2 className="text-xl font-semibold">Sign in to view your profile</h2>
          <p className="text-sm text-text-secondary">
            Connect your AniList account to sync your manga list and
            link entries with MangaDex.
          </p>
          <a
            href={`${import.meta.env.VITE_API_URL || 'http://localhost:8009'}/auth/anilist/login`}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-accent-primary hover:bg-accent-secondary transition-colors text-white font-medium"
          >
            <LogIn className="w-4 h-4" />
            Login with AniList
          </a>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Profile header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl glass p-6"
      >
        <div className="flex items-center gap-4">
          {displayUser?.avatar ? (
            <img
              src={displayUser.avatar}
              alt={displayUser.username}
              className="w-16 h-16 rounded-full border-2 border-accent-primary/30"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-accent-primary/20 flex items-center justify-center">
              <User className="w-8 h-8 text-accent-primary" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold truncate">
              {displayUser?.username || 'User'}
            </h1>
            {displayUser?.anilist_id && (
              <a
                href={`https://anilist.co/user/${displayUser.username || displayUser.anilist_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-accent-primary transition-colors"
              >
                View on AniList
              </a>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex gap-6 mt-4 pt-4 border-t border-glass-border">
          <Stat icon={BookOpen} label="Total Entries" value={displayUser?.total_entries || '—'} />
          <Stat icon={Link2} label="Linked" value={displayUser?.total_linked || '—'} />
        </div>
      </motion.div>

      {/* User manga list */}
      {displayUser?.anilist_id && (
        <UserListView userId={displayUser.anilist_id} />
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-accent-primary" />
      <div>
        <p className="text-lg font-semibold">{value}</p>
        <p className="text-xs text-text-tertiary">{label}</p>
      </div>
    </div>
  );
}
