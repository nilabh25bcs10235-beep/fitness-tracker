const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const detail = err.detail;
    const message = typeof detail === 'string' ? detail : Array.isArray(detail) ? detail[0]?.msg : res.statusText;
    throw new Error(message || res.statusText);
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

  getUser: (id) => request(`/api/users/${id}`),

  getDashboard: (userId) => request(`/api/progress/${userId}/dashboard`),

  getMeals: (userId, logDate) =>
    request(`/api/meals/${userId}${logDate ? `?log_date=${logDate}` : ''}`),

  logMeal: (userId, data) =>
    request(`/api/meals/${userId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  analyzeText: (userId, description) =>
    request(`/api/meals/analyze-text?user_id=${userId}&description=${encodeURIComponent(description)}`, {
      method: 'POST',
    }),

  analyzeAndLogImage: async (userId, file, mealType) => {
    const form = new FormData();
    form.append('user_id', userId);
    form.append('meal_type', mealType);
    form.append('file', file);
    const res = await fetch(`${API_BASE}/api/meals/${userId}/with-image`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error('Image analysis failed');
    return res.json();
  },

  logWeight: (userId, data) =>
    request(`/api/progress/${userId}/weight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }),

  getRecipes: (userId) => request(`/api/recipes/${userId}`),

  getInsight: (userId, query) =>
    request(`/api/ai/${userId}/insight`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    }),
};