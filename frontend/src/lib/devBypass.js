/** Dev-only mock profile — active when VITE_DEV_BYPASS_AUTH=true in development. */
export const DEV_BYPASS_AUTH =
  import.meta.env.DEV && import.meta.env.VITE_DEV_BYPASS_AUTH === 'true';

const today = new Date().toISOString().slice(0, 10);

function dayTracker(offset, overrides = {}) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  const iso = d.toISOString().slice(0, 10);
  const names = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const name = names[d.getDay()];
  const isToday = offset === 0;
  return {
    date: iso,
    day_name: name,
    short_name: name.slice(0, 3),
    is_today: isToday,
    calorie_target: 2200,
    protein_target: 140,
    workout_target_min: 35,
    water_target_ml: 2800,
    calories_consumed: isToday ? 980 : 1450,
    protein_consumed: isToday ? 62 : 95,
    water_consumed_ml: isToday ? 900 : 1600,
    calories_burned: isToday ? 180 : 320,
    workout_minutes: isToday ? 12 : 28,
    meals_count: isToday ? 2 : 3,
    workouts_count: isToday ? 1 : 1,
    net_calories: 800,
    calorie_progress_pct: isToday ? 44 : 66,
    protein_progress_pct: isToday ? 44 : 68,
    workout_progress_pct: isToday ? 34 : 80,
    water_progress_pct: isToday ? 32 : 57,
    overall_progress_pct: isToday ? 38 : 68,
    status: isToday ? 'in_progress' : 'on_track',
    ...overrides,
  };
}

const todayTracker = dayTracker(0);
const weekDays = [-6, -5, -4, -3, -2, -1, 0].map((o) => dayTracker(o));

export const DEV_USER = {
  id: 1,
  name: 'Dev Runner',
  email: 'dev@local.test',
  phone: null,
  age: 28,
  weight_kg: 72,
  height_cm: 175,
  gender: 'male',
  goal: 'gain_muscle',
  dietary_restrictions: 'high protein',
  daily_calorie_target: 2200,
  daily_protein_target: 140,
  daily_carbs_target: 220,
  daily_fat_target: 70,
  daily_water_target_ml: 2800,
  target_reasoning: 'Local dev bypass profile',
  created_at: new Date().toISOString(),
};

export const DEV_BOOTSTRAP = {
  dashboard: {
    user: DEV_USER,
    today: {
      date: today,
      total_calories: todayTracker.calories_consumed,
      total_protein: todayTracker.protein_consumed,
      total_carbs: 110,
      total_fat: 38,
      water_consumed_ml: todayTracker.water_consumed_ml,
      water_target_ml: 2800,
      calorie_target: 2200,
      protein_target: 140,
      carbs_target: 220,
      fat_target: 70,
      meals_count: 2,
    },
    weekly_calories: weekDays.map((d) => ({
      date: d.date,
      calories: d.calories_consumed,
      target: 2200,
    })),
    weekly_protein: weekDays.map((d) => ({
      date: d.date,
      protein: d.protein_consumed,
      target: 140,
    })),
    weight_trend: [
      { date: weekDays[0].date, weight_kg: 73.2 },
      { date: weekDays[3].date, weight_kg: 72.8 },
      { date: today, weight_kg: 72 },
    ],
    body_composition: {
      weight_kg: 72,
      body_fat_pct: 16.5,
      muscle_mass_kg: 32,
    },
  },
  weekly_tracker: {
    week_start: weekDays[0].date,
    week_end: today,
    today: todayTracker,
    days: weekDays,
    today_focus: 'Push strength and stay consistent with protein.',
    today_targets: {
      calories: 2200,
      protein: 140,
      workout_min: 35,
      water_ml: 2800,
    },
  },
  hydration: {
    date: today,
    target_ml: 2800,
    consumed_ml: 900,
    progress_pct: 32,
    glasses_logged: 4,
    glasses_target: 11,
    glass_size_ml: 250,
    schedule: [
      { slot: 1, time: '07:00', amount_ml: 250, completed: true, label: 'Morning' },
      { slot: 2, time: '10:00', amount_ml: 250, completed: true, label: 'Mid-morning' },
      { slot: 3, time: '13:00', amount_ml: 250, completed: false, label: 'Lunch' },
    ],
    next_reminder: 'Drink 250ml before lunch',
  },
};