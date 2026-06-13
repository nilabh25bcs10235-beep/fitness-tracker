import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { HEALTH_LABELS, healthScoreClass } from '../lib/healthScore';
import ReactiveField from './reactive/ReactiveField';
import CelebrateBurst from './reactive/CelebrateBurst';
import { useVitality } from '../context/VitalityContext';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

const MICRO_LABELS = {
  iron_mg: 'Iron',
  calcium_mg: 'Calcium',
  vitamin_c_mg: 'Vitamin C',
  sodium_mg: 'Sodium',
  potassium_mg: 'Potassium',
  zinc_mg: 'Zinc',
  vitamin_a_mcg: 'Vitamin A',
  vitamin_d_mcg: 'Vitamin D',
  sugar_g: 'Sugar',
  saturated_fat_g: 'Saturated fat',
};

function MacroAnalysis({ analysis }) {
  if (!analysis) return null;
  const micros = analysis.micronutrients || {};

  return (
    <div className="insight-box" style={{ marginTop: '1rem' }}>
      <strong>{analysis.name}</strong>
      <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>{analysis.notes}</p>
      <div className="chip-row">
        <span className="chip">{Math.round(analysis.calories)} kcal</span>
        <span className="chip">{Math.round(analysis.protein_g)}g protein</span>
        <span className="chip">{Math.round(analysis.carbs_g)}g carbs</span>
        <span className="chip">{Math.round(analysis.fat_g)}g fat</span>
        <span className="chip">{Math.round(analysis.fiber_g)}g fibre</span>
        <span className="badge">{analysis.confidence} confidence</span>
      </div>
      {(analysis.micro_description || Object.keys(micros).length > 0) && (
        <details className="micro-details">
          <summary>Micronutrient breakdown</summary>
          {analysis.micro_description && (
            <p className="micro-desc">{analysis.micro_description}</p>
          )}
          {Object.keys(micros).length > 0 && (
            <div className="chip-row">
              {Object.entries(micros).map(([key, val]) => (
                <span key={key} className="chip micro-chip">
                  {MICRO_LABELS[key] || key}: {typeof val === 'number' ? Math.round(val * 10) / 10 : val}
                </span>
              ))}
            </div>
          )}
        </details>
      )}
    </div>
  );
}

