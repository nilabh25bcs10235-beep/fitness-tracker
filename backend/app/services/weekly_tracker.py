from datetime import date, timedelta

from sqlalchemy.orm import Session

from ..models import User, Meal, WorkoutLog, HydrationLog
from ..schemas import DayTracker, WeeklyTrackerResponse
from ..services.hydration_plan import water_target_ml, hydration_progress

DAY_NAMES = ("Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday")


def _workout_target_min(goal: str) -> int:
    if goal in ("muscle_gain", "gain_muscle"):
        return 45
    if goal in ("fat_loss", "lose_weight"):
        return 35
    return 30


def _week_start(today: date) -> date:
    return today - timedelta(days=today.weekday())


def _day_status(cal_pct: float, protein_pct: float, workout_pct: float, water_pct: float, is_today: bool) -> str:
    overall = (cal_pct + protein_pct + workout_pct + water_pct) / 4
    if not is_today and overall >= 80:
        return "complete"
    if overall >= 85:
        return "on_track"
    if overall >= 55:
        return "in_progress"
    if overall >= 25:
        return "behind"
    return "not_started"


def _build_day_tracker(
    user: User,
    target_date: date,
    today: date,
    meals: list[Meal],
    workouts: list[WorkoutLog],
    hydration_logs: list[HydrationLog],
) -> DayTracker:
    cal_target = user.daily_calorie_target or 2000
    protein_target = user.daily_protein_target or 80
    workout_target = _workout_target_min(user.goal)
    water_target = user.daily_water_target_ml or water_target_ml(user.weight_kg, user.goal)

    calories_consumed = sum(m.calories for m in meals)
    protein_consumed = sum(m.protein_g for m in meals)
    water_consumed = sum(h.amount_ml for h in hydration_logs)
    calories_burned = sum(w.calories_burned for w in workouts)
    workout_minutes = sum(w.duration_min for w in workouts)

    cal_pct = min(100.0, (calories_consumed / cal_target) * 100) if cal_target else 0
    protein_pct = min(100.0, (protein_consumed / protein_target) * 100) if protein_target else 0
    workout_pct = min(100.0, (workout_minutes / workout_target) * 100) if workout_target else 0
    water_pct = hydration_progress(water_consumed, water_target)
    overall = round((cal_pct + protein_pct + workout_pct + water_pct) / 4, 1)

    is_today = target_date == today
    weekday = target_date.weekday()

    return DayTracker(
        date=target_date,
        day_name=DAY_NAMES[weekday],
        short_name=DAY_NAMES[weekday][:3],
        is_today=is_today,
        calorie_target=cal_target,
        protein_target=protein_target,
        workout_target_min=workout_target,
        water_target_ml=water_target,
        calories_consumed=round(calories_consumed, 1),
        protein_consumed=round(protein_consumed, 1),
        water_consumed_ml=round(water_consumed, 1),
        calories_burned=round(calories_burned, 1),
        workout_minutes=workout_minutes,
        meals_count=len(meals),
        workouts_count=len(workouts),
        net_calories=round(calories_consumed - calories_burned, 1),
        calorie_progress_pct=round(cal_pct, 1),
        protein_progress_pct=round(protein_pct, 1),
        workout_progress_pct=round(workout_pct, 1),
        water_progress_pct=water_pct,
        overall_progress_pct=overall,
        status=_day_status(cal_pct, protein_pct, workout_pct, water_pct, is_today),
    )


def _today_focus_message(today: DayTracker) -> str:
    cal_left = max(0, round(today.calorie_target - today.net_calories))
    protein_left = max(0, round(today.protein_target - today.protein_consumed))
    workout_left = max(0, today.workout_target_min - today.workout_minutes)

    parts = [
        f"It's {today.day_name}! You've logged {today.meals_count} meal(s) "
        f"and {today.workouts_count} workout(s) so far.",
    ]
    if cal_left > 0:
        parts.append(f"Eat up to {cal_left} more kcal to hit today's calorie target.")
    else:
        parts.append("You've reached your calorie target for today.")
    if protein_left > 0:
        parts.append(f"Get {protein_left}g more protein.")
    if workout_left > 0:
        parts.append(f"Complete {workout_left} more minutes of exercise.")
    else:
        parts.append("Workout goal achieved — great job!")
    water_left = max(0, round(today.water_target_ml - today.water_consumed_ml))
    if water_left > 0:
        parts.append(f"Drink {water_left}ml more water today.")
    else:
        parts.append("Hydration goal crushed!")
    return " ".join(parts)


def build_weekly_tracker(user: User, db: Session) -> WeeklyTrackerResponse:
    today = date.today()
    start = _week_start(today)
    end = start + timedelta(days=6)

    all_meals = (
        db.query(Meal)
        .filter(Meal.user_id == user.id, Meal.log_date >= start, Meal.log_date <= end)
        .all()
    )
    all_workouts = (
        db.query(WorkoutLog)
        .filter(WorkoutLog.user_id == user.id, WorkoutLog.log_date >= start, WorkoutLog.log_date <= end)
        .all()
    )
    all_hydration = (
        db.query(HydrationLog)
        .filter(HydrationLog.user_id == user.id, HydrationLog.log_date >= start, HydrationLog.log_date <= end)
        .all()
    )

    meals_by_date: dict[date, list[Meal]] = {}
    workouts_by_date: dict[date, list[WorkoutLog]] = {}
    hydration_by_date: dict[date, list[HydrationLog]] = {}
    for m in all_meals:
        meals_by_date.setdefault(m.log_date, []).append(m)
    for w in all_workouts:
        workouts_by_date.setdefault(w.log_date, []).append(w)
    for h in all_hydration:
        hydration_by_date.setdefault(h.log_date, []).append(h)

    days: list[DayTracker] = []
    today_tracker = None
    for i in range(7):
        d = start + timedelta(days=i)
        tracker = _build_day_tracker(
            user, d, today,
            meals_by_date.get(d, []),
            workouts_by_date.get(d, []),
            hydration_by_date.get(d, []),
        )
        days.append(tracker)
        if d == today:
            today_tracker = tracker

    if today_tracker is None:
        today_tracker = days[-1]

    cal_left = max(0, round(today_tracker.calorie_target - today_tracker.net_calories))
    protein_left = max(0, round(today_tracker.protein_target - today_tracker.protein_consumed))
    workout_left = max(0, today_tracker.workout_target_min - today_tracker.workout_minutes)
    water_left = max(0, round(today_tracker.water_target_ml - today_tracker.water_consumed_ml))

    return WeeklyTrackerResponse(
        week_start=start,
        week_end=end,
        today=today_tracker,
        days=days,
        today_focus=_today_focus_message(today_tracker),
        today_targets={
            "calories_remaining": cal_left,
            "protein_remaining_g": protein_left,
            "workout_remaining_min": workout_left,
            "calorie_target": today_tracker.calorie_target,
            "protein_target_g": today_tracker.protein_target,
            "workout_target_min": today_tracker.workout_target_min,
            "water_remaining_ml": water_left,
            "water_target_ml": today_tracker.water_target_ml,
        },
    )