import { useState, useEffect } from 'react';
import { api } from '../api';
import ReactiveField from './reactive/ReactiveField';
import CelebrateBurst from './reactive/CelebrateBurst';
import YouTubeThumbnail from './YouTubeThumbnail';
import YouTubeVideoModal from './YouTubeVideoModal';
import { useVitality } from '../context/VitalityContext';

function EditableMealRow({ entry, onChange, onRemove }) {
  return (
    <div className="plan-meal-row box-glow box-recipes">
      <div className="plan-meal-header">
        <span className="badge badge-meal">{entry.meal_type}</span>
        <button type="button" className="btn-icon" onClick={() => onRemove(entry.id)}>✕</button>
      </div>
      <ReactiveField
        theme="recipe"
        className="plan-input-shell"
        wrapClassName="plan-input-shell"
        value={entry.name}
        onChange={(e) => onChange(entry.id, 'name', e.target.value)}
        placeholder="Meal name"
      />
      <ReactiveField
        theme="recipe"
        as="textarea"
        className="plan-input-shell"
        wrapClassName="plan-input-shell"
        value={entry.description}
        onChange={(e) => onChange(entry.id, 'description', e.target.value)}
        placeholder="Description"
        rows={2}
      />
      <div className="grid-2">
        <ReactiveField
          theme="recipe"
          className="plan-input-shell"
          wrapClassName="plan-input-shell"
          type="number"
          value={entry.calories}
          onChange={(e) => onChange(entry.id, 'calories', Number(e.target.value))}
          placeholder="Calories"
        />
        <ReactiveField
          theme="recipe"
          className="plan-input-shell"
          wrapClassName="plan-input-shell"
          type="number"
          value={entry.protein_g}
          onChange={(e) => onChange(entry.id, 'protein_g', Number(e.target.value))}
          placeholder="Protein (g)"
        />
      </div>
      <ReactiveField
        theme="recipe"
        className="plan-input-shell"
        wrapClassName="plan-input-shell"
        value={entry.notes}
        onChange={(e) => onChange(entry.id, 'notes', e.target.value)}
        placeholder="Notes"
      />
    </div>
  );
}

