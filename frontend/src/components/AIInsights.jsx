import { useState } from 'react';
import { api } from '../api';

const QUICK_PROMPTS = [
  'What should I eat for dinner to hit my protein goal?',
  'Give me a quick dairy-free snack idea',
  'How am I doing on calories today?',
  'Suggest a pre-workout meal',
];

export default function AIInsights() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [bodyResult, setBodyResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bodyLoading, setBodyLoading] = useState(false);

  const ask = async (q) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.getInsight(text);
      setResult(res);
      if (!q) setQuery(text);
    } catch (e) {
      setResult({ answer: e.message, suggestions: [], is_ai: false });
    } finally {
      setLoading(false);
    }
  };

  const handleBodyUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBodyLoading(true);
    try {
      const res = await api.analyzeBodyImage(file);
      setBodyResult(res);
    } catch (err) {
      setBodyResult({ nutritional_advice: err.message, goal_recommendations: [] });
    } finally {
      setBodyLoading(false);
    }
  };

  return (
    <div>
      <div className="card ai-greeting-card">
        <h2>AI Coach</h2>
        <p className="ai-greeting">HI HOW CAN I HELP YOU TODAY?</p>
        <p style={{ color: 'var(--muted)' }}>
          Ask anything about nutrition, training, or upload a full-body photo for BMI & goal advice.
        </p>
      </div>

      <div className="card">
        <div className="chip-row" style={{ marginBottom: '1rem' }}>
          {QUICK_PROMPTS.map((p) => (
            <button key={p} type="button" className="chip" style={{ cursor: 'pointer' }} onClick={() => ask(p)}>
              {p}
            </button>
          ))}
        </div>

        <div className="form-group">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask your AI coach anything..."
          />
        </div>
        <button type="button" className="btn btn-primary" onClick={() => ask()} disabled={loading}>
          {loading ? 'Thinking...' : 'Ask AI'}
        </button>

        {result && (
          <div className="insight-box">
            <p>{result.answer}</p>
            {result.suggestions?.length > 0 && (
              <ul>
                {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
              </ul>
            )}
            <span className="ai-status on">✓ Groq AI</span>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Body Scan — BMI & Nutrition Advice</h3>
        <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
          Upload a full-body photo. AI estimates BMI, body composition, and gives goal-specific nutrition advice.
        </p>
        <label className="upload-zone">
          <input type="file" accept="image/*" onChange={handleBodyUpload} disabled={bodyLoading} />
          <div style={{ fontSize: '2rem' }}>🧍</div>
          <p>{bodyLoading ? 'Analyzing...' : 'Upload full-body image'}</p>
          <p style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>AI estimate only — not a medical measurement</p>
        </label>

        {bodyResult && (
          <div className="insight-box" style={{ marginTop: '1rem' }}>
            <div className="grid-4" style={{ marginBottom: '1rem' }}>
              <div className="stat-card">
                <div className="value">{bodyResult.estimated_bmi ?? '—'}</div>
                <div className="label">Est. BMI</div>
              </div>
              <div className="stat-card">
                <div className="value">{bodyResult.body_fat_pct ?? '—'}%</div>
                <div className="label">Body Fat</div>
              </div>
              <div className="stat-card">
                <div className="value">{bodyResult.muscle_mass_kg ?? '—'} kg</div>
                <div className="label">Muscle Mass</div>
              </div>
              <div className="stat-card">
                <div className="value">{bodyResult.confidence}</div>
                <div className="label">Confidence</div>
              </div>
            </div>
            {bodyResult.physique_notes && (
              <p style={{ color: 'var(--muted)' }}>{bodyResult.physique_notes}</p>
            )}
            <p><strong>Nutrition advice:</strong> {bodyResult.nutritional_advice}</p>
            {bodyResult.goal_recommendations?.length > 0 && (
              <ul>
                {bodyResult.goal_recommendations.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}