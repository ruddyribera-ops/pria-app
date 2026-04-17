"""
api/schemas/session.py — Session and Plan Schemas
=================================================
"""

from typing import Any, Optional
from pydantic import BaseModel


class PlanRequest(BaseModel):
    result: Any
    metadata: Optional[dict] = None


class PlanResponse(BaseModel):
    plan_type: str
    result: Any
    metadata: Optional[dict] = None


class SessionResponse(BaseModel):
    session_id: Optional[int] = None
    fecha: Optional[str] = None
    semana: Optional[int] = None
    materia: Optional[str] = None
    grado: Optional[str] = None
    tema: Optional[str] = None
