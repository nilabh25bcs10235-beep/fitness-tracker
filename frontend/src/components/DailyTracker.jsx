function ProgressRing({ pct, label, value, target, unit }) {
  const clamped = Math.min(100, pct);
  return (
    <div className="tracker-ring-wrap">
      <div className="tracker-ring" style={{ '--pct': `${clamped}%` }}>
        <span className="tracker-ring-value">{Math.round(clamped)}%</span>
      </div>
      <div className="tracker-ring-label">{label}</div>
      <div className="tracker-ring-sub">
        {Math.round(value)} / {target} {unit}
      </div>
    </div>
  );
}

function DayPill({ day, active, onClick }) {
  const statusClass = day.is_today ? 'today' : day.status;
  return (
    <button
      type="button"
      className={`day-pill ${active ? 'active' : ''} ${statusClass}`}
      onClick={onClick}
      title={`${day.day_name}: ${Math.round(day.overall_progress_pct)}%`}
    >
      <span className="day-pill-name">{day.short_name}</span>
      <span className="day-pill-bar">
        <span style={{ width: `${Math.min(100, day.overall_progress_pct)}%` }} />
      </span>
    </button>
  );
}

export default function DailyTracker({ tracker, selectedDay, onSelectDay }) {
  if (!tracker) return null;

  const viewDay = selectedDay || tracker.today;

  return (
    <div className="card daily-tracker">
      <div className="tracker-header">
        <div>
          <h2>Daily Tracker</h2>
          <p className="tracker-date">
            {viewDay.is_today ? 'Today' : viewDay.day_name} · {viewDay.date}
          </p>
        </div>
        <div className="tracker-overall">
          <span className="value">{Math.round(viewDay.overall_progress_pct)}%</span>
          <span className="label">day progress</span>
        </div>
      </div>

      {viewDay.is_today && (
        <div className="insight-box today-focus">{tracker.today_focus}</div>
      )}

      <div className="week-pills">
        {tracker.days.map((d) => (
          <DayPill
            key={d.date}
            day={d}
            active={viewDay.date === d.date}
            onClick={() => onSelectDay?.(d)}
          />
        ))}
      </div>

      <div className="tracker-rings">
        <ProgressRing
          pct={viewDay.calorie_progress_pct}
          label="Calories"
          value={viewDay.net_calories}
          target={viewDay.calorie_target}
          unit="kcal net"
        />
        <ProgressRing
          pct={viewDay.protein_progress_pct}
          label="Protein"
          value={viewDay.protein_consumed}
          target={viewDay.protein_target}
          unit="g"
        />
        <ProgressRing
          pct={viewDay.workout_progress_pct}
          label="Workout"
          value={viewDay.workout_minutes}
          target={viewDay.workout_target_min}
          unit="min"
        />
      </div>

      <div className="tracker-stats grid-4">
        <div className="stat-card">
          <div className="value">{viewDay.meals_count}</div>
          <div className="label">Meals logged</div>
        </div>
        <div className="stat-card">
          <div className="value">{viewDay.workouts_count}</div>
          <div className="label">Workouts</div>
        </div>
        <div className="stat-card">
          <div className="value">{Math.round(viewDay.calories_burned)}</div>
          <div className="label">kcal burned</div>
        </div>
        <div className="stat-card">
          <div className="value">{tracker.today_targets?.calories_remaining ?? '—'}</div>
          <div className="label">kcal left today</div>
        </div>
      </div>

      {viewDay.is_today && (
        <div className="today-targets">
          <span className="chip">🎯 {tracker.today_targets.protein_remaining_g}g protein left</span>
          <span className="chip">🏋️ {tracker.today_targets.workout_remaining_min} min workout left</span>
        </div>
      )}
    </div>
  );
}