// Auth service - delegates to useAuthStore for state management.
// This module provides standalone helpers for non-component contexts.

const API_URL = import.meta.env?.VITE_API_URL || 'http://localhost:8000';

export function getLoginUrl() {
  return `${API_URL}/auth/anilist/login`;
}

export function getAuthToken() {
  return localStorage.getItem('auth_token');
}

export function isAuthenticated() {
  return !!getAuthToken();
}

export function logout() {
  localStorage.removeItem('auth_token');
}
