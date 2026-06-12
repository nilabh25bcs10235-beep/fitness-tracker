import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import DailyTracker from './DailyTracker';

function MacroProgress({ label, current, target, unit }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
        <span>{label}</span>
        <span>{Math.round(current)} / {target} {unit}</span>
      </div>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard({ data, tracker, onLogWeight, onSelectDay }) {
  const [selectedDay, setSelectedDay] = useState(null);

  if (!data) return <div className="card">Loading dashboard...</div>;

  const { today, weekly_calories, weekly_protein, weight_trend, body_composition } = data;
  const viewDay = selectedDay || tracker?.today;

  const handleSelectDay = (day) => {
    setSelectedDay(day);
    onSelectDay?.(day);
  };

  return (
    <div>
      <DailyTracker
        tracker={tracker}
        selectedDay={viewDay}
        onSelectDay={handleSelectDay}
      />

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card">
          <div className="value">{Math.round(viewDay?.calories_consumed ?? today.total_calories)}</div>
          <div className="label">Calories {viewDay?.is_today ? 'Today' : 'Logged'}</div>
        </div>
        <div className="stat-card">
          <div className="value">{Math.round(viewDay?.protein_consumed ?? today.total_protein)}g</div>
          <div className="label">Protein</div>
        </div>
        <div className="stat-card">
          <div className="value">{body_composition.current_weight_kg} kg</div>
          <div className="label">Current Weight</div>
        </div>
        <div className="stat-card">
          <div className="value">{body_composition.bmi}</div>
          <div className="label">BMI</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>{viewDay?.is_today ? "Today's Macros" : `${viewDay?.day_name} Macros`}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <MacroProgress
              label="Calories"
              current={viewDay?.calories_consumed ?? today.total_calories}
              target={(viewDay?.calorie_target ?? today.calorie_target) || 0}
              unit="kcal"
            />
            <MacroProgress
              label="Protein"
              current={viewDay?.protein_consumed ?? today.total_protein}
              target={(viewDay?.protein_target ?? today.protein_target) || 0}
              unit="g"
            />
            {(viewDay?.calorie_target ?? today.carbs_target) > 0 && (
              <MacroProgress
                label="Carbs"
                current={today.total_carbs}
                target={today.carbs_target}
                unit="g"
              />
            )}
            {(viewDay?.calorie_target ?? today.fat_target) > 0 && (
              <MacroProgress
                label="Fat"
                current={today.total_fat}
                target={today.fat_target}
                unit="g"
              />
            )}
          </div>
        </div>

        <div className="card">
          <h3>Body Composition {body_composition.source === 'groq' ? '(AI Est.)' : ''}</h3>
          <div className="grid-2">
            <div className="stat-card">
              <div className="value">{body_composition.body_fat_pct ?? '—'}%</div>
              <div className="label">Body Fat</div>
            </div>
            <div className="stat-card">
              <div className="value">{body_composition.muscle_mass_kg ?? '—'} kg</div>
              <div className="label">Muscle Mass</div>
            </div>
          </div>
          {body_composition.notes && (
            <p style={{ fontSize: '0.8rem', color: 'var(--muted)', marginTop: '0.5rem' }}>
              {body_composition.notes}
            </p>
          )}
          <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={onLogWeight}>
            Log Weight
          </button>
        </div>
      </div>

      <div className="grid-2" style={{ marginTop: '1rem' }}>
        <div className="card">
          <h3>Weekly Calories</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={weekly_calories}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1a2332', border: 'none' }} />
              <Bar dataKey="calories" fill="#22c55e" radius={[6, 6, 0, 0]} />
              <Bar dataKey="target" fill="#3b82f6" opacity={0.4} radius={[6, 6, 0, 0]} />
              <Legend />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h3>Weekly Protein</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={weekly_protein}>
              <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
              <XAxis dataKey="day" stroke="#94a3b8" />
              <YAxis stroke="#94a3b8" />
              <Tooltip contentStyle={{ background: '#1a2332', border: 'none' }} />
              <Line type="monotone" dataKey="protein" stroke="#22c55e" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="target" stroke="#3b82f6" strokeDasharray="5 5" dot={false} />
              <Legend />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h3>Weight Trend</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weight_trend}>
            <CartesianGrid strokeDasharray="3 3" stroke="#243044" />
            <XAxis dataKey="date" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" domain={['auto', 'auto']} />
            <Tooltip contentStyle={{ background: '#1a2332', border: 'none' }} />
            <Line type="monotone" dataKey="weight" stroke="#f59e0b" strokeWidth={2} dot={{ r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}