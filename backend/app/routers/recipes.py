from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User
from ..schemas import RecipeResponse, RecipeItem, RecipePreferences
from ..llm.groq_client import generate_recipes, AIError

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


def _build_recipes(user: User, preferences: RecipePreferences | None = None) -> RecipeResponse:
    if not user.daily_calorie_target:
        raise HTTPException(status_code=400, detail="User has no calorie targets. Complete onboarding first.")

    prefs = preferences or RecipePreferences()
    restrictions = prefs.dietary_restrictions or user.dietary_restrictions
    goals = prefs.goals or user.goal
    count = max(2, min(prefs.count, 6))

    try:
        result = generate_recipes(
            goal=goals,
            dietary_restrictions=restrictions,
            calorie_target=user.daily_calorie_target,
            count=count,
            preferences=prefs.preferences,
        )
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    recipes = [RecipeItem(**r) for r in result.get("recipes", [])]
    if not recipes:
        raise HTTPException(status_code=503, detail="AI returned no recipes. Try again.")

    return RecipeResponse(
        recipes=recipes,
        grocery_list=result.get("grocery_list", []),
        ai_notes=result.get("ai_notes", ""),
        consumption_schedule=result.get("consumption_schedule", []),
    )


@router.get("/me", response_model=RecipeResponse)
def get_recipes(count: int = 4, user: User = Depends(get_user_profile)):
    return _build_recipes(user, RecipePreferences(count=count))


@router.post("/me", response_model=RecipeResponse)
def create_recipes(
    preferences: RecipePreferences,
    user: User = Depends(get_user_profile),
):
    return _build_recipes(user, preferences)