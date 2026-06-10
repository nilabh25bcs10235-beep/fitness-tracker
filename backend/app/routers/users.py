from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User
from ..schemas import UserCreate, UserResponse
from ..llm.groq_client import calculate_targets, AIError

router = APIRouter(prefix="/api/users", tags=["users"])


@router.post("", response_model=UserResponse)
def create_user(payload: UserCreate, db: Session = Depends(get_db)):
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
        target_reasoning=targets.get("reasoning"),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/{user_id}", response_model=UserResponse)
def get_user(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@router.get("", response_model=list[UserResponse])
def list_users(db: Session = Depends(get_db)):
    return db.query(User).order_by(User.created_at.desc()).all()