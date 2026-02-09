import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { useAuthStore } from '../stores/useAuthStore';
import { BookOpen, Search, User, LogIn, LogOut } from 'lucide-react';
import SearchPage from '../pages/search';
import ProfilePage from '../pages/profile';
import HomePage from '../pages/index';
import ManhwaDetailPage from '../pages/manhwa/[id]';

function Navbar() {
  const { isAuthenticated, user, logout } = useAuthStore();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-glass-border">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-lg font-semibold hover:text-accent-primary transition-colors">
          <BookOpen className="w-6 h-6 text-accent-primary" />
          <span>Manhwa Discovery</span>
        </Link>

        <div className="flex items-center gap-1">
          <Link
            to="/search"
            className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-glass-highlight transition-colors text-sm"
          >
            <Search className="w-4 h-4" />
            <span className="hidden sm:inline">Search</span>
          </Link>

          {isAuthenticated ? (
            <>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-glass-highlight transition-colors text-sm"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:inline">{user?.username || 'Profile'}</span>
              </Link>
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl hover:bg-glass-highlight transition-colors text-sm text-text-secondary"
                aria-label="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </>
          ) : (
            <a
              href={`${import.meta.env.VITE_API_URL || 'http://localhost:8009'}/auth/anilist/login`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary/20 border border-accent-primary hover:bg-accent-primary/30 transition-colors text-sm"
            >
              <LogIn className="w-4 h-4" />
              <span>Login with AniList</span>
            </a>
          )}
        </div>
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="pt-20 px-4 max-w-7xl mx-auto pb-12">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/manhwa/:id" element={<ManhwaDetailPage />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function AuthCallback() {
  const { login } = useAuthStore();
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');
  const userJson = params.get('user');

  if (token && userJson) {
    try {
      const user = JSON.parse(decodeURIComponent(userJson));
      login(user, token);
    } catch {
      // Failed to parse
    }
  }

  return <Navigate to="/profile" replace />;
}