export default function MealLogger({ meals, onRefresh }) {
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState('');
  const [lastHealthScore, setLastHealthScore] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const suggestRef = useRef(null);
  const analyzeRef = useRef(null);
  const analyzeAbortRef = useRef(null);
  const lastAnalyzedRef = useRef('');
  const inputRef = useRef(null);
  const { signalSuccess } = useVitality();

  const runAnalysis = async (text) => {
    const trimmed = text.trim();
    if (trimmed.length < 4) {
      setAnalysis(null);
      return;
    }
    if (trimmed === lastAnalyzedRef.current) return;

    if (analyzeAbortRef.current) {
      analyzeAbortRef.current.abort();
    }
    const controller = new AbortController();
    analyzeAbortRef.current = controller;

    setAnalyzing(true);
    setError('');
    try {
      const result = await api.analyzeText(trimmed, { signal: controller.signal });
      if (!controller.signal.aborted) {
        lastAnalyzedRef.current = trimmed;
        setAnalysis(result);
      }
    } catch (e) {
      if (e.name !== 'AbortError' && !controller.signal.aborted) {
        setError(e.message);
      }
    } finally {
      if (!controller.signal.aborted) {
        setAnalyzing(false);
      }
    }
  };

  useEffect(() => {
    if (suggestRef.current) clearTimeout(suggestRef.current);
    if (analyzeRef.current) clearTimeout(analyzeRef.current);

    if (description.trim().length < 2) {
      setSuggestions([]);
      setAnalysis(null);
      lastAnalyzedRef.current = '';
      return;
    }

    suggestRef.current = setTimeout(async () => {
      try {
        const res = await api.getFoodSuggestions(description);
        setSuggestions(res.suggestions || []);
        setShowSuggestions(true);
      } catch {
        setSuggestions([]);
      }
    }, 350);

    if (description.trim().length >= 4) {
      analyzeRef.current = setTimeout(() => {
        runAnalysis(description);
      }, 1400);
    }

    return () => {
      if (suggestRef.current) clearTimeout(suggestRef.current);
      if (analyzeRef.current) clearTimeout(analyzeRef.current);
    };
  }, [description]);

  const selectSuggestion = (name) => {
    setDescription(name);
    setShowSuggestions(false);
    runAnalysis(name);
  };

  const handleLogMeal = async () => {
    const data = analysis || {
      name: description.slice(0, 50) || 'Meal',
      description,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      fat_g: 0,
      fiber_g: 0,
    };
    setLoading(true);
    try {
      const microPayload = analysis
        ? JSON.stringify({
            micronutrients: analysis.micronutrients,
            micro_description: analysis.micro_description,
            notes: analysis.notes,
          })
        : null;

      const saved = await api.logMeal({
        name: data.name,
        description: data.description || description,
        meal_type: mealType,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        fiber_g: data.fiber_g,
        ai_analysis: microPayload,
      });
      setLastHealthScore(saved.health_score);
      setCelebrate(true);
      signalSuccess('meals');
      setDescription('');
      setAnalysis(null);
      setSuggestions([]);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.analyzeMealImage(file, mealType);
      setAnalysis(result);
      setDescription(result.description || result.name);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card card-lively">
        <h2>Log a Meal</h2>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Type or upload a meal — AI auto-detects calories, macros, and micronutrients.
        </p>

        <div className="form-group">
          <label>Meal Type</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <ReactiveField
          theme="food"
          label="What did you eat?"
          wrapClassName="food-input-wrap"
          inputRef={inputRef}
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder="e.g. tandoori chicken"
          autoComplete="off"
        >
          {showSuggestions && suggestions.length > 0 && (
            <ul className="food-suggestions">
              {suggestions.map((s) => (
                <li key={s}>
                  <button type="button" onMouseDown={() => selectSuggestion(s)}>
                    {s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </ReactiveField>

        {analyzing && <p className="analyzing-hint">Analyzing nutrition...</p>}

        <MacroAnalysis analysis={analysis} />

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <button
            className="btn btn-primary"
            onClick={handleLogMeal}
            disabled={loading || !description.trim()}
          >
            {loading ? 'Saving...' : 'Log Meal'}
          </button>
        </div>

        <div style={{ marginTop: '1.5rem' }}>
          <label className="upload-zone">
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={loading} />
            <div style={{ fontSize: '2rem' }}>📷</div>
            <p>Upload meal photo for AI vision analysis</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              AI vision estimates calories, macros & micronutrients
            </p>
          </label>
        </div>

        <CelebrateBurst
          active={celebrate}
          theme="food"
          message="Meal logged!"
          onDone={() => setCelebrate(false)}
        />

        {lastHealthScore && (
          <div className={`health-score-banner ${healthScoreClass(lastHealthScore)}`}>
            Health score: <strong>{HEALTH_LABELS[lastHealthScore] || lastHealthScore}</strong>
          </div>
        )}

        {error && <p className="error">{error}</p>}
      </div>

      <div className="card card-lively">
        <h3>Today's Meals ({meals.length})</h3>
        <ul className="meal-list">
          {meals.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <span className="badge" style={{ marginLeft: '0.5rem' }}>{m.meal_type}</span>
                {m.health_score && (
                  <span className={healthScoreClass(m.health_score)} style={{ marginLeft: '0.4rem' }}>
                    {HEALTH_LABELS[m.health_score]}
                  </span>
                )}
                {m.image_path && <span className="badge" style={{ marginLeft: '0.3rem' }}>📷 AI</span>}
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                <div>{Math.round(m.calories)} kcal</div>
                <div style={{ color: 'var(--muted)' }}>
                  P {Math.round(m.protein_g)}g · C {Math.round(m.carbs_g)}g · F {Math.round(m.fat_g)}g
                </div>
              </div>
            </li>
          ))}
          {meals.length === 0 && (
            <p style={{ color: 'var(--muted)' }}>No meals logged today. Start tracking!</p>
          )}
        </ul>
      </div>
    </div>
  );
}