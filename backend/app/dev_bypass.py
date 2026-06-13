"""Local-only auth bypass — never enable in production."""

import os

from sqlalchemy.orm import Session

from .models import User

DEV_BYPASS_AUTH = os.getenv("DEV_BYPASS_AUTH", "").lower() == "true"
DEV_AUTH_ID = "00000000-0000-0000-0000-000000000001"


def ensure_dev_user(db: Session) -> User:
    user = db.query(User).filter(User.auth_id == DEV_AUTH_ID).first()
    if user:
        return user

    user = User(
        auth_id=DEV_AUTH_ID,
        email="dev@local.test",
        name="Dev Runner",
        age=28,
        weight_kg=72.0,
        height_cm=175.0,
        gender="male",
        goal="gain_muscle",
        dietary_restrictions="high protein",
        daily_calorie_target=2200,
        daily_protein_target=140,
        daily_carbs_target=220,
        daily_fat_target=70,
        daily_water_target_ml=2800,
        target_reasoning="Local dev bypass profile",
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user