from datetime import date, timedelta
from collections import defaultdict

from sqlalchemy.orm import Session

from ..models import User, Meal, WeightLog, HydrationLog
from ..schemas import UserResponse, DailySummary, ProgressDashboard, WeeklyTrackerResponse, HydrationTodayResponse
from ..services.weekly_tracker import build_weekly_tracker
from ..services.hydration_plan import (
    water_target_ml,
    build_hydration_schedule,
    hydration_progress,
    next_reminder,
    GLASS_ML,
    glasses_target,
)


def _water_target(user: User) -> int:
    return user.daily_water_target_ml or water_target_ml(user.weight_kg, user.goal)


def _group_by_date_meals(meals: list[Meal]) -> dict[date, list[Meal]]:
    out: dict[date, list[Meal]] = defaultdict(list)
    for m in meals:
        out[m.log_date].append(m)
    return out


def _group_by_date_hydration(logs: list[HydrationLog]) -> dict[date, list[HydrationLog]]:
    out: dict[date, list[HydrationLog]] = defaultdict(list)
    for h in logs:
        out[h.log_date].append(h)
    return out


def _summary_from_groups(
    user: User,
    target_date: date,
    meals: list[Meal],
    hydration: list[HydrationLog],
) -> DailySummary:
    water_target = _water_target(user)
    return DailySummary(
        date=target_date,
        total_calories=sum(m.calories for m in meals),
        total_protein=sum(m.protein_g for m in meals),
        total_carbs=sum(m.carbs_g for m in meals),
        total_fat=sum(m.fat_g for m in meals),
        water_consumed_ml=sum(h.amount_ml for h in hydration),
        water_target_ml=water_target,
        calorie_target=user.daily_calorie_target,
        protein_target=user.daily_protein_target,
        carbs_target=user.daily_carbs_target,
        fat_target=user.daily_fat_target,
        meals_count=len(meals),
    )


def _local_body_composition(user: User, current_weight: float, latest_log: WeightLog | None) -> dict:
    bmi = None
    if user.height_cm:
        h_m = user.height_cm / 100
        bmi = round(current_weight / (h_m * h_m), 1)

    if latest_log and latest_log.body_fat_pct is not None:
        return {
            "current_weight_kg": current_weight,
            "body_fat_pct": latest_log.body_fat_pct,
            "muscle_mass_kg": latest_log.muscle_mass_kg,
            "bmi": bmi,
            "source": "logged",
            "notes": "From your weight log",
        }

    return {
        "current_weight_kg": current_weight,
        "body_fat_pct": None,
        "muscle_mass_kg": None,
        "bmi": bmi,
        "source": "profile",
        "notes": "Upload a body photo in AI Coach for composition estimates",
    }


def build_hydration_today(user: User, db: Session, log_date: date | None = None) -> HydrationTodayResponse:
    today = log_date or date.today()
    target = _water_target(user)
    logs = db.query(HydrationLog).filter(
        HydrationLog.user_id == user.id, HydrationLog.log_date == today
    ).all()
    consumed = sum(l.amount_ml for l in logs)
    schedule = build_hydration_schedule(target, consumed)
    return HydrationTodayResponse(
        date=today,
        target_ml=target,
        consumed_ml=round(consumed, 1),
        progress_pct=hydration_progress(consumed, target),
        glasses_logged=int(consumed // GLASS_ML),
        glasses_target=glasses_target(target),
        glass_size_ml=GLASS_ML,
        schedule=schedule,
        next_reminder=next_reminder(schedule),
    )


def build_dashboard(user: User, db: Session) -> ProgressDashboard:
    today = date.today()
    week_start = today - timedelta(days=6)

    meals = (
        db.query(Meal)
        .filter(Meal.user_id == user.id, Meal.log_date >= week_start, Meal.log_date <= today)
        .all()
    )
    hydration_logs = (
        db.query(HydrationLog)
        .filter(HydrationLog.user_id == user.id, HydrationLog.log_date >= week_start, HydrationLog.log_date <= today)
        .all()
    )
    meals_by_date = _group_by_date_meals(meals)
    hydration_by_date = _group_by_date_hydration(hydration_logs)

    today_summary = _summary_from_groups(
        user, today, meals_by_date.get(today, []), hydration_by_date.get(today, [])
    )

    weekly_calories = []
    weekly_protein = []
    for i in range(6, -1, -1):
        d = today - timedelta(days=i)
        summary = _summary_from_groups(
            user, d, meals_by_date.get(d, []), hydration_by_date.get(d, [])
        )
        label = d.strftime("%a")
        weekly_calories.append({
            "day": label,
            "calories": summary.total_calories,
            "target": summary.calorie_target,
        })
        weekly_protein.append({
            "day": label,
            "protein": summary.total_protein,
            "target": summary.protein_target,
        })

    weight_logs = (
        db.query(WeightLog)
        .filter(WeightLog.user_id == user.id)
        .order_by(WeightLog.logged_at.asc())
        .limit(30)
        .all()
    )
    weight_trend = [
        {"date": w.logged_at.strftime("%m/%d"), "weight": w.weight_kg}
        for w in weight_logs
    ]
    if not weight_trend:
        weight_trend = [{"date": today.strftime("%m/%d"), "weight": user.weight_kg}]

    latest = weight_logs[-1] if weight_logs else None
    current_weight = latest.weight_kg if latest else user.weight_kg

    return ProgressDashboard(
        user=UserResponse.model_validate(user),
        today=today_summary,
        weekly_calories=weekly_calories,
        weekly_protein=weekly_protein,
        weight_trend=weight_trend,
        body_composition=_local_body_composition(user, current_weight, latest),
    )


def build_bootstrap(user: User, db: Session) -> dict:
    """Single round-trip payload: dashboard + tracker + hydration with shared DB reads."""
    dashboard = build_dashboard(user, db)
    tracker = build_weekly_tracker(user, db)
    hydration = build_hydration_today(user, db)
    return {
        "dashboard": dashboard,
        "weekly_tracker": tracker,
        "hydration": hydration,
    }