import { useState } from 'react';
import { api } from '../api';
import ReactiveField from './reactive/ReactiveField';
import CelebrateBurst from './reactive/CelebrateBurst';
import YouTubeThumbnail from './YouTubeThumbnail';
import YouTubeVideoModal from './YouTubeVideoModal';
import WorkoutMusic from './WorkoutMusic';
import { useVitality } from '../context/VitalityContext';

const BODY_PARTS = [
  'back', 'chest', 'shoulders', 'biceps', 'triceps',
  'legs', 'glutes', 'core', 'full body', 'cardio',
];

export default function Workouts({ onRefresh }) {
  const [bodyPart, setBodyPart] = useState('back');
  const [customPart, setCustomPart] = useState('');
  const [plan, setPlan] = useState(null);
  const [activity, setActivity] = useState('');
  const [duration, setDuration] = useState(30);
  const [intensity, setIntensity] = useState('moderate');
  const [burnResult, setBurnResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedMsg, setSavedMsg] = useState('');
  const [celebrate, setCelebrate] = useState(false);
  const [celebrateTheme, setCelebrateTheme] = useState('fire');
  const [videoModal, setVideoModal] = useState(null);
  const { signalSuccessFromElement } = useVitality();

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
      <div className="card card-lively">
        <h2>Calorie Burn Tracker</h2>
        <p style={{ color: 'var(--muted)' }}>
          Log an activity and get an AI estimate of calories burned.
        </p>
        <form onSubmit={estimateBurn}>
          <div className="grid-2">
            <ReactiveField
              theme="fire"
              label="Activity"
              value={activity}
              onChange={(e) => setActivity(e.target.value)}
              placeholder="e.g. running, cycling, swimming"
            />
            <ReactiveField
              theme="fire"
              label="Duration (minutes)"
              type="number"
              min={5}
              max={300}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
            />
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
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem' }}
              disabled={loading}
              onClick={async (e) => {
                setLoading(true);
                try {
                  await api.logWorkout({
                    activity: burnResult.activity,
                    duration_min: burnResult.duration_min,
                    calories_burned: burnResult.calories_burned,
                    intensity,
                  });
                  setSavedMsg('Workout saved to today\'s tracker!');
                  setCelebrateTheme('fire');
                  setCelebrate(true);
                  signalSuccessFromElement('workouts', e.currentTarget);
                  onRefresh?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Save to Daily Tracker
            </button>
          </div>
        )}
      </div>

      <div className="card card-lively">
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

        <ReactiveField
          theme="workout"
          label="Or type a target (e.g. lats, hamstrings)"
          value={customPart}
          onChange={(e) => setCustomPart(e.target.value)}
          placeholder="custom body part"
        />

        <button type="button" className="btn btn-primary" onClick={loadExercises} disabled={loading}>
          {loading ? 'Building plan...' : 'Get Exercises'}
        </button>

        {plan && (
          <div style={{ marginTop: '1.5rem' }}>
            <h3>Training: {plan.body_part}</h3>
            {plan.exercises.map((ex, i) => (
              <div key={i} className="exercise-card exercise-card-with-video">
                <div className="exercise-card-main">
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
                {ex.youtube_video_id && (
                  <YouTubeThumbnail
                    videoId={ex.youtube_video_id}
                    title={ex.youtube_video_title || ex.name}
                    thumbnailUrl={ex.youtube_thumbnail_url}
                    onClick={(id, title) => setVideoModal({ id, title })}
                  />
                )}
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
            <button
              type="button"
              className="btn btn-secondary"
              style={{ marginTop: '0.75rem' }}
              disabled={loading}
              onClick={async (e) => {
                setLoading(true);
                try {
                  const totalCal = plan.exercises.reduce((s, ex) => s + (ex.calories_burned_est || 0), 0);
                  const totalMin = plan.exercises.length * 8;
                  await api.logWorkout({
                    activity: `${plan.body_part} training`,
                    body_part: plan.body_part,
                    duration_min: totalMin,
                    calories_burned: totalCal,
                    intensity: 'moderate',
                    notes: plan.exercises.map((e) => e.name).join(', '),
                  });
                  setSavedMsg(`${plan.body_part} workout saved to today's tracker!`);
                  setCelebrateTheme('workout');
                  setCelebrate(true);
                  signalSuccessFromElement('workouts', e.currentTarget);
                  onRefresh?.();
                } catch (e) {
                  setError(e.message);
                } finally {
                  setLoading(false);
                }
              }}
            >
              Log This Workout
            </button>
          </div>
        )}
      </div>

      <WorkoutMusic />

      {error && <p className="error">{error}</p>}

      <CelebrateBurst
        active={celebrate}
        theme={celebrateTheme}
        message={savedMsg}
        onDone={() => { setCelebrate(false); setSavedMsg(''); }}
      />

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