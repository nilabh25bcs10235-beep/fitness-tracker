import { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api } from './api';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import MealLogger from './components/MealLogger';
import Recipes from './components/Recipes';
import AIInsights from './components/AIInsights';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'meals', label: 'Log Meals' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'ai', label: 'AI Coach' },
];

export default function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem('fittrack_user_id'));
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const [dash, mealList] = await Promise.all([
      api.getDashboard(userId),
      api.getMeals(userId),
    ]);
    setDashboard(dash);
    setMeals(mealList);
    setUser(dash.user);
  }, [userId]);

  useEffect(() => {
    api.health().then((h) => setAiEnabled(h.ai_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (userId) refresh();
  }, [userId, refresh]);

  const handleOnboard = async (form) => {
    setLoading(true);
    try {
      const u = await api.createUser(form);
      localStorage.setItem('fittrack_user_id', u.id);
      setUserId(String(u.id));
      setUser(u);
    } finally {
      setLoading(false);
    }
  };

  const loadRecipes = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const r = await api.getRecipes(userId);
      setRecipes(r);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWeight = async () => {
    const w = prompt('Enter your current weight (kg):');
    if (!w || isNaN(w)) return;
    await api.logWeight(userId, { weight_kg: parseFloat(w) });
    refresh();
  };

  if (!userId) {
    return (
      <div className="app">
        <header className="app-header">
          <div className="logo">FitTrack AI</div>
        </header>
        <Onboarding onComplete={handleOnboard} loading={loading} />
      </div>
    );
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <div className="logo">FitTrack AI</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Hi {user?.name || 'there'} · {user?.goal?.replace('_', ' ')}
          </div>
        </div>
        <span className={`ai-status ${aiEnabled ? 'on' : ''}`}>
          {aiEnabled ? '● Groq AI Online' : '○ Groq AI Offline'}
        </span>
      </header>

      <nav className="tabs">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={tab === t.id ? 'active' : ''}
            onClick={() => {
              setTab(t.id);
              if (t.id === 'recipes' && !recipes) loadRecipes();
            }}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {tab === 'dashboard' && (
        <Dashboard data={dashboard} onLogWeight={handleLogWeight} />
      )}
      {tab === 'meals' && (
        <MealLogger userId={userId} meals={meals} onRefresh={refresh} />
      )}
      {tab === 'recipes' && (
        <Recipes data={recipes} loading={loading} onRefresh={loadRecipes} />
      )}
      {tab === 'ai' && <AIInsights userId={userId} />}
    </div>
  );
}