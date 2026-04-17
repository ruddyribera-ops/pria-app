"""
api/deps.py — FastAPI Dependencies
=================================
Authentication and authorization dependencies.
"""

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError, ExpiredSignatureError

from api.config import get_settings
from db import get_usuario_by_email

security = HTTPBearer()


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """Decode JWT and return user dict."""
    settings = get_settings()
    token = credentials.credentials
    try:
        payload = jwt.decode(
            token, settings["SECRET_KEY"], algorithms=[settings["ALGORITHM"]]
        )
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_usuario_by_email(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_teacher(current_user: dict = Depends(get_current_user)) -> dict:
    """Require teacher or admin role."""
    if current_user.get("rol") not in ("docente", "admin"):
        raise HTTPException(status_code=403, detail="Not authorized")
    return current_user


def get_current_admin(current_user: dict = Depends(get_current_user)) -> dict:
    """Require admin role."""
    if current_user.get("rol") != "admin":
        raise HTTPException(status_code=403, detail="Admin only")
    return current_user


def get_current_user_from_token(token: str) -> dict:
    """
    Decode JWT from WebSocket auth (without Depends).

    Used by WebSocket endpoints that receive token as a query parameter.
    """
    settings = get_settings()
    try:
        payload = jwt.decode(
            token, settings["SECRET_KEY"], algorithms=[settings["ALGORITHM"]]
        )
        email = payload.get("sub")
        if email is None:
            raise HTTPException(status_code=401, detail="Invalid token")
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_usuario_by_email(email)
    if user is None:
        raise HTTPException(status_code=401, detail="User not found")
    return user
