import { getAccessToken } from './lib/supabase';

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000' : '');

async function authHeaders(extra = {}) {
  const token = await getAccessToken();
  const headers = { ...extra };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

async function request(path, options = {}) {
  const headers = await authHeaders(options.headers || {});
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const message =
      typeof detail === 'string'
        ? detail
        : Array.isArray(detail)
          ? detail[0]?.msg
          : res.statusText;
    const error = new Error(message || res.statusText);
    error.status = res.status;
    throw error;
  }
  if (res.status === 204) return null;
  return res.json();
}

async function uploadFile(path, formData) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText);
  }
  return res.json();
}

export const api = {
  health: () => request('/api/health'),

  createUser: (data) =>
    request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getMe: () => request('/api/users/me'),

  getDashboard: () => request('/api/progress/me/dashboard'),

  getWeeklyTracker: () => request('/api/progress/me/weekly-tracker'),

  getMeals: (logDate) =>
    request(`/api/meals/me${logDate ? `?log_date=${logDate}` : ''}`),

  logMeal: (data) =>
    request('/api/meals/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  analyzeText: (description) =>
    request(`/api/meals/analyze-text?description=${encodeURIComponent(description)}`, {
      method: 'POST',
    }),

  getFoodSuggestions: (q) =>
    request(`/api/meals/food-suggestions?q=${encodeURIComponent(q)}`),

  analyzeMealImage: async (file, mealType = 'lunch') => {
    const form = new FormData();
    form.append('meal_type', mealType);
    form.append('file', file);
    return uploadFile('/api/meals/analyze-image', form);
  },

  analyzeAndLogImage: async (file, mealType) => {
    const form = new FormData();
    form.append('meal_type', mealType);
    form.append('file', file);
    return uploadFile('/api/meals/me/with-image', form);
  },

  logWeight: (data) =>
    request('/api/progress/me/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getRecipes: () => request('/api/recipes/me'),

  generateRecipes: (preferences) =>
    request('/api/recipes/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    }),

  getInsight: (query) =>
    request('/api/ai/me/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }),

  analyzeBodyImage: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return uploadFile('/api/ai/me/body-image', form);
  },

  getExercises: (bodyPart) =>
    request(`/api/ai/me/exercises?body_part=${encodeURIComponent(bodyPart)}`, {
      method: 'POST',
    }),

  estimateCalorieBurn: (data) =>
    request('/api/ai/me/calorie-burn', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  logWorkout: (data) =>
    request('/api/workouts/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getWorkouts: (logDate) =>
    request(`/api/workouts/me${logDate ? `?log_date=${logDate}` : ''}`),
};