"""
api/routers/auth.py — Authentication Endpoints
==============================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from jose import jwt, JWTError, ExpiredSignatureError
import datetime

from api.config import get_settings
from api.schemas.auth import (
    LoginRequest,
    RegisterRequest,
    Token,
    UserResponse,
    TokenRefreshRequest,
)
from api.deps import get_current_user
from db import crear_usuario, verificar_login, get_usuario_by_email

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(req: LoginRequest):
    """Authenticate user and return JWT tokens."""
    user = verificar_login(req.email, req.password)
    if not user:
        raise HTTPException(status_code=401, detail="Invalid credentials")

    settings = get_settings()
    now = datetime.datetime.utcnow()
    access_exp = now + datetime.timedelta(
        minutes=settings["ACCESS_TOKEN_EXPIRE_MINUTES"]
    )
    refresh_exp = now + datetime.timedelta(days=settings["REFRESH_TOKEN_EXPIRE_DAYS"])

    access_payload = {
        "sub": user["email"],
        "exp": access_exp,
        "type": "access",
        "nombre_hoja": user.get("nombre_hoja", ""),
        "rol": user.get("rol", "docente"),
    }
    refresh_payload = {
        "sub": user["email"],
        "exp": refresh_exp,
        "type": "refresh",
    }

    access_token = jwt.encode(
        access_payload, settings["SECRET_KEY"], algorithm=settings["ALGORITHM"]
    )
    refresh_token = jwt.encode(
        refresh_payload, settings["SECRET_KEY"], algorithm=settings["ALGORITHM"]
    )

    return Token(access_token=access_token, refresh_token=refresh_token)


@router.post("/register", response_model=UserResponse, status_code=201)
def register(req: RegisterRequest):
    """Register a new user."""
    existing = get_usuario_by_email(req.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Map nombre_completo to nombre for db.crear_usuario
    success = crear_usuario(
        email=req.email,
        password=req.password,
        nombre=req.nombre_completo,
        nombre_hoja=req.nombre_hoja,
        rol=req.rol,
    )
    if not success:
        raise HTTPException(status_code=400, detail="Failed to create user")

    user = get_usuario_by_email(req.email)
    return UserResponse(
        email=user["email"],
        nombre_completo=user["nombre"],
        nombre_hoja=user["nombre_hoja"],
        nivel=user.get("nivel", req.nivel),
        rol=user["rol"],
    )


@router.post("/refresh", response_model=Token)
def refresh(req: TokenRefreshRequest):
    """Refresh access token using a valid refresh token."""
    settings = get_settings()
    try:
        payload = jwt.decode(
            req.refresh_token,
            settings["SECRET_KEY"],
            algorithms=[settings["ALGORITHM"]],
        )
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        email = payload["sub"]
    except ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = get_usuario_by_email(email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    # Issue new tokens
    now = datetime.datetime.utcnow()
    access_exp = now + datetime.timedelta(
        minutes=settings["ACCESS_TOKEN_EXPIRE_MINUTES"]
    )
    refresh_exp = now + datetime.timedelta(days=settings["REFRESH_TOKEN_EXPIRE_DAYS"])

    access_payload = {
        "sub": user["email"],
        "exp": access_exp,
        "type": "access",
        "nombre_hoja": user.get("nombre_hoja", ""),
        "rol": user.get("rol", "docente"),
    }
    refresh_payload = {
        "sub": user["email"],
        "exp": refresh_exp,
        "type": "refresh",
    }

    return Token(
        access_token=jwt.encode(
            access_payload, settings["SECRET_KEY"], algorithm=settings["ALGORITHM"]
        ),
        refresh_token=jwt.encode(
            refresh_payload, settings["SECRET_KEY"], algorithm=settings["ALGORITHM"]
        ),
    )


@router.get("/me", response_model=UserResponse)
def me(current_user: dict = Depends(get_current_user)):
    """Get current authenticated user info."""
    return UserResponse(
        email=current_user["email"],
        nombre_completo=current_user.get("nombre", ""),
        nombre_hoja=current_user.get("nombre_hoja", ""),
        nivel=current_user.get("nivel", "5to primaria"),
        rol=current_user["rol"],
    )
