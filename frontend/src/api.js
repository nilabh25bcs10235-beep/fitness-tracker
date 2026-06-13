import { getAccessToken } from './lib/supabase';

const API_BASE =
  import.meta.env.VITE_API_URL ??
  (import.meta.env.DEV ? 'http://localhost:8000' : '');

const cache = new Map();
const inFlight = new Map();
const mealAnalysisCache = new Map();

const TTL = {
  bootstrap: 20_000,
  meals: 15_000,
  recipes: 60_000,
  default: 10_000,
};

function cacheKey(method, path) {
  return `${method}:${path}`;
}

function getCached(key) {
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cache.delete(key);
    return null;
  }
  return hit.data;
}

function setCached(key, data, ttl) {
  cache.set(key, { data, expires: Date.now() + ttl });
}

export function invalidateApiCache(...prefixes) {
  for (const key of cache.keys()) {
    if (prefixes.some((p) => key.includes(p))) {
      cache.delete(key);
    }
  }
}

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

async function cachedGet(path, ttl = TTL.default, force = false) {
  const key = cacheKey('GET', path);
  if (!force) {
    const hit = getCached(key);
    if (hit) return hit;
    if (inFlight.has(key)) return inFlight.get(key);
  }

  const promise = request(path).then((data) => {
    setCached(key, data, ttl);
    inFlight.delete(key);
    return data;
  }).catch((err) => {
    inFlight.delete(key);
    throw err;
  });

  inFlight.set(key, promise);
  return promise;
}

async function uploadFile(path, formData) {
  invalidateApiCache('/api/meals', '/api/progress', '/api/hydration');
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

  createUser: (data) => {
    invalidateApiCache('/api/progress', '/api/users');
    return request('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getMe: () => cachedGet('/api/users/me', TTL.default),

  getBootstrap: (force = false) =>
    cachedGet('/api/progress/me/bootstrap', TTL.bootstrap, force),

  getDashboard: (force = false) =>
    cachedGet('/api/progress/me/dashboard', TTL.bootstrap, force),

  getWeeklyTracker: (force = false) =>
    cachedGet('/api/progress/me/weekly-tracker', TTL.bootstrap, force),

  getMeals: (logDate, force = false) =>
    cachedGet(`/api/meals/me${logDate ? `?log_date=${logDate}` : ''}`, TTL.meals, force),

  logMeal: (data) => {
    invalidateApiCache('/api/meals', '/api/progress', '/api/hydration');
    return request('/api/meals/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  analyzeText: async (description, { signal } = {}) => {
    const key = description.trim().toLowerCase();
    if (mealAnalysisCache.has(key)) {
      return mealAnalysisCache.get(key);
    }

    const headers = await authHeaders();
    const res = await fetch(
      `${API_BASE}/api/meals/analyze-text?description=${encodeURIComponent(description.trim())}`,
      { method: 'POST', headers, signal },
    );
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || res.statusText);
    }
    const data = await res.json();
    mealAnalysisCache.set(key, data);
    return data;
  },

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

  logWeight: (data) => {
    invalidateApiCache('/api/progress');
    return request('/api/progress/me/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getHydrationToday: (force = false) =>
    cachedGet('/api/hydration/me/today', TTL.bootstrap, force),

  logWater: (data) => {
    invalidateApiCache('/api/hydration', '/api/progress');
    return request('/api/hydration/me/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getRecipes: (force = false) =>
    cachedGet('/api/recipes/me', TTL.recipes, force),

  generateRecipes: (preferences) => {
    invalidateApiCache('/api/recipes');
    return request('/api/recipes/me/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(preferences),
    });
  },

  updateWeeklySchedule: (weekly_schedule) => {
    invalidateApiCache('/api/recipes');
    return request('/api/recipes/me/weekly-schedule', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weekly_schedule }),
    });
  },

  updateTodayPlan: (today_plan) => {
    invalidateApiCache('/api/recipes');
    return request('/api/recipes/me/today-plan', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ today_plan }),
    });
  },

  updateGrocery: (grocery_list) => {
    invalidateApiCache('/api/recipes');
    return request('/api/recipes/me/grocery', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ grocery_list }),
    });
  },

  getInsight: (query) =>
    request('/api/ai/me/insight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }),

  listCoachConversations: () =>
    cachedGet('/api/ai/me/conversations', TTL.default),

  createCoachConversation: () => {
    invalidateApiCache('/api/ai/me/conversations');
    return request('/api/ai/me/conversations', { method: 'POST' });
  },

  getCoachConversation: (id) =>
    request(`/api/ai/me/conversations/${id}`),

  deleteCoachConversation: (id) => {
    invalidateApiCache('/api/ai/me/conversations');
    return request(`/api/ai/me/conversations/${id}`, { method: 'DELETE' });
  },

  sendCoachMessage: (conversationId, content) => {
    invalidateApiCache('/api/ai/me/conversations');
    return request(`/api/ai/me/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
  },

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

  logWorkout: (data) => {
    invalidateApiCache('/api/progress', '/api/workouts');
    return request('/api/workouts/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
  },

  getWorkouts: (logDate) =>
    cachedGet(`/api/workouts/me${logDate ? `?log_date=${logDate}` : ''}`, TTL.meals),
};