import { useState } from 'react';
import { api } from '../api';

export default function Recipes({ data, loading, onRefresh, user }) {
  const [step, setStep] = useState(data ? 'results' : 'form');
  const [restrictions, setRestrictions] = useState(user?.dietary_restrictions || '');
  const [preferences, setPreferences] = useState('');
  const [goals, setGoals] = useState(user?.goal?.replace('_', ' ') || '');
  const [generating, setGenerating] = useState(false);
  const [recipeData, setRecipeData] = useState(data);
  const [error, setError] = useState('');

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.generateRecipes({
        dietary_restrictions: restrictions,
        preferences,
        goals,
        count: 4,
      });
      setRecipeData(res);
      setStep('results');
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  if (step === 'form' || (!recipeData && !loading)) {
    return (
      <div className="card">
        <h2>Recipe Planner</h2>
        <p style={{ color: 'var(--muted)' }}>
          Tell us your restrictions, preferences, and goals — AI creates recipe variants with timing & frequency.
        </p>

        <div className="form-group">
          <label>Dietary restrictions</label>
          <textarea
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="e.g. no dairy, gluten-free, halal"
          />
        </div>
        <div className="form-group">
          <label>Food preferences</label>
          <textarea
            value={preferences}
            onChange={(e) => setPreferences(e.target.value)}
            placeholder="e.g. spicy Indian food, high protein, quick meals under 30 min"
          />
        </div>
        <div className="form-group">
          <label>Your goals</label>
          <input
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
            placeholder="e.g. muscle gain, fat loss, maintenance"
          />
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={handleGenerate}
          disabled={generating}
        >
          {generating ? 'Creating recipes...' : 'Generate My Recipes'}
        </button>
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (loading || generating) return <div className="card">Generating recipes...</div>;

  const display = recipeData || data;
  if (!display) return null;

  return (
    <div>
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Your Recipe Plan</h2>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('form')}>
            Update preferences
          </button>
        </div>
        {display.ai_notes && <div className="insight-box">{display.ai_notes}</div>}
        {display.consumption_schedule?.length > 0 && (
          <div style={{ marginTop: '1rem' }}>
            <h4>Weekly schedule</h4>
            <ul>
              {display.consumption_schedule.map((item, i) => <li key={i}>{item}</li>)}
            </ul>
          </div>
        )}
      </div>

      {display.recipes.map((r, i) => (
        <div key={i} className="recipe-card">
          <h3>{r.name}</h3>
          <p style={{ color: 'var(--muted)' }}>{r.description}</p>
          <div className="chip-row">
            <span className="chip">{r.calories} kcal</span>
            <span className="chip">{r.protein_g}g protein</span>
            <span className="chip">{r.prep_time_min} min</span>
            {r.frequency && <span className="badge">{r.frequency}</span>}
            {r.timing && <span className="badge">{r.timing}</span>}
            {r.tags?.map((t) => <span key={t} className="badge">{t}</span>)}
          </div>
          {r.variants?.length > 0 && (
            <details style={{ marginTop: '0.5rem' }}>
              <summary style={{ cursor: 'pointer' }}>Recipe variants</summary>
              <ul>{r.variants.map((v, j) => <li key={j}>{v}</li>)}</ul>
            </details>
          )}
          <details style={{ marginTop: '0.75rem' }}>
            <summary style={{ cursor: 'pointer' }}>Ingredients & Steps</summary>
            <strong>Ingredients:</strong>
            <ul>{r.ingredients.map((ing, j) => <li key={j}>{ing}</li>)}</ul>
            <strong>Instructions:</strong>
            <ol>{r.instructions.map((s, j) => <li key={j}>{s}</li>)}</ol>
          </details>
        </div>
      ))}

      <div className="card">
        <h3>Grocery List</h3>
        <ul className="grocery-list">
          {display.grocery_list.map((item, i) => <li key={i}>{item}</li>)}
        </ul>
      </div>
    </div>
  );
}