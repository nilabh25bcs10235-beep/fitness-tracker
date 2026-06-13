from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from .auth import verify_supabase_token
from .database import get_db
from .dev_bypass import DEV_BYPASS_AUTH, ensure_dev_user
from .models import User


def get_auth_id(auth_id: str = Depends(verify_supabase_token)) -> str:
    return auth_id


def get_user_profile(
    auth_id: str = Depends(get_auth_id),
    db: Session = Depends(get_db),
) -> User:
    if DEV_BYPASS_AUTH:
        return ensure_dev_user(db)

    user = db.query(User).filter(User.auth_id == auth_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Profile not found. Complete onboarding first.",
        )
    return user