"""
api/routers/admin.py — Admin-Only Endpoints
===========================================
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from api.deps import get_current_admin
from api.schemas.auth import UserResponse
from db import (
    get_all_usuarios,
    toggle_usuario_activo,
    eliminar_usuario,
    actualizar_password,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/usuarios", response_model=list[UserResponse])
def list_usuarios(current_user: dict = Depends(get_current_admin)):
    """List all users (admin only)."""
    usuarios = get_all_usuarios()
    return [
        UserResponse(
            email=u["email"],
            nombre_completo=u.get("nombre", ""),
            nombre_hoja=u.get("nombre_hoja", ""),
            nivel=u.get("nivel", "5to primaria"),
            rol=u["rol"],
        )
        for u in usuarios
    ]


@router.patch("/usuarios/{usuario_id}/active")
def toggle_active(
    usuario_id: int,
    activo: bool,
    current_user: dict = Depends(get_current_admin),
):
    """Toggle user active status (admin only)."""
    toggle_usuario_activo(usuario_id, activo)
    return {"status": "ok"}


@router.delete("/usuarios/{usuario_id}", status_code=204)
def delete_usuario(usuario_id: int, current_user: dict = Depends(get_current_admin)):
    """Delete a user (admin only)."""
    eliminar_usuario(usuario_id)


@router.post("/usuarios/{usuario_id}/reset-password")
def reset_password(
    usuario_id: int,
    nueva_password: str,
    current_user: dict = Depends(get_current_admin),
):
    """Reset user password (admin only)."""
    # Get user email first
    from db import get_usuario_by_email

    usuarios = get_all_usuarios()
    user = next((u for u in usuarios if u.get("id") == usuario_id), None)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    actualizar_password(user["email"], nueva_password)
    return {"status": "ok"}
