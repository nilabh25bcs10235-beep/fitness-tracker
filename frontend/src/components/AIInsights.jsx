import { useState } from 'react';
import { api } from '../api';

const QUICK_PROMPTS = [
  'Suggest high-protein breakfast under 500 cal',
  'What should I eat for dinner to hit my protein goal?',
  'Give me a quick dairy-free snack idea',
  'How am I doing on calories today?',
];

export default function AIInsights({ userId }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const ask = async (q) => {
    const text = q || query;
    if (!text.trim()) return;
    setLoading(true);
    try {
      const res = await api.getInsight(userId, text);
      setResult(res);
      if (!q) setQuery(text);
    } catch (e) {
      setResult({ answer: e.message, suggestions: [], is_ai: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>AI Coach</h2>
      <p style={{ color: 'var(--muted)' }}>
        Ask anything about your nutrition — powered by Groq LLM.
      </p>

      <div className="chip-row" style={{ marginBottom: '1rem' }}>
        {QUICK_PROMPTS.map((p) => (
          <button key={p} className="chip" style={{ cursor: 'pointer' }} onClick={() => ask(p)}>
            {p}
          </button>
        ))}
      </div>

      <div className="form-group">
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. suggest high-protein breakfast under 500 cal"
        />
      </div>
      <button className="btn btn-primary" onClick={() => ask()} disabled={loading}>
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
  );
}