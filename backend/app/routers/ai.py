from datetime import date

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, Meal
from ..schemas import (
    InsightRequest,
    InsightResponse,
    BodyImageAnalysis,
    ExercisePlanResponse,
    ExerciseItem,
    CalorieBurnRequest,
    CalorieBurnResponse,
)
from ..llm.groq_client import (
    get_smart_insight,
    analyze_body_image,
    get_exercise_plan,
    estimate_calorie_burn,
    AIError,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


def _user_context(user: User) -> dict:
    return {
        "name": user.name,
        "age": user.age,
        "weight_kg": user.weight_kg,
        "height_cm": user.height_cm,
        "gender": user.gender,
        "goal": user.goal,
        "dietary_restrictions": user.dietary_restrictions,
        "daily_calorie_target": user.daily_calorie_target,
        "daily_protein_target": user.daily_protein_target,
    }


@router.post("/me/insight", response_model=InsightResponse)
def get_insight(
    payload: InsightRequest,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    today_meals = db.query(Meal).filter(Meal.user_id == user.id, Meal.log_date == date.today()).all()
    today_macros = {
        "calories": sum(m.calories for m in today_meals),
        "protein": sum(m.protein_g for m in today_meals),
        "carbs": sum(m.carbs_g for m in today_meals),
        "fat": sum(m.fat_g for m in today_meals),
        "meals_logged": len(today_meals),
    }

    try:
        result = get_smart_insight(payload.query, _user_context(user), today_macros)
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return InsightResponse(
        answer=result.get("answer", ""),
        suggestions=result.get("suggestions", []),
        is_ai=True,
        source="groq",
    )


@router.post("/me/body-image", response_model=BodyImageAnalysis)
async def analyze_body(
    file: UploadFile = File(...),
    user: User = Depends(get_user_profile),
):
    image_bytes = await file.read()
    try:
        result = analyze_body_image(image_bytes, _user_context(user))
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return BodyImageAnalysis(
        estimated_bmi=float(result.get("estimated_bmi", 0)),
        body_fat_pct=result.get("body_fat_pct"),
        muscle_mass_kg=result.get("muscle_mass_kg"),
        physique_notes=result.get("physique_notes", ""),
        nutritional_advice=result.get("nutritional_advice", ""),
        goal_recommendations=result.get("goal_recommendations", []),
        confidence=result.get("confidence", "medium"),
    )


@router.post("/me/exercises", response_model=ExercisePlanResponse)
def get_exercises(
    body_part: str,
    user: User = Depends(get_user_profile),
):
    if not body_part.strip():
        raise HTTPException(status_code=400, detail="body_part is required")

    try:
        result = get_exercise_plan(body_part.strip(), _user_context(user))
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    exercises = [ExerciseItem(**e) for e in result.get("exercises", [])]
    return ExercisePlanResponse(
        body_part=result.get("body_part", body_part),
        exercises=exercises,
        cardio_options=result.get("cardio_options", []),
        tips=result.get("tips", []),
    )


@router.post("/me/calorie-burn", response_model=CalorieBurnResponse)
def calorie_burn(
    payload: CalorieBurnRequest,
    user: User = Depends(get_user_profile),
):
    try:
        result = estimate_calorie_burn(
            payload.activity,
            payload.duration_min,
            payload.intensity,
            _user_context(user),
        )
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return CalorieBurnResponse(
        activity=result.get("activity", payload.activity),
        duration_min=int(result.get("duration_min", payload.duration_min)),
        calories_burned=int(result.get("calories_burned", 0)),
        notes=result.get("notes", ""),
        related_exercises=result.get("related_exercises", []),
    )