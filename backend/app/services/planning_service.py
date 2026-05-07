"""
Planning Service for PRIA v7 - Weekly plan management
Handles creation, updating, and retrieval of weekly plans and moments
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete
from sqlalchemy.orm import joinedload

from app.models.pdc import PDC, WeeklyPlan
from app.models.momento import Momento
from app.models.microobjetivo import MicroObjetivo
from app.models.calendario_escolar import CalendarioEscolar
from app.schemas.planning import (
    CreateWeekRequest, UpdateWeekRequest, MomentoRequest,
    MicroObjetivoRequest, WeeklyPlanResponse, MomentoResponse
)
from app.services.errors import ContentValidationError


class PlanningService:
    """Service for managing weekly plans and lesson moments."""

    def __init__(self, db: AsyncSession):
        """Initialize planning service.

        Args:
            db: SQLAlchemy async session
        """
        self.db = db

    async def get_calendar(self) -> List[CalendarioEscolar]:
        """Get school calendar for Las Palmas 2026.

        Returns:
            List of calendar events
        """
        result = await self.db.execute(
            select(CalendarioEscolar).where(
                CalendarioEscolar.escuela_id == 1  # Las Palmas school ID
            ).order_by(CalendarioEscolar.fecha)
        )
        return result.scalars().all()

    async def get_weekly_plans(self, pdc_id: int) -> List[WeeklyPlan]:
        """Get all weekly plans for a PDC.

        Args:
            pdc_id: PDC identifier

        Returns:
            List of weekly plans sorted by week number

        Raises:
            ContentValidationError: If PDC doesn't exist
        """
        # Verify PDC exists
        pdc_result = await self.db.execute(select(PDC).where(PDC.id == pdc_id))
        if not pdc_result.scalars().first():
            raise ContentValidationError(f"PDC {pdc_id} not found")

        result = await self.db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.pdc_id == pdc_id)
            .order_by(WeeklyPlan.week_number)
            .options(
                joinedload(WeeklyPlan.momentos),
                joinedload(WeeklyPlan.micro_objetivos)
            )
        )
        return result.unique().scalars().all()

    async def create_weekly_plan(
        self,
        pdc_id: int,
        week_number: int,
        subject: Optional[str] = None,
        grade_level: Optional[str] = None,
        status: str = "draft"
    ) -> WeeklyPlan:
        """Create a blank weekly plan for a specific week.

        Args:
            pdc_id: PDC identifier
            week_number: Week number (15-30)
            subject: Subject name (optional, uses PDC subject if not provided)
            grade_level: Grade level (optional)
            status: Plan status (draft, published, completed)

        Returns:
            Created WeeklyPlan object

        Raises:
            ContentValidationError: If PDC doesn't exist or week already exists
        """
        # Verify PDC exists and get its details
        pdc_result = await self.db.execute(select(PDC).where(PDC.id == pdc_id))
        pdc = pdc_result.scalars().first()
        if not pdc:
            raise ContentValidationError(f"PDC {pdc_id} not found")

        # Check if week already exists
        existing = await self.db.execute(
            select(WeeklyPlan).where(
                WeeklyPlan.pdc_id == pdc_id,
                WeeklyPlan.week_number == week_number
            )
        )
        if existing.scalars().first():
            raise ContentValidationError(
                f"Week {week_number} already exists for PDC {pdc_id}"
            )

        # Create plan
        plan = WeeklyPlan(
            pdc_id=pdc_id,
            week_number=week_number,
            subject=subject or pdc.subject,
            grade_level=grade_level or pdc.grade_level,
            status=status
        )
        self.db.add(plan)
        await self.db.flush()  # Get ID without committing
        return plan

    async def update_weekly_plan(
        self,
        plan_id: int,
        data: UpdateWeekRequest
    ) -> WeeklyPlan:
        """Update a weekly plan's metadata.

        Args:
            plan_id: Weekly plan identifier
            data: Update data

        Returns:
            Updated WeeklyPlan object

        Raises:
            ContentValidationError: If plan doesn't exist
        """
        plan_result = await self.db.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == plan_id)
        )
        plan = plan_result.scalars().first()
        if not plan:
            raise ContentValidationError(f"Weekly plan {plan_id} not found")

        update_dict = data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            if value is not None:
                setattr(plan, key, value)

        plan.updated_at = datetime.utcnow()
        await self.db.flush()
        return plan

    async def delete_weekly_plan(self, plan_id: int) -> bool:
        """Soft delete a weekly plan.

        Args:
            plan_id: Weekly plan identifier

        Returns:
            True if deleted, False if not found
        """
        plan_result = await self.db.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == plan_id)
        )
        plan = plan_result.scalars().first()
        if not plan:
            return False

        await self.db.delete(plan)
        await self.db.flush()
        return True

    async def get_week_with_momentos(self, plan_id: int) -> WeeklyPlan:
        """Get full weekly plan with all moments and micro-objectives.

        Args:
            plan_id: Weekly plan identifier

        Returns:
            WeeklyPlan with loaded relationships

        Raises:
            ContentValidationError: If plan doesn't exist
        """
        result = await self.db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == plan_id)
            .options(
                joinedload(WeeklyPlan.momentos),
                joinedload(WeeklyPlan.micro_objetivos)
            )
        )
        plan = result.unique().scalars().first()
        if not plan:
            raise ContentValidationError(f"Weekly plan {plan_id} not found")
        return plan

    async def add_momento(
        self,
        plan_id: int,
        order: int,
        data: MomentoRequest
    ) -> Momento:
        """Create a momento for a weekly plan.

        Args:
            plan_id: Weekly plan identifier
            order: Moment order (1=Inicio, 2=Desarrollo, 3=Cierre)
            data: Momento data

        Returns:
            Created Momento object

        Raises:
            ContentValidationError: If plan doesn't exist or momento exists
        """
        # Verify plan exists
        plan_result = await self.db.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == plan_id)
        )
        plan = plan_result.scalars().first()
        if not plan:
            raise ContentValidationError(f"Weekly plan {plan_id} not found")

        # Check if momento already exists at this order
        existing = await self.db.execute(
            select(Momento).where(
                Momento.weekly_plan_id == plan_id,
                Momento.order == order
            )
        )
        if existing.scalars().first():
            raise ContentValidationError(f"Momento at order {order} already exists")

        momento = Momento(
            weekly_plan_id=plan_id,
            order=order,
            nombre=data.nombre,
            duration_minutes=data.duration_minutes,
            content_text=data.content_text,
            recursos=data.recursos or [],
            evaluacion=data.evaluacion
        )
        self.db.add(momento)
        await self.db.flush()
        return momento

    async def update_momento(
        self,
        momento_id: int,
        data: MomentoRequest
    ) -> Momento:
        """Update a momento.

        Args:
            momento_id: Momento identifier
            data: Update data

        Returns:
            Updated Momento object

        Raises:
            ContentValidationError: If momento doesn't exist
        """
        momento_result = await self.db.execute(
            select(Momento).where(Momento.id == momento_id)
        )
        momento = momento_result.scalars().first()
        if not momento:
            raise ContentValidationError(f"Momento {momento_id} not found")

        momento.nombre = data.nombre
        momento.duration_minutes = data.duration_minutes
        momento.content_text = data.content_text
        momento.recursos = data.recursos or []
        momento.evaluacion = data.evaluacion
        momento.updated_at = datetime.utcnow()

        await self.db.flush()
        return momento

    async def delete_momento(self, momento_id: int) -> bool:
        """Delete a momento.

        Args:
            momento_id: Momento identifier

        Returns:
            True if deleted, False if not found
        """
        momento_result = await self.db.execute(
            select(Momento).where(Momento.id == momento_id)
        )
        momento = momento_result.scalars().first()
        if not momento:
            return False

        await self.db.delete(momento)
        await self.db.flush()
        return True

    async def copy_week(self, source_plan_id: int, target_plan_id: int) -> WeeklyPlan:
        """Copy all momentos from one week to another.

        Args:
            source_plan_id: Source weekly plan ID
            target_plan_id: Target weekly plan ID

        Returns:
            Updated target WeeklyPlan

        Raises:
            ContentValidationError: If plans don't exist
        """
        # Get source plan with momentos
        source_result = await self.db.execute(
            select(WeeklyPlan)
            .where(WeeklyPlan.id == source_plan_id)
            .options(joinedload(WeeklyPlan.momentos))
        )
        source = source_result.unique().scalars().first()
        if not source:
            raise ContentValidationError(f"Source plan {source_plan_id} not found")

        # Get target plan
        target_result = await self.db.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == target_plan_id)
        )
        target = target_result.scalars().first()
        if not target:
            raise ContentValidationError(f"Target plan {target_plan_id} not found")

        # Clone momentos
        for momento in source.momentos:
            new_momento = Momento(
                weekly_plan_id=target.id,
                order=momento.order,
                nombre=momento.nombre,
                duration_minutes=momento.duration_minutes,
                content_text=momento.content_text,
                recursos=momento.recursos or [],
                evaluacion=momento.evaluacion
            )
            self.db.add(new_momento)

        await self.db.flush()
        return target
