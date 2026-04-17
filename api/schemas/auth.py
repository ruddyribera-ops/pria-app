"""
api/schemas/auth.py — Authentication Schemas
=============================================
"""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nombre_completo: str
    nombre_hoja: str
    nivel: str = "5to primaria"
    rol: str = "docente"


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class TokenRefreshRequest(BaseModel):
    refresh_token: str


class UserResponse(BaseModel):
    email: str
    nombre_completo: str
    nombre_hoja: str
    nivel: str
    rol: str
