from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Meal, WeightLog
from ..schemas import (
    UserResponse, DailySummary, ProgressDashboard,
    WeightLogCreate, WeightLogResponse,
)
from ..llm.groq_client import estimate_body_composition, AIError

router = APIRouter(prefix="/api/progress", tags=["progress"])


def _daily_summary(user: User, target_date: date, db: Session) -> DailySummary:
    meals = db.query(Meal).filter(Meal.user_id == user.id, Meal.log_date == target_date).all()
    return DailySummary(
        date=target_date,
        total_calories=sum(m.calories for m in meals),
        total_protein=sum(m.protein_g for m in meals),
        total_carbs=sum(m.carbs_g for m in meals),
        total_fat=sum(m.fat_g for m in meals),
        calorie_target=user.daily_calorie_target,
        protein_target=user.daily_protein_target,
        carbs_target=user.daily_carbs_target,
        fat_target=user.daily_fat_target,
        meals_count=len(meals),
    )


@router.get("/{user_id}/dashboard", response_model=ProgressDashboard)
def get_dashboard(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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
        .filter(WeightLog.user_id == user_id)
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

    if latest and latest.body_fat_pct is not None:
        body_composition = {
            "current_weight_kg": current_weight,
            "body_fat_pct": latest.body_fat_pct,
            "muscle_mass_kg": latest.muscle_mass_kg,
            "bmi": None,
            "source": "logged",
            "notes": "From your weight log",
        }
    else:
        try:
            ai_comp = estimate_body_composition(
                user.age, user.weight_kg, user.height_cm, user.gender, user.goal
            )
            body_composition = {
                "current_weight_kg": current_weight,
                "body_fat_pct": ai_comp.get("body_fat_pct"),
                "muscle_mass_kg": ai_comp.get("muscle_mass_kg"),
                "bmi": ai_comp.get("bmi"),
                "source": "groq",
                "notes": ai_comp.get("notes", "AI estimate — log body fat for accuracy"),
            }
        except AIError as e:
            raise HTTPException(status_code=503, detail=str(e))

    return ProgressDashboard(
        user=UserResponse.model_validate(user),
        today=today,
        weekly_calories=weekly_calories,
        weekly_protein=weekly_protein,
        weight_trend=weight_trend,
        body_composition=body_composition,
    )


@router.post("/{user_id}/weight", response_model=WeightLogResponse)
def log_weight(user_id: int, payload: WeightLogCreate, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    log = WeightLog(user_id=user_id, **payload.model_dump())
    user.weight_kg = payload.weight_kg
    db.add(log)
    db.commit()
    db.refresh(log)
    return log