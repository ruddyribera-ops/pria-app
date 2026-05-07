"""
Planning module routes (weekly plans, momentos, micro-objectives)
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.models.pdc import PDC, WeeklyPlan
from app.models.momento import Momento
from app.models.microobjetivo import MicroObjetivo
from app.models.calendario_escolar import CalendarioEscolar
from app.models.user import User
from app.auth.routes import get_current_user
from app.services.planning_service import PlanningService
from app.services.microobjetivos_service import MicroObjetivosService
from app.schemas.planning import (
    CreateWeekRequest, UpdateWeekRequest, MomentoRequest,
    MicroObjetivoRequest, WeeklyPlanResponse, MomentoResponse,
    GenerateWeekRequest, GenerationJobResponse, CalendarEventResponse,
    CopyWeekRequest
)
from app.tasks.planning_tasks import generate_weekly_plans, copy_week_task
from app.services.errors import ContentValidationError

router = APIRouter(prefix="/api/planning", tags=["planning"])


# ============================================================================
# CALENDAR ENDPOINTS
# ============================================================================

@router.get("/calendar", response_model=List[CalendarEventResponse])
async def get_calendar(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get school calendar for Las Palmas 2026.

    Returns vacation weeks, holidays, and school events.
    """
    planning_service = PlanningService(db)
    return await planning_service.get_calendar()


# ============================================================================
# WEEKLY PLAN ENDPOINTS
# ============================================================================

