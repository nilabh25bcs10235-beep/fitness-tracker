import os
from typing import Optional

import jwt
from fastapi import Header, HTTPException, status
from jwt import PyJWKClient

JWT_SECRET = os.getenv("SUPABASE_JWT_SECRET")
JWT_AUDIENCE = os.getenv("SUPABASE_JWT_AUDIENCE", "authenticated")
SUPABASE_URL = os.getenv("SUPABASE_URL") or os.getenv("VITE_SUPABASE_URL")

_jwk_client: Optional[PyJWKClient] = None


def auth_enabled() -> bool:
    return bool(JWT_SECRET or SUPABASE_URL)


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    if _jwk_client is None:
        if not SUPABASE_URL:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SUPABASE_URL is required for asymmetric JWT verification.",
            )
        jwks_url = f"{SUPABASE_URL.rstrip('/')}/auth/v1/.well-known/jwks.json"
        _jwk_client = PyJWKClient(jwks_url)
    return _jwk_client


def _decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except jwt.PyJWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid session: {exc}",
        ) from exc

    alg = header.get("alg", "")

    if alg == "HS256":
        if not JWT_SECRET:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="SUPABASE_JWT_SECRET is required for HS256 tokens.",
            )
        return jwt.decode(
            token,
            JWT_SECRET,
            algorithms=["HS256"],
            audience=JWT_AUDIENCE,
        )

    if alg in ("ES256", "RS256"):
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=[alg],
            audience=JWT_AUDIENCE,
        )

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=f"Invalid session: unsupported JWT algorithm ({alg or 'missing'}).",
    )


def verify_supabase_token(authorization: Optional[str] = Header(default=None)) -> str:
    """Return Supabase auth user id (JWT sub claim)."""
    from .dev_bypass import DEV_AUTH_ID, DEV_BYPASS_AUTH

    if DEV_BYPASS_AUTH:
        return DEV_AUTH_ID

    if not auth_enabled():
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
        payload = _decode_token(token)
    except HTTPException:
        raise
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