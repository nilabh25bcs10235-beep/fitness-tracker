import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")


def auth_enabled() -> bool:
    return bool(JWT_SECRET)


def verify_supabase_token(authorization: Optional[str] = Header(default=None)) -> str:
    """Return Supabase auth user id (JWT sub claim)."""
    if not JWT_SECRET:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication is not configured on the server.",
        )

    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid authorization header.",
        )

    token = authorization.removeprefix("Bearer ").strip()
    try:
        payload = jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
        )
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid session: {exc}",
        ) from exc

    auth_id = payload.get("sub")
    if not auth_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid session token.",
        )
    return auth_id