from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, WorkoutLog
from ..schemas import WorkoutCreate, WorkoutResponse

router = APIRouter(prefix="/api/workouts", tags=["workouts"])


@router.post("/me", response_model=WorkoutResponse)
def log_workout(
    payload: WorkoutCreate,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    workout = WorkoutLog(
        user_id=user.id,
        log_date=date.today(),
        **payload.model_dump(),
    )
    db.add(workout)
    db.commit()
    db.refresh(workout)
    return workout


@router.get("/me", response_model=list[WorkoutResponse])
def get_workouts(
    log_date: date | None = None,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    query = db.query(WorkoutLog).filter(WorkoutLog.user_id == user.id)
    if log_date:
        query = query.filter(WorkoutLog.log_date == log_date)
    return query.order_by(WorkoutLog.logged_at.desc()).all()