@router.get("/pdc/{pdc_id}/weeks", response_model=List[WeeklyPlanResponse])
async def list_weekly_plans(
    pdc_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all weekly plans (16 weeks) for a PDC.

    Returns plans sorted by week number (15-30).
    """
    try:
        # Verify user owns this PDC
        pdc_result = await db.execute(
            select(PDC).where(PDC.id == pdc_id, PDC.user_id == current_user.id)
        )
        if not pdc_result.scalars().first():
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="PDC not found"
            )

        planning_service = PlanningService(db)
        plans = await planning_service.get_weekly_plans(pdc_id)
        return [WeeklyPlanResponse.from_attributes(p) for p in plans]

    except ContentValidationError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.post("/pdc/{pdc_id}/weeks", response_model=WeeklyPlanResponse, status_code=status.HTTP_201_CREATED)
async def create_weekly_plan(
    pdc_id: int,
    request: CreateWeekRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a new blank weekly plan for a PDC."""
    try:
        # Verify user owns this PDC
        pdc_result = await db.execute(
            select(PDC).where(PDC.id == pdc_id, PDC.user_id == current_user.id)
        )
        if not pdc_result.scalars().first():
            raise HTTPException(status_code=404, detail="PDC not found")

        planning_service = PlanningService(db)
        plan = await planning_service.create_weekly_plan(
            pdc_id=pdc_id,
            week_number=request.week_number,
            subject=request.subject,
            grade_level=request.grade_level,
            status=request.status
        )
        await db.commit()
        return WeeklyPlanResponse.from_attributes(plan)

    except ContentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/week/{week_id}", response_model=WeeklyPlanResponse)
async def get_weekly_plan(
    week_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get a weekly plan with all momentos and micro-objectives."""
    try:
        # Verify user access
        plan_result = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == week_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        plan = plan_result.scalars().first()
        if not plan:
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        planning_service = PlanningService(db)
        plan_full = await planning_service.get_week_with_momentos(week_id)
        return WeeklyPlanResponse.from_attributes(plan_full)

    except ContentValidationError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/week/{week_id}", response_model=WeeklyPlanResponse)
async def update_weekly_plan(
    week_id: int,
    request: UpdateWeekRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a weekly plan's metadata (subject, grade, status)."""
    try:
        # Verify user access
        plan_result = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == week_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not plan_result.scalars().first():
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        planning_service = PlanningService(db)
        plan = await planning_service.update_weekly_plan(week_id, request)
        await db.commit()
        return WeeklyPlanResponse.from_attributes(plan)

    except ContentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/week/{week_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_weekly_plan(
    week_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a weekly plan (soft delete)."""
    try:
        # Verify user access
        plan_result = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == week_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not plan_result.scalars().first():
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        planning_service = PlanningService(db)
        await planning_service.delete_weekly_plan(week_id)
        await db.commit()
        return None

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================================
# MOMENTO ENDPOINTS (Inicio, Desarrollo, Cierre)
# ============================================================================

@router.post("/week/{week_id}/momentos", response_model=MomentoResponse, status_code=status.HTTP_201_CREATED)
async def create_momento(
    week_id: int,
    request: MomentoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create a momento (learning phase) for a weekly plan."""
    try:
        # Verify user access
        plan_result = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == week_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not plan_result.scalars().first():
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        # Determine order based on nombre
        order_map = {"Inicio": 1, "Desarrollo": 2, "Cierre": 3}
        order = order_map.get(request.nombre, 1)

        planning_service = PlanningService(db)
        momento = await planning_service.add_momento(week_id, order, request)
        await db.commit()
        return MomentoResponse.from_attributes(momento)

    except ContentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.put("/momentos/{momento_id}", response_model=MomentoResponse)
async def update_momento(
    momento_id: int,
    request: MomentoRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update a momento's content."""
    try:
        # Verify user access
        momento_result = await db.execute(
            select(Momento)
            .where(Momento.id == momento_id)
            .join(WeeklyPlan)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not momento_result.scalars().first():
            raise HTTPException(status_code=404, detail="Momento not found")

        planning_service = PlanningService(db)
        momento = await planning_service.update_momento(momento_id, request)
        await db.commit()
        return MomentoResponse.from_attributes(momento)

    except ContentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.delete("/momentos/{momento_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_momento(
    momento_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Delete a momento."""
    try:
        # Verify user access
        momento_result = await db.execute(
            select(Momento)
            .where(Momento.id == momento_id)
            .join(WeeklyPlan)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not momento_result.scalars().first():
            raise HTTPException(status_code=404, detail="Momento not found")

        planning_service = PlanningService(db)
        await planning_service.delete_momento(momento_id)
        await db.commit()
        return None

    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================================
# MICRO-OBJECTIVES ENDPOINTS
# ============================================================================

@router.get("/week/{week_id}/micro-objetivos", response_model=List)
async def get_micro_objetivos(
    week_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get all micro-objectives for a weekly plan with dependency information."""
    try:
        # Verify user access
        plan_result = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == week_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        if not plan_result.scalars().first():
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        service = MicroObjetivosService(db)
        objectives = await service.get_micro_objetivos(week_id)
        blocked = await service.check_blocked_objectives(week_id)

        return {
            "objectives": objectives,
            "blocked": blocked
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================================
# AUTO-GENERATION ENDPOINT
# ============================================================================

@router.post("/pdc/{pdc_id}/auto-generate", response_model=GenerationJobResponse)
async def auto_generate_weekly_plans(
    pdc_id: int,
    request: GenerateWeekRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Enqueue Celery task to generate all 16 weekly plans.

    Returns job_id for polling progress.
    """
    try:
        # Verify user owns this PDC
        pdc_result = await db.execute(
            select(PDC).where(PDC.id == pdc_id, PDC.user_id == current_user.id)
        )
        if not pdc_result.scalars().first():
            raise HTTPException(status_code=404, detail="PDC not found")

        # Enqueue task
        task = generate_weekly_plans.delay(pdc_id)

        return GenerationJobResponse(
            job_id=task.id,
            status="queued",
            progress=0,
            weeks_total=16
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@router.get("/pdc/{pdc_id}/generation-status/{job_id}", response_model=GenerationJobResponse)
async def get_generation_status(
    pdc_id: int,
    job_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get status of weekly plan generation job.

    Polls Celery task for progress.
    """
    try:
        # Verify user owns this PDC
        pdc_result = await db.execute(
            select(PDC).where(PDC.id == pdc_id, PDC.user_id == current_user.id)
        )
        if not pdc_result.scalars().first():
            raise HTTPException(status_code=404, detail="PDC not found")

        task = generate_weekly_plans.AsyncResult(job_id)

        if task.state == 'PENDING':
            return GenerationJobResponse(job_id=job_id, status="queued", progress=0)
        elif task.state == 'PROGRESS':
            return GenerationJobResponse(
                job_id=job_id,
                status="processing",
                progress=task.info.get('progress', 0),
                weeks_completed=task.info.get('current', 0),
                weeks_total=task.info.get('total', 16)
            )
        elif task.state == 'SUCCESS':
            return GenerationJobResponse(
                job_id=job_id,
                status="complete",
                progress=100,
                weeks_completed=task.result.get('weeks_created', 16),
                weeks_total=task.result.get('weeks_total', 16)
            )
        else:
            return GenerationJobResponse(job_id=job_id, status="failed", progress=0)

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


# ============================================================================
# COPY WEEK ENDPOINT
# ============================================================================

@router.post("/week/{source_id}/copy-to/{target_id}", status_code=status.HTTP_200_OK)
async def copy_week(
    source_id: int,
    target_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Copy all momentos from one week to another."""
    try:
        # Verify user access to both weeks
        source = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == source_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )
        target = await db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == target_id)
            .join(PDC)
            .where(PDC.user_id == current_user.id)
        )

        if not source.scalars().first() or not target.scalars().first():
            raise HTTPException(status_code=404, detail="Weekly plan not found")

        planning_service = PlanningService(db)
        await planning_service.copy_week(source_id, target_id)
        await db.commit()

        return {
            "status": "success",
            "message": f"Copied week {source_id} to {target_id}"
        }

    except ContentValidationError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        await db.rollback()
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")
