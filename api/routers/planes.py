"""
api/routers/planes.py — Plan CRUD Endpoints
===========================================
"""

from fastapi import APIRouter, Depends, HTTPException
from typing import Optional

from api.deps import get_current_teacher
from api.schemas.plan import PlanRequest, PlanResponse
from db import get_usuario_by_email

router = APIRouter(prefix="/planes", tags=["planes"])

# Valid plan types
PLAN_TYPES = ("m0a", "m0b", "m0c", "m1a", "m1b", "m1c", "m2a", "m2b", "pdc")


def _get_user_email(current_user: dict) -> str:
    """Extract email from current user dict."""
    return current_user["email"]


@router.get("/{plan_type}", response_model=Optional[PlanResponse])
def get_plan(plan_type: str, current_user: dict = Depends(get_current_teacher)):
    """Get current user's plan for the specified plan type."""
    if plan_type not in PLAN_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Invalid plan type. Must be one of: {PLAN_TYPES}"
        )

    email = _get_user_email(current_user)

    # Look for cached result in session state
    # For now, return None - actual plan data is stored in session state on client side
    # This endpoint exists for future server-side plan storage
    return None


@router.post("/{plan_type}", response_model=PlanResponse, status_code=201)
def save_plan(
    plan_type: str,
    req: PlanRequest,
    current_user: dict = Depends(get_current_teacher),
):
    """Save plan for the authenticated user."""
    if plan_type not in PLAN_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Invalid plan type. Must be one of: {PLAN_TYPES}"
        )

    # For now, plans are stored client-side in session state
    # This endpoint exists for future server-side plan storage
    return PlanResponse(
        plan_type=plan_type,
        result=req.result,
        metadata=req.metadata,
    )


@router.delete("/{plan_type}", status_code=204)
def delete_plan(plan_type: str, current_user: dict = Depends(get_current_teacher)):
    """Clear the user's plan for the specified type."""
    if plan_type not in PLAN_TYPES:
        raise HTTPException(
            status_code=400, detail=f"Invalid plan type. Must be one of: {PLAN_TYPES}"
        )
    # No-op for now - actual deletion happens client-side
