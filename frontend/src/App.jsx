import { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { api } from './api';
import { supabase, supabaseConfigured } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import Dashboard from './components/Dashboard';
import MealLogger from './components/MealLogger';
import Recipes from './components/Recipes';
import AIInsights from './components/AIInsights';
import Workouts from './components/Workouts';
import StarfieldBackground from './components/StarfieldBackground';
import VortexTransition from './components/VortexTransition';

const TABS = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'meals', label: 'Log Meals' },
  { id: 'workouts', label: 'Workouts' },
  { id: 'recipes', label: 'Recipes' },
  { id: 'ai', label: 'AI Coach' },
];

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [weeklyTracker, setWeeklyTracker] = useState(null);
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVortex, setShowVortex] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const vortexTriggeredRef = useRef(false);

  const refresh = useCallback(async () => {
    const [dash, mealList, tracker] = await Promise.all([
      api.getDashboard(),
      api.getMeals(),
      api.getWeeklyTracker(),
    ]);
    setDashboard(dash);
    setMeals(mealList);
    setWeeklyTracker(tracker);
    setUser(dash.user);
  }, []);

  const triggerVortex = useCallback(() => {
    if (vortexTriggeredRef.current) return;
    vortexTriggeredRef.current = true;
    setShowVortex(true);
    setAppVisible(false);
  }, []);

  const handleVortexComplete = useCallback(() => {
    setShowVortex(false);
    setAppVisible(true);
  }, []);

  useEffect(() => {
    api.health().then((h) => setAiEnabled(h.ai_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) setAppVisible(true);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_IN' && nextSession) {
        vortexTriggeredRef.current = false;
        triggerVortex();
      }
      setSession(nextSession);
      if (!nextSession) {
        setUser(null);
        setDashboard(null);
        setMeals([]);
        setRecipes(null);
        setAppVisible(false);
        vortexTriggeredRef.current = false;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [triggerVortex]);

  useEffect(() => {
    if (!session) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const profile = await api.getMe();
        if (cancelled) return;
        setUser(profile);
        await refresh();
      } catch (err) {
        if (cancelled) return;
        if (err.status === 404) {
          setUser(null);
        } else {
          setError(err.message || 'Failed to load your profile');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [session, refresh, triggerVortex]);

  const handleOnboard = async (form) => {
    setLoading(true);
    setError('');
    try {
      const payload = {
        ...form,
        email: session?.user?.email || null,
        phone: session?.user?.phone || null,
      };
      const profile = await api.createUser(payload);
      setUser(profile);
      await refresh();
      triggerVortex();
    } catch (err) {
      setError(err.message || 'Could not create your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
    setDashboard(null);
    setMeals([]);
    setRecipes(null);
    setTab('dashboard');
    setAppVisible(false);
    vortexTriggeredRef.current = false;
  };

  const loadRecipes = async () => {
    setLoading(true);
    try {
      const r = await api.getRecipes();
      setRecipes(r);
    } finally {
      setLoading(false);
    }
  };

  const handleLogWeight = async () => {
    const w = prompt('Enter your current weight (kg):');
    if (!w || isNaN(w)) return;
    await api.logWeight({ weight_kg: parseFloat(w) });
    refresh();
  };

  if (!authReady) {
    return (
      <div className="app-root">
        <StarfieldBackground />
        <div className="app loading-screen">Loading...</div>
      </div>
    );
  }

  if (supabaseConfigured && !session) {
    return (
      <div className="app-root">
        <StarfieldBackground />
        <AuthScreen />
        <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className={`app-root ${appVisible ? 'app-visible' : ''}`}>
        <StarfieldBackground />
        <div className="app">
          <header className="app-header glass-header">
            <div className="logo">FitTrack AI</div>
            {session && (
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                Sign out
              </button>
            )}
          </header>
          {error && <p className="auth-error">{error}</p>}
          <Onboarding onComplete={handleOnboard} loading={loading} />
        </div>
        <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
      </div>
    );
  }

  return (
    <div className={`app-root ${appVisible ? 'app-visible' : ''}`}>
      <StarfieldBackground />
      <div className="app">
        <header className="app-header glass-header">
          <div>
            <div className="logo">FitTrack AI</div>
            <div className="header-sub">
              Hi {user?.name || 'there'} · {user?.goal?.replace('_', ' ')}
            </div>
          </div>
          <div className="header-actions">
            <span className={`ai-status ${aiEnabled ? 'on' : ''}`}>
              {aiEnabled ? '● Groq AI Online' : '○ Groq AI Offline'}
            </span>
            <button type="button" className="btn btn-ghost" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </header>

        {error && <p className="auth-error">{error}</p>}

        <nav className="tabs">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
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
          <Dashboard data={dashboard} tracker={weeklyTracker} onLogWeight={handleLogWeight} />
        )}
        {tab === 'meals' && <MealLogger meals={meals} onRefresh={refresh} />}
        {tab === 'workouts' && <Workouts onRefresh={refresh} />}
        {tab === 'recipes' && (
          <Recipes data={recipes} loading={loading} onRefresh={loadRecipes} user={user} />
        )}
        {tab === 'ai' && <AIInsights />}
      </div>
      <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
    </div>
  );
}