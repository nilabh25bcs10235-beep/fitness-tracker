import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { analyzeMealImageVision } from '../lib/visionAnalysis';
import { HEALTH_LABELS, healthScoreClass } from '../lib/healthScore';
import ReactiveField from './reactive/ReactiveField';
import CelebrateBurst from './reactive/CelebrateBurst';
import ImageAnalysisProgress from './ImageAnalysisProgress';
import MealScanResults from './MealScanResults';
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

function TextMacroAnalysis({ analysis }) {
  if (!analysis) return null;
  const micros = analysis.micronutrients || {};

  return (
    <div className="insight-box text-macro-box">
      <strong>{analysis.name}</strong>
      <p className="scan-desc">{analysis.notes}</p>
      <div className="chip-row">
        <span className="chip">{Math.round(analysis.calories)} kcal</span>
        <span className="chip">{Math.round(analysis.protein_g)}g protein</span>
        <span className="chip">{Math.round(analysis.carbs_g)}g carbs</span>
        <span className="chip">{Math.round(analysis.fat_g)}g fat</span>
        <span className="chip">{Math.round(analysis.fiber_g)}g fibre</span>
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

export default function MealLogger({ meals, onRefresh, user }) {
  const [mode, setMode] = useState('type');
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [analysis, setAnalysis] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState({ stageIndex: 0, stageLabel: '', progress: 0 });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState('');
  const [lastHealthScore, setLastHealthScore] = useState(null);
  const [celebrate, setCelebrate] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const suggestRef = useRef(null);
  const analyzeRef = useRef(null);
  const analyzeAbortRef = useRef(null);
  const lastAnalyzedRef = useRef('');
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);
  const { signalSuccessFromElement } = useVitality();

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
      if (mode === 'type') {
        setAnalysis(null);
        lastAnalyzedRef.current = '';
      }
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

    if (mode === 'type' && description.trim().length >= 4) {
      analyzeRef.current = setTimeout(() => {
        runAnalysis(description);
      }, 1400);
    }

    return () => {
      if (suggestRef.current) clearTimeout(suggestRef.current);
      if (analyzeRef.current) clearTimeout(analyzeRef.current);
    };
  }, [description, mode]);

  const selectSuggestion = (name) => {
    setDescription(name);
    setShowSuggestions(false);
    runAnalysis(name);
  };

  const handleLogMeal = async (triggerEl) => {
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
            review_passes: analysis.review_passes,
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
      signalSuccessFromElement('meals', triggerEl);
      setDescription('');
      setAnalysis(null);
      setPreviewUrl(null);
      setSuggestions([]);
      onRefresh();
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const processImageFile = async (file) => {
    if (!file?.type?.startsWith('image/')) return;

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
    setMode('photo');
    setScanning(true);
    setLoading(true);
    setError('');
    setAnalysis(null);
    setScanProgress({ stageIndex: 0, stageLabel: 'Vision scan', progress: 0 });

    try {
      const result = await analyzeMealImageVision(file, user?.dietary_restrictions, {
        onProgress: setScanProgress,
      });
      setAnalysis(result);
      setDescription(result.description || result.name);
    } catch (err) {
      setError(err.message);
      setPreviewUrl(null);
    } finally {
      setScanning(false);
      setLoading(false);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processImageFile(file);
  };

  return (
    <div className="meal-logger">
      <div className="card card-lively meal-logger-card">
        <div className="meal-logger-header">
          <div>
            <h2>Log a Meal</h2>
            <p className="meal-logger-sub">
              Type a description or scan a photo — AI cross-checks vision and text in 10 review passes.
            </p>
          </div>
          <div className="meal-mode-tabs">
            <button
              type="button"
              className={`meal-mode-tab ${mode === 'type' ? 'active' : ''}`}
              onClick={() => setMode('type')}
            >
              Type
            </button>
            <button
              type="button"
              className={`meal-mode-tab ${mode === 'photo' ? 'active' : ''}`}
              onClick={() => setMode('photo')}
            >
              Photo scan
            </button>
          </div>
        </div>

        <div className="form-group">
          <label>Meal Type</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        {mode === 'type' ? (
          <>
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
              placeholder="e.g. tandoori chicken with naan"
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
            <TextMacroAnalysis analysis={analysis} />
          </>
        ) : (
          <div className="meal-photo-scan">
            <div
              className={`scan-upload-zone ${dragOver ? 'drag-over' : ''} ${previewUrl ? 'has-preview' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={scanning}
              />
              {previewUrl ? (
                <img src={previewUrl} alt="Meal preview" className="scan-upload-preview" />
              ) : (
                <>
                  <div className="scan-upload-icon">📷</div>
                  <p className="scan-upload-title">Drop meal photo here</p>
                  <p className="scan-upload-hint">or click to browse · JPG, PNG, WEBP</p>
                </>
              )}
            </div>

            <ImageAnalysisProgress
              active={scanning}
              stageIndex={scanProgress.stageIndex}
              stageLabel={scanProgress.stageLabel}
            />

            {!scanning && analysis?.review_passes && (
              <MealScanResults analysis={analysis} previewUrl={previewUrl} />
            )}
          </div>
        )}

        <div className="meal-logger-actions">
          <button
            className="btn btn-primary"
            onClick={(e) => handleLogMeal(e.currentTarget)}
            disabled={loading || scanning || !description.trim()}
          >
            {loading ? 'Saving...' : 'Log Meal'}
          </button>
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