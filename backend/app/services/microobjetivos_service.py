"""
Micro-Objectives Service for PRIA v7
SMART micro-objective generation and dependency tracking
"""
from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.models.microobjetivo import MicroObjetivo
from app.models.weekly_plan import WeeklyPlan
from app.models.momento import Momento
from app.schemas.planning import MicroObjetivoRequest, MicroObjetivoResponse
from app.services.errors import ContentValidationError


class MicroObjetivosService:
    """Service for managing micro-objectives and their dependencies."""

    def __init__(self, db: AsyncSession):
        """Initialize microobjetivos service.

        Args:
            db: SQLAlchemy async session
        """
        self.db = db

    async def get_micro_objetivos(self, weekly_plan_id: int) -> List[MicroObjetivo]:
        """Get all micro-objectives for a weekly plan.

        Args:
            weekly_plan_id: Weekly plan identifier

        Returns:
            List of MicroObjetivo ordered by priority
        """
        result = await self.db.execute(
            select(MicroObjetivo)
            .where(MicroObjetivo.weekly_plan_id == weekly_plan_id)
            .order_by(
                MicroObjetivo.prioridad.desc(),
                MicroObjetivo.created_at
            )
        )
        return result.scalars().all()

    async def create_micro_objetivo(
        self,
        weekly_plan_id: int,
        data: MicroObjetivoRequest,
        momento_id: Optional[int] = None
    ) -> MicroObjetivo:
        """Create a new micro-objective.

        Args:
            weekly_plan_id: Weekly plan identifier
            data: Micro-objective data
            momento_id: Optional momento to associate with

        Returns:
            Created MicroObjetivo

        Raises:
            ContentValidationError: If plan or momento doesn't exist
        """
        # Verify plan exists
        plan_result = await self.db.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == weekly_plan_id)
        )
        if not plan_result.scalars().first():
            raise ContentValidationError(f"Weekly plan {weekly_plan_id} not found")

        # Verify momento if provided
        if momento_id:
            momento_result = await self.db.execute(
                select(Momento).where(Momento.id == momento_id)
            )
            if not momento_result.scalars().first():
                raise ContentValidationError(f"Momento {momento_id} not found")

        # Verify parent dependency exists if provided
        if data.depende_de:
            parent_result = await self.db.execute(
                select(MicroObjetivo).where(MicroObjetivo.id == data.depende_de)
            )
            if not parent_result.scalars().first():
                raise ContentValidationError(f"Parent objective {data.depende_de} not found")

        objetivo = MicroObjetivo(
            weekly_plan_id=weekly_plan_id,
            momento_id=momento_id,
            texto=data.texto,
            verificable=data.verificable,
            prioridad=data.prioridad,
            depende_de=data.depende_de,
            origin_week=None  # Set when imported from another week
        )
        self.db.add(objetivo)
        await self.db.flush()
        return objetivo

    async def update_completado(
        self,
        objetivo_id: int,
        completado: bool
    ) -> MicroObjetivo:
        """Mark a micro-objective as complete/incomplete.

        Args:
            objetivo_id: Micro-objective identifier
            completado: Completion status

        Returns:
            Updated MicroObjetivo

        Raises:
            ContentValidationError: If objective doesn't exist
        """
        obj_result = await self.db.execute(
            select(MicroObjetivo).where(MicroObjetivo.id == objetivo_id)
        )
        objetivo = obj_result.scalars().first()
        if not objetivo:
            raise ContentValidationError(f"Micro-objective {objetivo_id} not found")

        objetivo.completado = completado
        objetivo.updated_at = datetime.utcnow()
        await self.db.flush()
        return objetivo

    async def get_dependencies(self, objetivo_id: int) -> List[MicroObjetivo]:
        """Get all objectives that depend on this one.

        Args:
            objetivo_id: Micro-objective identifier

        Returns:
            List of dependent objectives

        Raises:
            ContentValidationError: If objective doesn't exist
        """
        # Verify objective exists
        obj_result = await self.db.execute(
            select(MicroObjetivo).where(MicroObjetivo.id == objetivo_id)
        )
        if not obj_result.scalars().first():
            raise ContentValidationError(f"Micro-objective {objetivo_id} not found")

        # Get dependents
        result = await self.db.execute(
            select(MicroObjetivo).where(MicroObjetivo.depende_de == objetivo_id)
        )
        return result.scalars().all()

    async def check_blocked_objectives(
        self,
        weekly_plan_id: int
    ) -> List[Dict[str, Any]]:
        """Return objectives blocked by incomplete dependencies.

        Args:
            weekly_plan_id: Weekly plan identifier

        Returns:
            List of blocked objectives with their blockers
        """
        # Get all objectives for this plan
        all_objs_result = await self.db.execute(
            select(MicroObjetivo)
            .where(MicroObjetivo.weekly_plan_id == weekly_plan_id)
            .options(joinedload(MicroObjetivo.micro_objetivos_dependencias))
        )
        all_objectives = all_objs_result.unique().scalars().all()

        blocked = []
        for obj in all_objectives:
            if obj.depende_de:
                # Get parent
                parent_result = await self.db.execute(
                    select(MicroObjetivo).where(MicroObjetivo.id == obj.depende_de)
                )
                parent = parent_result.scalars().first()

                # Check if parent is complete
                if parent and not parent.completado:
                    blocked.append({
                        "objetivo_id": obj.id,
                        "texto": obj.texto,
                        "bloqueado_por": parent.id,
                        "parent_texto": parent.texto,
                        "parent_completado": parent.completado
                    })

        return blocked

    async def delete_micro_objetivo(self, objetivo_id: int) -> bool:
        """Delete a micro-objective.

        Args:
            objetivo_id: Micro-objective identifier

        Returns:
            True if deleted, False if not found
        """
        obj_result = await self.db.execute(
            select(MicroObjetivo).where(MicroObjetivo.id == objetivo_id)
        )
        objetivo = obj_result.scalars().first()
        if not objetivo:
            return False

        await self.db.delete(objetivo)
        await self.db.flush()
        return True

    @staticmethod
    def generate_smart_objectives_from_content(
        content: str,
        momento_name: str = "General"
    ) -> List[str]:
        """Generate SMART micro-objectives from lesson content (template).

        This is a simple template generator. In production, this would call Gemini
        to intelligently parse content and extract SMART objectives.

        Args:
            content: Lesson content text
            momento_name: Name of the momento (Inicio, Desarrollo, Cierre)

        Returns:
            List of SMART objective texts
        """
        # Template examples - in production, these would be generated by Gemini
        templates = {
            "Inicio": [
                "Students will recall prior knowledge about the topic",
                "Students will express interest and motivation for learning",
                "Students will ask clarifying questions about objectives"
            ],
            "Desarrollo": [
                "Students will explain the main concepts with concrete examples",
                "Students will apply the concept to new situations",
                "Students will practice with guided exercises",
                "Students will demonstrate understanding through activities"
            ],
            "Cierre": [
                "Students will summarize key learning points",
                "Students will reflect on their own learning progress",
                "Students will identify remaining questions or confusions"
            ]
        }

        return templates.get(momento_name, templates["Desarrollo"])
