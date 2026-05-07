"""
Planning (weekly plans) routes
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.pdc import WeeklyPlan, PDC
from app.auth.routes import get_current_user
from app.models.user import User

router = APIRouter()

@router.get("/pdc/{pdc_id}")
async def list_weekly_plans(
    pdc_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all weekly plans for a PDC"""
    # Verify user owns this PDC
    pdc = db.query(PDC).filter(
        PDC.id == pdc_id,
        PDC.user_id == current_user.id
    ).first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found"
        )

    weekly_plans = db.query(WeeklyPlan).filter(
        WeeklyPlan.pdc_id == pdc_id
    ).order_by(WeeklyPlan.week_number).all()

    return weekly_plans

@router.post("/pdc/{pdc_id}")
async def create_weekly_plan(
    pdc_id: int,
    plan_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new weekly plan"""
    # Verify user owns this PDC
    pdc = db.query(PDC).filter(
        PDC.id == pdc_id,
        PDC.user_id == current_user.id
    ).first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found"
        )

    new_plan = WeeklyPlan(
        pdc_id=pdc_id,
        week_number=plan_data.get("week_number"),
        start_date=plan_data.get("start_date"),
        end_date=plan_data.get("end_date"),
        lessons=plan_data.get("lessons", []),
        units_covered=plan_data.get("units_covered", []),
    )

    db.add(new_plan)
    db.commit()
    db.refresh(new_plan)
    return new_plan

@router.get("/{plan_id}")
async def get_weekly_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get weekly plan by ID"""
    plan = db.query(WeeklyPlan).join(PDC).filter(
        WeeklyPlan.id == plan_id,
        PDC.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly plan not found"
        )

    return plan

@router.put("/{plan_id}")
async def update_weekly_plan(
    plan_id: int,
    plan_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update weekly plan"""
    plan = db.query(WeeklyPlan).join(PDC).filter(
        WeeklyPlan.id == plan_id,
        PDC.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly plan not found"
        )

    for key, value in plan_data.items():
        if hasattr(plan, key) and key != "id":
            setattr(plan, key, value)

    db.commit()
    db.refresh(plan)
    return plan

@router.delete("/{plan_id}")
async def delete_weekly_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete weekly plan"""
    plan = db.query(WeeklyPlan).join(PDC).filter(
        WeeklyPlan.id == plan_id,
        PDC.user_id == current_user.id
    ).first()

    if not plan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Weekly plan not found"
        )

    db.delete(plan)
    db.commit()
    return {"status": "deleted"}
