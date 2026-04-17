"""
api/routers/sesiones.py — Session Management Endpoints
=====================================================
"""

from typing import Optional
from fastapi import APIRouter, Depends

from api.deps import get_current_user, get_current_teacher
from api.schemas.session import SessionResponse
from db.sesiones import (
    crear_sesion,
    get_sesiones,
    get_sesion,
    guardar_micro_objetivos,
    get_micro_objetivos,
    marcar_objetivo,
    marcar_multiples,
)

router = APIRouter(prefix="/sesiones", tags=["sesiones"])


@router.get("", response_model=list[SessionResponse])
def list_sesiones(
    materia: Optional[str] = None,
    semana: Optional[int] = None,
    current_user: dict = Depends(get_current_teacher),
):
    """List sessions, optionally filtered by materia or semana."""
    sesiones = get_sesiones(materia=materia, semana=semana)
    return [
        SessionResponse(
            session_id=s.get("id"),
            fecha=s.get("fecha"),
            semana=s.get("semana"),
            materia=s.get("materia"),
            grado=s.get("grado"),
            tema=s.get("tema"),
        )
        for s in sesiones
    ]


@router.get("/{sesion_id}", response_model=SessionResponse)
def get_session(sesion_id: int, current_user: dict = Depends(get_current_teacher)):
    """Get a specific session by ID."""
    sesion = get_sesion(sesion_id)
    if not sesion:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Session not found")
    return SessionResponse(
        session_id=sesion.get("id"),
        fecha=sesion.get("fecha"),
        semana=sesion.get("semana"),
        materia=sesion.get("materia"),
        grado=sesion.get("grado"),
        tema=sesion.get("tema"),
    )


@router.post("", response_model=SessionResponse, status_code=201)
def create_session(
    fecha: str,
    semana: int,
    materia: str,
    grado: str,
    tema: str,
    hora_inicio: str = "",
    hora_fin: str = "",
    current_user: dict = Depends(get_current_teacher),
):
    """Create a new session."""
    session_id = crear_sesion(
        semana=semana,
        materia=materia,
        grado=grado,
        tema=tema,
        hora_inicio=hora_inicio,
        hora_fin=hora_fin,
        fecha=fecha,
    )
    return SessionResponse(
        session_id=session_id,
        fecha=fecha,
        semana=semana,
        materia=materia,
        grado=grado,
        tema=tema,
    )


@router.get("/{sesion_id}/micro-objetivos", response_model=list[dict])
def get_objetivos(sesion_id: int, current_user: dict = Depends(get_current_teacher)):
    """Get micro-objetivos for a session."""
    return get_micro_objetivos(sesion_id)


@router.post("/{sesion_id}/micro-objetivos")
def save_objetivos(
    sesion_id: int,
    objetivos: list[dict],
    origen_semana: Optional[int] = None,
    current_user: dict = Depends(get_current_teacher),
):
    """Save micro-objetivos for a session."""
    guardar_micro_objetivos(sesion_id, objetivos, origen_semana)
    return {"status": "ok"}


@router.patch("/micro-objetivos/{objetivo_id}")
def mark_objetivo(
    objetivo_id: int,
    completado: bool,
    current_user: dict = Depends(get_current_teacher),
):
    """Mark a micro-objetivo as completed or not."""
    marcar_objetivo(objetivo_id, completado)
    return {"status": "ok"}


@router.post("/micro-objetivos/marcar-multiples")
def mark_multiple_objetivos(
    objetivo_ids: list[int],
    completado: bool,
    current_user: dict = Depends(get_current_teacher),
):
    """Mark multiple micro-objetivos at once."""
    marcar_multiples(objetivo_ids, completado)
    return {"status": "ok"}
