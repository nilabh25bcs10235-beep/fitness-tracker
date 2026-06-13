import { useState } from 'react';
import { api } from '../api';
import WaterGlass from './WaterGlass';

export default function HydrationPlan({ data, onUpdate }) {
  const [logging, setLogging] = useState(false);
  const [splashing, setSplashing] = useState(false);

  if (!data) return null;

  const logGlass = async () => {
    setLogging(true);
    setSplashing(true);
    try {
      const next = await api.logWater({ amount_ml: data.glass_size_ml });
      onUpdate?.(next);
    } finally {
      setLogging(false);
      setTimeout(() => setSplashing(false), 900);
    }
  };

  return (
    <div className="card glass-card box-glow box-hydration hydration-plan">
      <div className="hydration-header">
        <div>
          <h3>Hydration Plan</h3>
          <p className="muted-note">{data.next_reminder}</p>
        </div>
        <WaterGlass progress={data.progress_pct} splashing={splashing} size="lg" />
      </div>

      <div className="hydration-stats grid-4">
        <div className="stat-card glass-stat">
          <div className="value">{Math.round(data.consumed_ml)}</div>
          <div className="label">ml today</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{data.glasses_logged}/{data.glasses_target}</div>
          <div className="label">glasses</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{data.target_ml}</div>
          <div className="label">daily target</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{Math.round(data.progress_pct)}%</div>
          <div className="label">hydrated</div>
        </div>
      </div>

      <div className="hydration-progress">
        <div className="progress-bar hydration-bar">
          <div className="fill hydration-fill" style={{ width: `${data.progress_pct}%` }} />
        </div>
      </div>

      <button
        type="button"
        className="btn btn-glow hydration-log-btn"
        onClick={logGlass}
        disabled={logging}
      >
        <span className="hydration-btn-icon">🥤</span>
        {logging ? 'Pouring...' : `+1 Glass (${data.glass_size_ml}ml)`}
      </button>

      <div className="hydration-schedule">
        <h4>Today&apos;s sip schedule</h4>
        <div className="hydration-slots">
          {data.schedule.map((slot) => (
            <div
              key={slot.slot}
              className={`hydration-slot ${slot.completed ? 'done' : ''}`}
            >
              <WaterGlass progress={slot.completed ? 100 : 18} size="sm" />
              <span className="hydration-slot-time">{slot.time}</span>
              <span className="hydration-slot-ml">{slot.amount_ml}ml</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}