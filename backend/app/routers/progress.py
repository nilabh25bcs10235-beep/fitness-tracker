from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User
from ..schemas import (
    WeightLogCreate,
    WeightLogResponse,
    WeeklyTrackerResponse,
    ProgressDashboard,
    BootstrapResponse,
)
from ..services.weekly_tracker import build_weekly_tracker
from ..services.progress_data import build_dashboard, build_bootstrap, build_hydration_today

router = APIRouter(prefix="/api/progress", tags=["progress"])


@router.get("/me/bootstrap", response_model=BootstrapResponse)
def get_bootstrap(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    data = build_bootstrap(user, db)
    return BootstrapResponse(**data)


@router.get("/me/dashboard", response_model=ProgressDashboard)
def get_dashboard(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    return build_dashboard(user, db)


@router.get("/me/weekly-tracker", response_model=WeeklyTrackerResponse)
def get_weekly_tracker(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    return build_weekly_tracker(user, db)


@router.post("/me/weight", response_model=WeightLogResponse)
def log_weight(
    payload: WeightLogCreate,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    from ..models import WeightLog

    log = WeightLog(user_id=user.id, **payload.model_dump())
    user.weight_kg = payload.weight_kg
    db.add(log)
    db.commit()
    db.refresh(log)
    return log