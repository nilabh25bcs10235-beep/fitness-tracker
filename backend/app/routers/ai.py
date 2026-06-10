from datetime import date
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, Meal
from ..schemas import InsightRequest, InsightResponse
from ..llm.groq_client import get_smart_insight, AIError

router = APIRouter(prefix="/api/ai", tags=["ai"])


@router.post("/{user_id}/insight", response_model=InsightResponse)
def get_insight(user_id: int, payload: InsightRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    today_meals = db.query(Meal).filter(Meal.user_id == user_id, Meal.log_date == date.today()).all()
    today_macros = {
        "calories": sum(m.calories for m in today_meals),
        "protein": sum(m.protein_g for m in today_meals),
        "carbs": sum(m.carbs_g for m in today_meals),
        "fat": sum(m.fat_g for m in today_meals),
        "meals_logged": len(today_meals),
    }
    user_context = {
        "name": user.name,
        "age": user.age,
        "weight_kg": user.weight_kg,
        "goal": user.goal,
        "dietary_restrictions": user.dietary_restrictions,
        "daily_calorie_target": user.daily_calorie_target,
        "daily_protein_target": user.daily_protein_target,
    }

    try:
        result = get_smart_insight(payload.query, user_context, today_macros)
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return InsightResponse(
        answer=result.get("answer", ""),
        suggestions=result.get("suggestions", []),
        is_ai=True,
        source="groq",
    )