from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_auth_id, get_user_profile
from ..models import User
from ..schemas import UserCreate, UserResponse
from ..llm.groq_client import calculate_targets, AIError
from ..services.hydration_plan import water_target_ml

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse)
def create_user(
    payload: UserCreate,
    auth_id: str = Depends(get_auth_id),
    db: Session = Depends(get_db),
):
    existing = db.query(User).filter(User.auth_id == auth_id).first()
    if existing:
        raise HTTPException(status_code=400, detail="Profile already exists for this account.")

    try:
        targets = calculate_targets(
            payload.age,
            payload.weight_kg,
            payload.height_cm,
            payload.goal,
            payload.gender,
            payload.dietary_restrictions,
        )
    except AIError as e:
        raise HTTPException(status_code=503, detail=str(e))

    user = User(
        auth_id=auth_id,
        email=payload.email,
        phone=payload.phone,
        name=payload.name,
        age=payload.age,
        weight_kg=payload.weight_kg,
        height_cm=payload.height_cm,
        gender=payload.gender,
        goal=payload.goal,
        dietary_restrictions=payload.dietary_restrictions,
        daily_calorie_target=targets["daily_calorie_target"],
        daily_protein_target=targets["daily_protein_target"],
        daily_carbs_target=targets.get("daily_carbs_target"),
        daily_fat_target=targets.get("daily_fat_target"),
        daily_water_target_ml=water_target_ml(payload.weight_kg, payload.goal),
        target_reasoning=targets.get("reasoning"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/me", response_model=UserResponse)
def get_me(user: User = Depends(get_user_profile)):
    return user