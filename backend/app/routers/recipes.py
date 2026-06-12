import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, UserMealPlan
from ..schemas import (
    RecipeResponse,
    RecipeItem,
    RecipePreferences,
    MealPlanUpdateWeekly,
    MealPlanUpdateToday,
    MealPlanUpdateGrocery,
    GroceryItem,
    ScheduleEntry,
)
from ..llm.groq_client import generate_recipes, AIError
from ..services.meal_plan_store import (
    get_or_create_plan,
    plan_to_response,
    save_generated_plan,
    _loads,
    _dumps,
)

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _to_response(data: dict) -> RecipeResponse:
    recipes = [RecipeItem(**r) for r in data.get("recipes", [])]
    grocery = [GroceryItem(**g) for g in data.get("grocery_list", [])]
    weekly = [ScheduleEntry(**e) for e in data.get("weekly_schedule", [])]
    today = [ScheduleEntry(**e) for e in data.get("today_plan", [])]
    return RecipeResponse(
        recipes=recipes,
        grocery_list=grocery,
        ai_notes=data.get("ai_notes", ""),
        consumption_schedule=data.get("consumption_schedule", []),
        weekly_schedule=weekly,
        today_plan=today,
        today_name=data.get("today_name", ""),
        updated_at=data.get("updated_at"),
        has_plan=bool(weekly or recipes),
    )


@router.get("/me", response_model=RecipeResponse)
def get_plan(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    plan = db.query(UserMealPlan).filter(UserMealPlan.user_id == user.id).first()
    if not plan:
        return RecipeResponse(recipes=[], grocery_list=[], ai_notes="", has_plan=False)
    return _to_response(plan_to_response(plan))


@router.post("/me/generate", response_model=RecipeResponse)
def generate_plan(
    preferences: RecipePreferences,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    if not user.daily_calorie_target:
        raise HTTPException(status_code=400, detail="User has no calorie targets. Complete onboarding first.")

    restrictions = preferences.dietary_restrictions or user.dietary_restrictions
    goals = preferences.goals or user.goal
    count = max(2, min(preferences.count, 6))

    try:
        result = generate_recipes(
            goal=goals,
            dietary_restrictions=restrictions,
            calorie_target=user.daily_calorie_target,
            count=count,
            preferences=preferences.preferences,
        )
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    recipes = result.get("recipes", [])
    if not recipes:
        raise HTTPException(status_code=503, detail="AI returned no recipes. Try again.")

    data = save_generated_plan(
        user,
        db,
        recipes=recipes,
        grocery=result.get("grocery_list", []),
        schedule_lines=result.get("consumption_schedule", []),
        ai_notes=result.get("ai_notes", ""),
    )
    return _to_response(data)


@router.put("/me/weekly-schedule", response_model=RecipeResponse)
def update_weekly(
    payload: MealPlanUpdateWeekly,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    plan = get_or_create_plan(user, db)
    plan.weekly_schedule_json = _dumps([e.model_dump() for e in payload.weekly_schedule])
    db.commit()
    db.refresh(plan)
    return _to_response(plan_to_response(plan))


@router.put("/me/today-plan", response_model=RecipeResponse)
def update_today(
    payload: MealPlanUpdateToday,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    plan = get_or_create_plan(user, db)
    plan.today_plan_json = _dumps([e.model_dump() for e in payload.today_plan])
    db.commit()
    db.refresh(plan)
    return _to_response(plan_to_response(plan))


@router.put("/me/grocery", response_model=RecipeResponse)
def update_grocery(
    payload: MealPlanUpdateGrocery,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    plan = get_or_create_plan(user, db)
    plan.grocery_list_json = _dumps([g.model_dump() for g in payload.grocery_list])
    db.commit()
    db.refresh(plan)
    return _to_response(plan_to_response(plan))