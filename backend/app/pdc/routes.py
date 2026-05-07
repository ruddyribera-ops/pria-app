"""
PDC (Plan de Desarrollo Curricular) routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.pdc import PDC
from app.auth.routes import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/")
async def list_pdcs(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all PDCs for current user"""
    pdcs = db.query(PDC).filter(PDC.user_id == current_user.id).all()
    return pdcs

@router.post("/")
async def create_pdc(
    pdc_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new PDC"""
    new_pdc = PDC(
        user_id=current_user.id,
        school_id=current_user.school_id,
        subject=pdc_data.get("subject"),
        grade_level=pdc_data.get("grade_level"),
        title=pdc_data.get("title"),
        description=pdc_data.get("description"),
        trimester=pdc_data.get("trimester"),
        school_year=pdc_data.get("school_year"),
        content=pdc_data.get("content", {}),
    )

    db.add(new_pdc)
    db.commit()
    db.refresh(new_pdc)
    return new_pdc

@router.get("/{pdc_id}")
async def get_pdc(
    pdc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get PDC by ID"""
    pdc = db.query(PDC).filter(
        PDC.id == pdc_id,
        PDC.user_id == current_user.id
    ).first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found"
        )

    return pdc

@router.put("/{pdc_id}")
async def update_pdc(
    pdc_id: int,
    pdc_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update PDC"""
    pdc = db.query(PDC).filter(
        PDC.id == pdc_id,
        PDC.user_id == current_user.id
    ).first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found"
        )

    # Update fields
    for key, value in pdc_data.items():
        if hasattr(pdc, key) and key != "id":
            setattr(pdc, key, value)

    pdc.version += 1
    db.commit()
    db.refresh(pdc)
    return pdc

@router.delete("/{pdc_id}")
async def delete_pdc(
    pdc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete PDC"""
    pdc = db.query(PDC).filter(
        PDC.id == pdc_id,
        PDC.user_id == current_user.id
    ).first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found"
        )

    db.delete(pdc)
    db.commit()
    return {"status": "deleted"}
