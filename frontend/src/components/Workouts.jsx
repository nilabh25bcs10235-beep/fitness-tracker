import { useState } from 'react';
import { api } from '../api';

const BODY_PARTS = [
  'back', 'chest', 'shoulders', 'biceps', 'triceps',
  'legs', 'glutes', 'core', 'full body', 'cardio',
];

export default function Workouts() {
  const [bodyPart, setBodyPart] = useState('back');
  const [customPart, setCustomPart] = useState('');
  const [plan, setPlan] = useState(null);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderate');
  const [burnResult, setBurnResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const loadExercises = async () => {
    const target = customPart.trim() || bodyPart;
    if (!target) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.getExercises(target);
      setPlan(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const estimateBurn = async (e) => {
    e.preventDefault();
    if (!activity.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.estimateCalorieBurn({
        activity: activity.trim(),
        duration_min: duration,
        intensity,
      });
      setBurnResult(res);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="card">
        <h2>Calorie Burn Tracker</h2>
        <p style={{ color: 'var(--muted)' }}>
          Log an activity and get an AI estimate of calories burned.
        </p>
        <form onSubmit={estimateBurn}>
          <div className="grid-2">
            <div className="form-group">
              <label>Activity</label>
              <input
                value={activity}
                onChange={(e) => setActivity(e.target.value)}
                placeholder="e.g. running, cycling, swimming"
              />
            </div>
            <div className="form-group">
              <label>Duration (minutes)</label>
              <input
                type="number"
                min={5}
                max={300}
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="form-group">
            <label>Intensity</label>
            <select value={intensity} onChange={(e) => setIntensity(e.target.value)}>
              <option value="light">Light</option>
              <option value="moderate">Moderate</option>
              <option value="vigorous">Vigorous</option>
            </select>
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Calculating...' : 'Estimate Burn'}
          </button>
        </form>

        {burnResult && (
          <div className="insight-box" style={{ marginTop: '1rem' }}>
            <div className="stat-card" style={{ marginBottom: '0.75rem' }}>
              <div className="value">{burnResult.calories_burned}</div>
              <div className="label">kcal burned — {burnResult.activity} ({burnResult.duration_min} min)</div>
            </div>
            <p style={{ color: 'var(--muted)' }}>{burnResult.notes}</p>
            {burnResult.related_exercises?.length > 0 && (
              <div className="chip-row">
                {burnResult.related_exercises.map((ex) => (
                  <span key={ex} className="chip">{ex}</span>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card">
        <h2>Exercise Planner</h2>
        <p style={{ color: 'var(--muted)' }}>
          Pick a body part — get machine, free-weight, and cardio exercises with sets & reps.
        </p>

        <div className="chip-row" style={{ marginBottom: '1rem' }}>
          {BODY_PARTS.map((part) => (
            <button
              key={part}
              type="button"
              className={`chip ${bodyPart === part && !customPart ? 'chip-active' : ''}`}
              onClick={() => { setBodyPart(part); setCustomPart(''); }}
            >
              {part}
            </button>
          ))}
        </div>

        <div className="form-group">
          <label>Or type a target (e.g. lats, hamstrings)</label>
          <input
            value={customPart}
            onChange={(e) => setCustomPart(e.target.value)}
            placeholder="custom body part"
          />
        </div>

        <button type="button" className="btn btn-primary" onClick={loadExercises} disabled={loading}>
          {loading ? 'Building plan...' : 'Get Exercises'}
        </button>

        {plan && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Training: {plan.body_part}</h3>
            {plan.exercises.map((ex, i) => (
              <div key={i} className="exercise-card">
                <div className="exercise-header">
                  <strong>{ex.name}</strong>
                  <span className="badge">{ex.equipment}</span>
                  <span className="badge">{ex.type}</span>
                </div>
                <p style={{ color: 'var(--muted)', fontSize: '0.85rem', margin: '0.35rem 0' }}>
                  {ex.body_part} · {ex.sets} sets × {ex.reps} · ~{ex.calories_burned_est} kcal
                </p>
                <p style={{ fontSize: '0.85rem' }}>{ex.notes}</p>
              </div>
            ))}
            {plan.cardio_options?.length > 0 && (
              <>
                <h4>Cardio options</h4>
                <div className="chip-row">
                  {plan.cardio_options.map((c) => <span key={c} className="chip">{c}</span>)}
                </div>
              </>
            )}
            {plan.tips?.length > 0 && (
              <ul style={{ marginTop: '0.75rem', color: 'var(--muted)' }}>
                {plan.tips.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && <p className="error">{error}</p>}
    </div>
  );
}