export default function Recipes({ data, loading, onRefresh, user }) {
  const [step, setStep] = useState('form');
  const [restrictions, setRestrictions] = useState(user?.dietary_restrictions || '');
  const [preferences, setPreferences] = useState('');
  const [goals, setGoals] = useState(user?.goal?.replace('_', ' ') || '');
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateMsg, setCelebrateMsg] = useState('');
  const [videoModal, setVideoModal] = useState(null);
  const { signalSuccessFromElement } = useVitality();

  useEffect(() => {
    if (data?.has_plan) {
      setPlan(data);
      setStep('results');
    }
  }, [data]);

  const handleGenerate = async (triggerEl) => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.generateRecipes({
        dietary_restrictions: restrictions,
        preferences,
        goals,
        count: 4,
      });
      setPlan(res);
      setStep('results');
      setCelebrateMsg('Your meal plan is ready!');
      setCelebrate(true);
      signalSuccessFromElement('recipe', triggerEl);
      onRefresh?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setGenerating(false);
    }
  };

  const patchToday = async (nextToday, triggerEl) => {
    setSaving('today');
    try {
      const res = await api.updateTodayPlan(nextToday);
      setPlan(res);
      setCelebrateMsg("Today's plan saved!");
      setCelebrate(true);
      signalSuccessFromElement('recipe', triggerEl);
    } finally {
      setSaving('');
    }
  };

  const patchGrocery = async (nextGrocery, triggerEl) => {
    setSaving('grocery');
    try {
      const res = await api.updateGrocery(nextGrocery);
      setPlan(res);
      setCelebrateMsg('Grocery list saved!');
      setCelebrate(true);
      signalSuccessFromElement('recipe', triggerEl);
    } finally {
      setSaving('');
    }
  };

  const patchWeekly = async (nextWeekly, triggerEl) => {
    setSaving('weekly');
    try {
      const res = await api.updateWeeklySchedule(nextWeekly);
      setPlan(res);
      setCelebrateMsg('Weekly schedule saved!');
      setCelebrate(true);
      signalSuccessFromElement('recipe', triggerEl);
    } finally {
      setSaving('');
    }
  };

  const updateTodayField = (id, field, value) => {
    const next = (plan.today_plan || []).map((e) =>
      e.id === id ? { ...e, [field]: value } : e
    );
    setPlan({ ...plan, today_plan: next });
  };

  const saveToday = (el) => patchToday(plan.today_plan, el);

  const updateGroceryItem = (id, field, value) => {
    const next = (plan.grocery_list || []).map((g) =>
      g.id === id ? { ...g, [field]: value } : g
    );
    setPlan({ ...plan, grocery_list: next });
  };

  const saveGrocery = (el) => patchGrocery(plan.grocery_list, el);

  const addGroceryItem = () => {
    const next = [
      ...(plan.grocery_list || []),
      { id: crypto.randomUUID(), text: '', checked: false },
    ];
    setPlan({ ...plan, grocery_list: next });
  };

  const updateWeeklyField = (id, field, value) => {
    const next = (plan.weekly_schedule || []).map((e) =>
      e.id === id ? { ...e, [field]: value } : e
    );
    setPlan({ ...plan, weekly_schedule: next });
  };

  const saveWeekly = (el) => patchWeekly(plan.weekly_schedule, el);

  if (step === 'form' && !plan?.has_plan) {
    return (
      <div className="card glass-card box-glow box-recipes card-lively">
        <h2>Recipe Planner</h2>
        <p className="muted-note">AI builds your weekly schedule and saves it to your account.</p>
        <ReactiveField
          theme="recipe"
          as="textarea"
          label="Dietary restrictions"
          value={restrictions}
          onChange={(e) => setRestrictions(e.target.value)}
        />
        <ReactiveField
          theme="recipe"
          as="textarea"
          label="Food preferences"
          value={preferences}
          onChange={(e) => setPreferences(e.target.value)}
        />
        <ReactiveField
          theme="recipe"
          label="Your goals"
          value={goals}
          onChange={(e) => setGoals(e.target.value)}
        />
        <button type="button" className="btn btn-glow" onClick={(e) => handleGenerate(e.currentTarget)} disabled={generating}>
          {generating ? 'Creating plan...' : 'Generate My Plan'}
        </button>
        <CelebrateBurst
          active={celebrate}
          theme="recipe"
          message={celebrateMsg}
          onDone={() => { setCelebrate(false); setCelebrateMsg(''); }}
        />
        {error && <p className="error">{error}</p>}
      </div>
    );
  }

  if (loading || generating) return <div className="card glass-card box-recipes">Generating plan...</div>;
  if (!plan) return null;

  return (
    <div className="recipes-panel">
      <CelebrateBurst
        active={celebrate}
        theme="recipe"
        message={celebrateMsg}
        onDone={() => { setCelebrate(false); setCelebrateMsg(''); }}
      />
      <div className="card glass-card box-glow box-recipes card-lively">
        <div className="panel-header-row">
          <h2>Today&apos;s Diet Plan — {plan.today_name}</h2>
          <button type="button" className="btn btn-secondary" onClick={() => setStep('form')}>
            Regenerate
          </button>
        </div>
        {plan.ai_notes && <div className="insight-box insight-recipes">{plan.ai_notes}</div>}
        <div className="plan-meals-stack">
          {(plan.today_plan || []).length === 0 && (
            <p className="muted-note">No meals scheduled for today. Edit the weekly schedule below.</p>
          )}
          {(plan.today_plan || []).map((entry) => (
            <EditableMealRow
              key={entry.id}
              entry={entry}
              onChange={updateTodayField}
              onRemove={(id) => {
                const next = plan.today_plan.filter((e) => e.id !== id);
                setPlan({ ...plan, today_plan: next });
              }}
            />
          ))}
        </div>
        <button type="button" className="btn btn-glow" onClick={(e) => saveToday(e.currentTarget)} disabled={saving === 'today'}>
          {saving === 'today' ? 'Saving...' : 'Save Today\'s Plan'}
        </button>
      </div>

      <div className="card glass-card box-glow box-grocery">
        <h3>Grocery List</h3>
        <ul className="grocery-edit-list">
          {(plan.grocery_list || []).map((item) => (
            <li key={item.id} className="grocery-edit-row">
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) => updateGroceryItem(item.id, 'checked', e.target.checked)}
              />
              <ReactiveField
                theme="recipe"
                className="plan-input-shell"
                wrapClassName="plan-input-shell"
                value={item.text}
                onChange={(e) => updateGroceryItem(item.id, 'text', e.target.value)}
              />
            </li>
          ))}
        </ul>
        <div className="chip-row">
          <button type="button" className="btn btn-secondary" onClick={addGroceryItem}>+ Add item</button>
          <button type="button" className="btn btn-glow" onClick={(e) => saveGrocery(e.currentTarget)} disabled={saving === 'grocery'}>
            {saving === 'grocery' ? 'Saving...' : 'Save Grocery List'}
          </button>
        </div>
      </div>

      <div className="card glass-card box-glow box-weekly">
        <h3>Weekly Schedule (Mon–Sun)</h3>
        <p className="muted-note">Stored in your database — edit any day&apos;s meals.</p>
        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map((day) => {
          const dayMeals = (plan.weekly_schedule || []).filter((e) => e.day === day);
          if (!dayMeals.length) return null;
          return (
            <div key={day} className="weekly-day-block">
              <h4>{day}</h4>
              {dayMeals.map((entry) => (
                <EditableMealRow
                  key={entry.id}
                  entry={entry}
                  onChange={updateWeeklyField}
                  onRemove={(id) => {
                    const next = plan.weekly_schedule.filter((e) => e.id !== id);
                    setPlan({ ...plan, weekly_schedule: next });
                  }}
                />
              ))}
            </div>
          );
        })}
        <button type="button" className="btn btn-glow" onClick={(e) => saveWeekly(e.currentTarget)} disabled={saving === 'weekly'}>
          {saving === 'weekly' ? 'Saving...' : 'Save Weekly Schedule'}
        </button>
      </div>

      {(plan.recipes || []).map((r, i) => (
        <div key={i} className="recipe-card box-glow box-recipes recipe-card-with-video">
          <div className="recipe-card-main">
            <h3>{r.name}</h3>
            <p className="muted-note">{r.description}</p>
            <div className="chip-row">
              <span className="chip chip-fun">{r.calories} kcal</span>
              <span className="chip chip-fun">{r.protein_g}g protein</span>
              {r.frequency && <span className="badge">{r.frequency}</span>}
            </div>
            <details>
              <summary>Ingredients & Steps</summary>
              <ul>{r.ingredients?.map((ing, j) => <li key={j}>{ing}</li>)}</ul>
              <ol>{r.instructions?.map((s, j) => <li key={j}>{s}</li>)}</ol>
            </details>
          </div>
          {r.youtube_video_id && (
            <YouTubeThumbnail
              videoId={r.youtube_video_id}
              title={r.name}
              className="youtube-thumb-recipe"
              onClick={(id, title) => setVideoModal({ id, title })}
            />
          )}
        </div>
      ))}

      {videoModal && (
        <YouTubeVideoModal
          videoId={videoModal.id}
          title={videoModal.title}
          onClose={() => setVideoModal(null)}
        />
      )}
    </div>
  );
}