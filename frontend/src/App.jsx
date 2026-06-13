import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import './App.css';
import { api } from './api';
import { supabase, supabaseConfigured } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import Onboarding from './components/Onboarding';
import { DisplayProvider, useDisplay } from './context/DisplayContext';
import { VitalityProvider } from './context/VitalityContext';
import VitalityBackground from './components/vitality/VitalityBackground';
import VitalityIntensityControl from './components/vitality/VitalityIntensityControl';
import ScreenBrightnessControl from './components/vitality/ScreenBrightnessControl';
import VortexTransition from './components/VortexTransition';

function AppRoot({ className = '', children }) {
  const { brightness } = useDisplay();
  return (
    <div className={`app-root ${className}`.trim()} data-brightness={brightness}>
      {children}
    </div>
  );
}

const Dashboard = lazy(() => import('./components/Dashboard'));
const MealLogger = lazy(() => import('./components/MealLogger'));
const Recipes = lazy(() => import('./components/Recipes'));
const AIInsights = lazy(() => import('./components/AIInsights'));
const Workouts = lazy(() => import('./components/Workouts'));

const TABS = [
  { id: 'dashboard', label: 'Dashboard', theme: 'dashboard' },
  { id: 'meals', label: 'Log Meals', theme: 'meals' },
  { id: 'workouts', label: 'Workouts', theme: 'workouts' },
  { id: 'recipes', label: 'Recipes', theme: 'recipes' },
  { id: 'ai', label: 'AI Coach', theme: 'ai' },
];

