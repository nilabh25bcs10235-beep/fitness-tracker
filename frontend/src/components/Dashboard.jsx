import { useState } from 'react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, Legend,
} from 'recharts';
import DailyTracker from './DailyTracker';
import HydrationPlan from './HydrationPlan';
import ChartTooltip from './ChartTooltip';

const CHART_AXIS = { stroke: 'rgba(148,163,184,0.35)', fontSize: 11, tickLine: false, axisLine: false };
const CHART_GRID = { stroke: 'rgba(148,163,184,0.08)', strokeDasharray: '4 8' };

function MacroProgress({ label, current, target, unit }) {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div>
      <div className="macro-row">
        <span>{label}</span>
        <span>{Math.round(current)} / {target} {unit}</span>
      </div>
      <div className="progress-bar">
        <div className="fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function Dashboard({ data, tracker, hydration, onLogWeight, onHydrationUpdate }) {
  const [selectedDay, setSelectedDay] = useState(null);

  if (!data) return <div className="card glass-card">Loading dashboard...</div>;

  const { today, weekly_calories, weekly_protein, weight_trend, body_composition } = data;
  const viewDay = selectedDay || tracker?.today;

  return (
    <div>
      <DailyTracker
        tracker={tracker}
        selectedDay={viewDay}
        onSelectDay={setSelectedDay}
      />

      {hydration && (
        <HydrationPlan data={hydration} onUpdate={onHydrationUpdate} />
      )}

      <div className="grid-4" style={{ marginBottom: '1rem' }}>
        <div className="stat-card glass-stat">
          <div className="value">{Math.round(viewDay?.calories_consumed ?? today.total_calories)}</div>
          <div className="label">Calories {viewDay?.is_today ? 'Today' : 'Logged'}</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{Math.round(viewDay?.protein_consumed ?? today.total_protein)}g</div>
          <div className="label">Protein</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{body_composition.current_weight_kg} kg</div>
          <div className="label">Current Weight</div>
        </div>
        <div className="stat-card glass-stat">
          <div className="value">{body_composition.bmi}</div>
          <div className="label">BMI</div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card glass-card">
          <h3>{viewDay?.is_today ? "Today's Macros" : `${viewDay?.day_name} Macros`}</h3>
          <div className="macro-stack">
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
          </div>
        </div>

        <div className="card glass-card">
          <h3>Body Composition {body_composition.source === 'groq' ? '(AI Est.)' : ''}</h3>
          <div className="grid-2">
            <div className="stat-card glass-stat">
              <div className="value">{body_composition.body_fat_pct ?? '—'}%</div>
              <div className="label">Body Fat</div>
            </div>
            <div className="stat-card glass-stat">
              <div className="value">{body_composition.muscle_mass_kg ?? '—'} kg</div>
              <div className="label">Muscle Mass</div>
            </div>
          </div>
          {body_composition.notes && (
            <p className="muted-note">{body_composition.notes}</p>
          )}
          <button type="button" className="btn btn-secondary" style={{ marginTop: '1rem' }} onClick={onLogWeight}>
            Log Weight
          </button>
        </div>
      </div>

      <div className="grid-2 chart-section">
        <div className="card glass-card chart-card">
          <h3>Weekly Calories</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={weekly_calories} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="calGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity={0.5} />
                </linearGradient>
                <linearGradient id="targetGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.1} />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="day" {...CHART_AXIS} />
              <YAxis {...CHART_AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.08)', radius: 8 }} />
              <Bar dataKey="calories" name="Calories" fill="url(#calGrad)" radius={[8, 8, 2, 2]} activeBar={{ fill: '#38bdf8', opacity: 0.9 }} />
              <Bar dataKey="target" name="Target" fill="url(#targetGrad)" radius={[8, 8, 2, 2]} activeBar={{ fill: 'rgba(167,139,250,0.5)' }} />
              <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12, paddingTop: 8 }} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card glass-card chart-card">
          <h3>Weekly Protein</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={weekly_protein} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <defs>
                <linearGradient id="proteinLine" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#22d3ee" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <CartesianGrid {...CHART_GRID} />
              <XAxis dataKey="day" {...CHART_AXIS} />
              <YAxis {...CHART_AXIS} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(34,211,238,0.25)', strokeWidth: 1 }} />
              <Line
                type="monotone"
                dataKey="protein"
                name="Protein"
                stroke="url(#proteinLine)"
                strokeWidth={3}
                dot={{ r: 4, fill: '#22d3ee', stroke: '#0f172a', strokeWidth: 2 }}
                activeDot={{ r: 6, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }}
              />
              <Line
                type="monotone"
                dataKey="target"
                name="Target"
                stroke="rgba(167,139,250,0.45)"
                strokeDasharray="6 6"
                strokeWidth={2}
                dot={false}
              />
              <Legend wrapperStyle={{ color: 'var(--muted)', fontSize: 12, paddingTop: 8 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card glass-card chart-card">
        <h3>Weight Trend</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weight_trend} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <CartesianGrid {...CHART_GRID} />
            <XAxis dataKey="date" {...CHART_AXIS} />
            <YAxis {...CHART_AXIS} domain={['auto', 'auto']} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'rgba(251,191,36,0.25)', strokeWidth: 1 }} />
            <Line
              type="monotone"
              dataKey="weight"
              name="Weight (kg)"
              stroke="#fbbf24"
              strokeWidth={3}
              dot={{ r: 4, fill: '#fbbf24', stroke: '#0f172a', strokeWidth: 2 }}
              activeDot={{ r: 6, fill: '#fde68a', stroke: '#fff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}