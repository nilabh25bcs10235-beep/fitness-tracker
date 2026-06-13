from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_user_profile
from ..models import User, HydrationLog
from ..schemas import HydrationLogCreate, HydrationTodayResponse
from ..services.hydration_plan import (
    GLASS_ML,
    build_hydration_schedule,
    hydration_progress,
    next_reminder,
    water_target_ml,
    glasses_target,
)

router = APIRouter(prefix="/api/hydration", tags=["hydration"])


def _today_total(user: User, db: Session, log_date: date) -> float:
    logs = (
        db.query(HydrationLog)
        .filter(HydrationLog.user_id == user.id, HydrationLog.log_date == log_date)
        .all()
    )
    return sum(l.amount_ml for l in logs)


@router.get("/me/today", response_model=HydrationTodayResponse)
def get_today(user: User = Depends(get_user_profile), db: Session = Depends(get_db)):
    today = date.today()
    target = user.daily_water_target_ml or water_target_ml(user.weight_kg, user.goal)
    consumed = _today_total(user, db, today)
    schedule = build_hydration_schedule(target, consumed)

    return HydrationTodayResponse(
        date=today,
        target_ml=target,
        consumed_ml=round(consumed, 1),
        progress_pct=hydration_progress(consumed, target),
        glasses_logged=int(consumed // GLASS_ML),
        glasses_target=glasses_target(target),
        glass_size_ml=GLASS_ML,
        schedule=schedule,
        next_reminder=next_reminder(schedule),
    )


@router.post("/me/log", response_model=HydrationTodayResponse)
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
    return get_today(user=user, db=db)