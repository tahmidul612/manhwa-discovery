// API client for backend communication
import axios from 'axios';
import { useAuthStore } from '../stores/useAuthStore';
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8009',
  timeout: 30090,
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear both localStorage and Zustand store
      localStorage.removeItem('auth_token');
      const { logout } = useAuthStore.getState();
      logout();
    }
    return Promise.reject(error);
  }
);

export const apiClient = {
  // Auth
  getLoginUrl: () => api.get('/auth/anilist/login'),
  getMe: () => api.get('/auth/me'),

  // Trending & Popular
  getTrending: (page = 1, perPage = 20) =>
    api.get('/manhwa/trending', { params: { page, per_page: perPage } }),
  getPopular: (page = 1, perPage = 20) =>
    api.get('/manhwa/popular', { params: { page, per_page: perPage } }),

  // Browse & Metadata
  browseManhwa: (filters = {}) =>
    api.get('/manhwa/browse', { params: filters }),
  getGenres: () => api.get('/manhwa/genres'),
  getTags: () => api.get('/manhwa/tags'),

  // Search
  searchManhwa: (query, filters = {}) =>
    api.get('/manhwa/search', { params: { query, ...filters } }),

  // Manhwa details
  getManhwaDetails: (id, source = 'mangadex') =>
    api.get(`/manhwa/${id}`, { params: { source } }),

  // Chapters
  getChapters: (manhwaId, lang = 'en', page = 1, perPage = 50) =>
    api.get(`/manhwa/${manhwaId}/chapters`, { params: { lang, page, per_page: perPage } }),

  // User lists
  getUserLists: (userId, status = null) =>
    api.get(`/users/${userId}/lists`, { params: status ? { status } : {} }),

  // Sync & Auto-link
  syncUserList: (userId) =>
    api.post(`/users/${userId}/sync`),

  autoLinkEntry: (userId, anilistId, anilistEntry) =>
    api.post(`/users/${userId}/auto-link-entry`, {
      anilist_id: String(anilistId),
      anilist_entry: anilistEntry,
    }),

  // Connections
  getUserConnections: (userId, skip = 0, limit = 20) =>
    api.get(`/users/${userId}/connections`, { params: { skip, limit } }),

  createConnection: (data) =>
    api.post('/manhwa/connect', data),

  removeConnection: (connectionId) =>
    api.delete(`/manhwa/connect/${connectionId}`),

  // Add to AniList
  addToAniList: (data) =>
    api.post('/manhwa/anilist/add', data),

  addToAniListById: (anilistId, status = 'PLANNING') =>
    api.post('/manhwa/anilist/add-by-id', { anilist_id: anilistId, status }),
};

export default apiClient;
