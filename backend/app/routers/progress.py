from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, Meal, WeightLog, HydrationLog
from ..schemas import (
    UserResponse,
    DailySummary,
    ProgressDashboard,
    WeightLogCreate,
    WeightLogResponse,
    WeeklyTrackerResponse,
)
from ..services.weekly_tracker import build_weekly_tracker
from ..services.hydration_plan import water_target_ml

router = APIRouter(prefix="/api/progress", tags=["progress"])


def _daily_summary(user: User, target_date: date, db: Session) -> DailySummary:
    meals = db.query(Meal).filter(Meal.user_id == user.id, Meal.log_date == target_date).all()
    hydration = db.query(HydrationLog).filter(
        HydrationLog.user_id == user.id, HydrationLog.log_date == target_date
    ).all()
    water_target = user.daily_water_target_ml or water_target_ml(user.weight_kg, user.goal)
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


@router.get("/me/dashboard", response_model=ProgressDashboard)
def get_dashboard(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    today = _daily_summary(user, date.today(), db)

    weekly_calories = []
    weekly_protein = []
    for i in range(6, -1, -1):
        d = date.today() - timedelta(days=i)
        summary = _daily_summary(user, d, db)
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
        weight_trend = [{"date": date.today().strftime("%m/%d"), "weight": user.weight_kg}]

    latest = weight_logs[-1] if weight_logs else None
    current_weight = latest.weight_kg if latest else user.weight_kg

    body_composition = _local_body_composition(user, current_weight, latest)

    return ProgressDashboard(
        user=UserResponse.model_validate(user),
        today=today,
        weekly_calories=weekly_calories,
        weekly_protein=weekly_protein,
        weight_trend=weight_trend,
        body_composition=body_composition,
    )


@router.get("/me/weekly-tracker", response_model=WeeklyTrackerResponse)
def get_weekly_tracker(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    return build_weekly_tracker(user, db)


@router.post("/me/weight", response_model=WeightLogResponse)
def log_weight(
    payload: WeightLogCreate,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    log = WeightLog(user_id=user.id, **payload.model_dump())
    user.weight_kg = payload.weight_kg
    db.add(log)
    db.commit()
    db.refresh(log)
    return log