function TabFallback() {
  return <div className="card glass-card tab-loading">Loading...</div>;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [authReady, setAuthReady] = useState(!supabaseConfigured);
  const [user, setUser] = useState(null);
  const [tab, setTab] = useState('dashboard');
  const [displayTab, setDisplayTab] = useState('dashboard');
  const [dashboard, setDashboard] = useState(null);
  const [weeklyTracker, setWeeklyTracker] = useState(null);
  const [hydration, setHydration] = useState(null);
  const [meals, setMeals] = useState([]);
  const [recipes, setRecipes] = useState(null);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showVortex, setShowVortex] = useState(false);
  const [appVisible, setAppVisible] = useState(false);
  const vortexTriggeredRef = useRef(false);
  const mealsLoadedRef = useRef(false);
  const recipesLoadedRef = useRef(false);

  const refreshCore = useCallback(async (force = false) => {
    const boot = await api.getBootstrap(force);
    setDashboard(boot.dashboard);
    setWeeklyTracker(boot.weekly_tracker);
    setHydration(boot.hydration);
    setUser(boot.dashboard.user);
  }, []);

  const refreshMeals = useCallback(async () => {
    const mealList = await api.getMeals();
    setMeals(mealList);
    mealsLoadedRef.current = true;
  }, []);

  const refresh = useCallback(async () => {
    await refreshCore(true);
    if (mealsLoadedRef.current || displayTab === 'meals') {
      await refreshMeals();
    }
    if (recipesLoadedRef.current) {
      const recipePlan = await api.getRecipes(true);
      setRecipes(recipePlan);
    }
  }, [refreshCore, refreshMeals, displayTab]);

  const triggerVortex = useCallback(() => {
    vortexTriggeredRef.current = true;
    setShowVortex(true);
    setAppVisible(false);
  }, []);

  const handleVortexComplete = useCallback(() => {
    setShowVortex(false);
    setAppVisible(true);
  }, []);

  const switchTab = (nextTab) => {
    if (nextTab === tab) return;
    setTab(nextTab);
    setDisplayTab(nextTab);
    if (nextTab === 'meals' && !mealsLoadedRef.current) {
      refreshMeals().catch(() => {});
    }
    if (nextTab === 'recipes' && !recipesLoadedRef.current) {
      recipesLoadedRef.current = true;
      api.getRecipes().then(setRecipes).catch(() => {});
    }
  };

  useEffect(() => {
    api.health().then((h) => setAiEnabled(h.ai_enabled)).catch(() => {});
  }, []);

  useEffect(() => {
    if (!supabaseConfigured) return undefined;

    const isAuthCallback = () => {
      const { hash, search } = window.location;
      return hash.includes('access_token') || search.includes('code=') || hash.includes('type=magiclink');
    };

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setAuthReady(true);
      if (data.session) {
        if (isAuthCallback() && !vortexTriggeredRef.current) {
          triggerVortex();
          window.history.replaceState({}, '', window.location.pathname);
        } else {
          setAppVisible(true);
        }
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_IN' && nextSession && !vortexTriggeredRef.current) {
        triggerVortex();
      }
      setSession(nextSession);
      if (!nextSession) {
        setUser(null);
        setDashboard(null);
        setMeals([]);
        setRecipes(null);
        setHydration(null);
        setAppVisible(false);
        vortexTriggeredRef.current = false;
        mealsLoadedRef.current = false;
        recipesLoadedRef.current = false;
      }
    });

    return () => listener.subscription.unsubscribe();
  }, [triggerVortex]);

  useEffect(() => {
    if (!session) return undefined;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setError('');
      try {
        await refreshCore();
        if (cancelled) return;
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
  }, [session, refreshCore]);

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
      await refreshCore();
      triggerVortex();
    } catch (err) {
      setError(err.message || 'Could not create your profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    if (supabaseConfigured) {
      await supabase.auth.signOut({ scope: 'global' });
    }
    setSession(null);
    setUser(null);
    setDashboard(null);
    setMeals([]);
    setRecipes(null);
    setHydration(null);
    setTab('dashboard');
    setDisplayTab('dashboard');
    setAppVisible(false);
    vortexTriggeredRef.current = false;
    mealsLoadedRef.current = false;
    recipesLoadedRef.current = false;
  };

  const handleLogWeight = async () => {
    const w = prompt('Enter your current weight (kg):');
    if (!w || isNaN(w)) return;
    await api.logWeight({ weight_kg: parseFloat(w) });
    refreshCore();
  };

  const handleHydrationUpdate = useCallback((res) => {
    setHydration(res.hydration);
    setWeeklyTracker(res.weekly_tracker);
    setDashboard((prev) =>
      prev
        ? {
            ...prev,
            today: { ...prev.today, water_consumed_ml: res.hydration.consumed_ml },
          }
        : prev,
    );
  }, []);

  const activeTheme = TABS.find((t) => t.id === displayTab)?.theme || 'dashboard';

  let content;

  if (!authReady) {
    content = (
      <VitalityProvider context="dashboard">
        <AppRoot className="app-visible">
          <VitalityBackground />
          <div className="app loading-screen">Loading...</div>
        </AppRoot>
      </VitalityProvider>
    );
  } else if (supabaseConfigured && !session) {
    content = (
      <VitalityProvider context="dashboard">
        <AppRoot className="app-visible">
          <VitalityBackground />
          <AuthScreen />
          <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
        </AppRoot>
      </VitalityProvider>
    );
  } else if (!user) {
    content = (
      <VitalityProvider context="dashboard">
        <AppRoot className={!showVortex ? 'app-visible' : 'app-entering'}>
          <VitalityBackground />
          <div className="app">
            <header className="app-header glass-header">
              <div className="logo">FitTrack AI</div>
              <div className="header-actions">
                <ScreenBrightnessControl />
                {session && (
                  <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                    Sign out
                  </button>
                )}
              </div>
            </header>
            {error && <p className="auth-error">{error}</p>}
            <Onboarding onComplete={handleOnboard} loading={loading} />
          </div>
          <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
        </AppRoot>
      </VitalityProvider>
    );
  } else {
    content = (
      <VitalityProvider context={activeTheme}>
        <AppRoot className={appVisible ? 'app-visible' : 'app-entering'}>
          <VitalityBackground />
          <div className="app">
            <header className="app-header glass-header">
              <div>
                <div className="logo">FitTrack AI</div>
                <div className="header-sub">
                  Hi {user?.name || 'there'} · {user?.goal?.replace('_', ' ')}
                </div>
              </div>
              <div className="header-actions">
                <ScreenBrightnessControl />
                <VitalityIntensityControl />
                <span className={`ai-status ${aiEnabled ? 'on' : ''}`}>
                  {aiEnabled ? '● AI Coach Online' : '○ AI Coach Offline'}
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
                  className={`tab-${t.theme} ${tab === t.id ? 'active' : ''}`}
                  onClick={() => switchTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </nav>

            <div className={`panel-box panel-${activeTheme} tab-panel`}>
              <Suspense fallback={<TabFallback />}>
                {displayTab === 'dashboard' && (
                  <Dashboard
                    data={dashboard}
                    tracker={weeklyTracker}
                    hydration={hydration}
                    onLogWeight={handleLogWeight}
                    onHydrationUpdate={handleHydrationUpdate}
                  />
                )}
                {displayTab === 'meals' && (
                  <MealLogger meals={meals} onRefresh={refresh} />
                )}
                {displayTab === 'workouts' && (
                  <Workouts onRefresh={refresh} />
                )}
                {displayTab === 'recipes' && (
                  <Recipes data={recipes} loading={loading} onRefresh={refresh} user={user} />
                )}
                {displayTab === 'ai' && <AIInsights />}
              </Suspense>
            </div>
          </div>
          <VortexTransition active={showVortex} onComplete={handleVortexComplete} />
        </AppRoot>
      </VitalityProvider>
    );
  }

  return <DisplayProvider>{content}</DisplayProvider>;
}