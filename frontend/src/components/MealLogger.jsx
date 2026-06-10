import { useState } from 'react';
import { api } from '../api';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];

export default function MealLogger({ userId, meals, onRefresh }) {
  const [description, setDescription] = useState('');
  const [mealType, setMealType] = useState('lunch');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAnalyzeText = async () => {
    if (!description.trim()) return;
    setLoading(true);
    setError('');
    try {
      const result = await api.analyzeText(userId, description);
      setAnalysis(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
      await api.logMeal(userId, {
        name: data.name,
        description: data.description || description,
        meal_type: mealType,
        calories: data.calories,
        protein_g: data.protein_g,
        carbs_g: data.carbs_g,
        fat_g: data.fat_g,
        fiber_g: data.fiber_g,
      });
      setDescription('');
      setAnalysis(null);
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
      await api.analyzeAndLogImage(userId, file, mealType);
      onRefresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Log a Meal</h2>
        <div className="form-group">
          <label>Meal Type</label>
          <select value={mealType} onChange={(e) => setMealType(e.target.value)}>
            {MEAL_TYPES.map((t) => (
              <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Describe your meal (text)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. 2 tandoori chicken pieces with salad, no dairy"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleAnalyzeText} disabled={loading}>
            AI Analyze Text
          </button>
          <button className="btn btn-primary" onClick={handleLogMeal} disabled={loading}>
            Log Meal
          </button>
        </div>

        {analysis && (
          <div className="insight-box" style={{ marginTop: '1rem' }}>
            <strong>{analysis.name}</strong>
            <p style={{ margin: '0.5rem 0', color: 'var(--muted)' }}>{analysis.notes}</p>
            <div className="chip-row">
              <span className="chip">{Math.round(analysis.calories)} kcal</span>
              <span className="chip">{Math.round(analysis.protein_g)}g protein</span>
              <span className="chip">{Math.round(analysis.carbs_g)}g carbs</span>
              <span className="chip">{Math.round(analysis.fat_g)}g fat</span>
              <span className="badge">{analysis.confidence} confidence</span>
            </div>
          </div>
        )}

        <div style={{ marginTop: '1.5rem' }}>
          <label className="upload-zone">
            <input type="file" accept="image/*" onChange={handleImageUpload} disabled={loading} />
            <div style={{ fontSize: '2rem' }}>📷</div>
            <p>Upload meal photo for AI vision analysis</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
              Groq vision model estimates calories & macros
            </p>
          </label>
        </div>

        {error && <p className="error">{error}</p>}
      </div>

      <div className="card">
        <h3>Today's Meals ({meals.length})</h3>
        <ul className="meal-list">
          {meals.map((m) => (
            <li key={m.id}>
              <div>
                <strong>{m.name}</strong>
                <span className="badge" style={{ marginLeft: '0.5rem' }}>{m.meal_type}</span>
                {m.image_path && <span className="badge" style={{ marginLeft: '0.3rem' }}>📷 AI</span>}
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.85rem' }}>
                <div>{Math.round(m.calories)} kcal</div>
                <div style={{ color: 'var(--muted)' }}>{Math.round(m.protein_g)}g protein</div>
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