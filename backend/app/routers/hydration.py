from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, HydrationLog
from ..schemas import HydrationLogCreate, HydrationTodayResponse, HydrationLogResponse
from ..services.progress_data import build_hydration_today
from ..services.weekly_tracker import build_weekly_tracker

router = APIRouter(prefix="/api/hydration", tags=["hydration"])


@router.get("/me/today", response_model=HydrationTodayResponse)
def get_today(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    return build_hydration_today(user, db)


@router.post("/me/log", response_model=HydrationLogResponse)
def log_water(
    payload: HydrationLogCreate,
    user: User = Depends(get_user_profile),
    db: Session = Depends(get_db),
):
    log = HydrationLog(
        user_id=user.id,
        amount_ml=payload.amount_ml,
        log_date=date.today(),
    )
    db.add(log)
    db.commit()
    return HydrationLogResponse(
        hydration=build_hydration_today(user, db),
        weekly_tracker=build_weekly_tracker(user, db),
    )