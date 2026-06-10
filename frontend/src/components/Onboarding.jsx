import { useState } from 'react';

const GOALS = [
  { value: 'lose_weight', label: 'Lose Weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain_muscle', label: 'Gain Muscle' },
];

const RESTRICTION_PRESETS = [
  'dairy-free',
  'gluten-free',
  'no-pork',
  'low-carb',
  'non-veg Indian',
];

export default function Onboarding({ onComplete, loading }) {
  const [form, setForm] = useState({
    name: '',
    age: 28,
    weight_kg: 70,
    height_cm: 170,
    gender: 'male',
    goal: 'lose_weight',
    dietary_restrictions: 'dairy-free, non-veg Indian',
  });

  const toggleRestriction = (r) => {
    const parts = form.dietary_restrictions.split(',').map((s) => s.trim()).filter(Boolean);
    const idx = parts.indexOf(r);
    if (idx >= 0) parts.splice(idx, 1);
    else parts.push(r);
    setForm({ ...form, dietary_restrictions: parts.join(', ') });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onComplete(form);
  };

  return (
    <div className="card">
      <h2>Welcome to FitTrack AI</h2>
      <p style={{ color: 'var(--muted)' }}>
        Tell us about yourself so we can personalize your nutrition plan.
      </p>
      <form onSubmit={handleSubmit}>
        <div className="grid-2">
          <div className="form-group">
            <label>Name</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Your name"
            />
          </div>
          <div className="form-group">
            <label>Age</label>
            <input
              type="number"
              required
              min={10}
              max={120}
              value={form.age}
              onChange={(e) => setForm({ ...form, age: +e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Weight (kg)</label>
            <input
              type="number"
              required
              step="0.1"
              value={form.weight_kg}
              onChange={(e) => setForm({ ...form, weight_kg: +e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Height (cm)</label>
            <input
              type="number"
              value={form.height_cm}
              onChange={(e) => setForm({ ...form, height_cm: +e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Gender</label>
            <select
              value={form.gender}
              onChange={(e) => setForm({ ...form, gender: e.target.value })}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="form-group">
            <label>Goal</label>
            <select
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
            >
              {GOALS.map((g) => (
                <option key={g.value} value={g.value}>{g.label}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="form-group">
          <label>Dietary Restrictions</label>
          <div className="chip-row">
            {RESTRICTION_PRESETS.map((r) => (
              <button
                key={r}
                type="button"
                className="chip"
                style={{
                  border: form.dietary_restrictions.includes(r)
                    ? '1px solid var(--accent)'
                    : '1px solid var(--surface-2)',
                  color: form.dietary_restrictions.includes(r) ? 'var(--accent)' : undefined,
                }}
                onClick={() => toggleRestriction(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <textarea
            value={form.dietary_restrictions}
            onChange={(e) => setForm({ ...form, dietary_restrictions: e.target.value })}
            style={{ marginTop: '0.5rem' }}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Setting up...' : 'Start Tracking'}
        </button>
      </form>
    </div>
  );
}