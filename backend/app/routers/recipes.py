from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import RecipeResponse, RecipeItem
from ..llm.groq_client import generate_recipes, AIError

router = APIRouter(prefix="/api/recipes", tags=["recipes"])


@router.get("/{user_id}", response_model=RecipeResponse)
def get_recipes(user_id: int, count: int = 3, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not user.daily_calorie_target:
        raise HTTPException(status_code=400, detail="User has no calorie targets. Complete onboarding first.")

    try:
        result = generate_recipes(
            goal=user.goal,
            dietary_restrictions=user.dietary_restrictions,
            calorie_target=user.daily_calorie_target,
            count=count,
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
    )