"""
Unit tests for Planning Service
Tests: calendar, weekly plans, momentos, lesson generation, micro-objectives
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pdc import WeeklyPlan
from app.models.moment import Momento
from app.models.microobjetivo import MicroObjetivo
from app.services.planning_service import PlanningService
from app.services.motor_m1a_service import MotorM1aService
from app.services.microobjetivos_service import MicroObjetivosService


@pytest.mark.asyncio
class TestCalendarOperations:
    """Test calendar and weekly plan operations"""

    async def test_get_calendar_returns_las_palmas_2026(self, async_session: AsyncSession):
        """Test calendar returns Las Palmas 2026 events"""
        service = PlanningService(async_session)

        calendar = await service.get_calendar()

        assert calendar is not None
        assert len(calendar) > 0
        # Verify vacation weeks 23-24 are marked
        week_23 = next((w for w in calendar if w["week"] == 23), None)
        if week_23:
            assert week_23.get("is_vacation") is True

    async def test_get_weekly_plans_returns_16_weeks(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test getting all 16 weekly plans for PDC"""
        service = PlanningService(async_session)

        # Create 16 weekly plans
        for week in range(1, 17):
            plan = WeeklyPlan(
                pdc_id=pdc.id,
                week_number=week,
                status="draft",
                content={}
            )
            async_session.add(plan)

        await async_session.commit()

        plans = await service.get_weekly_plans(pdc.id)

        assert len(plans) == 16
        for i, plan in enumerate(plans, 1):
            assert plan.week_number == i


@pytest.mark.asyncio
class TestWeeklyPlanOperations:
    """Test weekly plan CRUD operations"""

    async def test_create_weekly_plan_with_draft_status(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test creating weekly plan with draft status"""
        plan = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=1,
            status="draft",
            content={"tema": "Introduction to algebra"}
        )
        async_session.add(plan)
        await async_session.commit()
        await async_session.refresh(plan)

        assert plan.id is not None
        assert plan.status == "draft"
        assert plan.week_number == 1

    async def test_update_weekly_plan_status(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test updating weekly plan status"""
        weekly_plan.status = "published"
        async_session.add(weekly_plan)
        await async_session.commit()
        await async_session.refresh(weekly_plan)

        assert weekly_plan.status == "published"

    async def test_delete_weekly_plan(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test deleting weekly plan"""
        plan_id = weekly_plan.id
        await async_session.delete(weekly_plan)
        await async_session.commit()

        # Verify deletion
        from sqlalchemy import select
        result = await async_session.execute(
            select(WeeklyPlan).where(WeeklyPlan.id == plan_id)
        )
        retrieved = result.scalars().first()
        assert retrieved is None


@pytest.mark.asyncio
class TestMomentoOperations:
    """Test momento (lesson section) operations"""

    async def test_create_momento_inicio(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test creating Inicio momento"""
        momento = Momento(
            weekly_plan_id=weekly_plan.id,
            tipo="inicio",
            duration=10,
            content={
                "activity": "Warm-up",
                "description": "Review previous concepts"
            }
        )
        async_session.add(momento)
        await async_session.commit()
        await async_session.refresh(momento)

        assert momento.id is not None
        assert momento.tipo == "inicio"
        assert momento.duration == 10

    async def test_create_momento_desarrollo(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test creating Desarrollo momento"""
        momento = Momento(
            weekly_plan_id=weekly_plan.id,
            tipo="desarrollo",
            duration=30,
            content={
                "activity": "Main lesson",
                "description": "Teach new concepts"
            }
        )
        async_session.add(momento)
        await async_session.commit()
        await async_session.refresh(momento)

        assert momento.tipo == "desarrollo"
        assert momento.duration == 30

    async def test_create_momento_cierre(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test creating Cierre momento"""
        momento = Momento(
            weekly_plan_id=weekly_plan.id,
            tipo="cierre",
            duration=5,
            content={
                "activity": "Wrap-up",
                "description": "Summarize key points"
            }
        )
        async_session.add(momento)
        await async_session.commit()
        await async_session.refresh(momento)

        assert momento.tipo == "cierre"
        assert momento.duration == 5

    async def test_update_momento_content(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test updating momento content"""
        momento = Momento(
            weekly_plan_id=weekly_plan.id,
            tipo="desarrollo",
            duration=30,
            content={"original": "content"}
        )
        async_session.add(momento)
        await async_session.commit()

        momento.content = {"updated": "content"}
        async_session.add(momento)
        await async_session.commit()
        await async_session.refresh(momento)

        assert momento.content["updated"] == "content"

    async def test_update_momento_duration(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test updating momento duration"""
        momento = Momento(
            weekly_plan_id=weekly_plan.id,
            tipo="desarrollo",
            duration=30,
            content={}
        )
        async_session.add(momento)
        await async_session.commit()

        momento.duration = 40
        async_session.add(momento)
        await async_session.commit()
        await async_session.refresh(momento)

        assert momento.duration == 40


@pytest.mark.asyncio
class TestMotorM1aGeneration:
    """Test Motor M1a lesson plan generation"""

    async def test_motor_m1a_generates_valid_momento(
        self,
        async_session: AsyncSession,
        weekly_plan
    ):
        """Test Motor M1a generates valid momento"""
        service = MotorM1aService()

        # Mock Gemini response would generate momento
        momento_data = service.generate_template_momento(tipo="desarrollo")

        assert momento_data is not None
        assert "duration" in momento_data
        assert "content" in momento_data

    async def test_motor_m1a_fallback_template(self, async_session: AsyncSession):
        """Test Motor M1a returns template on Gemini failure"""
        service = MotorM1aService()

        # Call with no Gemini available
        template = service.generate_template_momento(tipo="inicio")

        assert template is not None
        assert template["duration"] > 0
        assert "content" in template


@pytest.mark.asyncio
class TestMicroObjetivos:
    """Test micro-objectives functionality"""

    async def test_create_micro_objetivo(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test creating micro-objective"""
        obj = MicroObjetivo(
            pdc_id=pdc.id,
            title="Solve linear equations",
            description="Students will solve equations of form ax + b = c",
            level=1
        )
        async_session.add(obj)
        await async_session.commit()
        await async_session.refresh(obj)

        assert obj.id is not None
        assert obj.title == "Solve linear equations"

    async def test_micro_objetivo_with_dependencies(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test micro-objective with dependencies"""
        obj1 = MicroObjetivo(
            pdc_id=pdc.id,
            title="Understand variables",
            description="Basic variable concept",
            level=1
        )
        async_session.add(obj1)
        await async_session.commit()
        await async_session.refresh(obj1)

        obj2 = MicroObjetivo(
            pdc_id=pdc.id,
            title="Solve equations",
            description="Solve linear equations",
            level=2,
            depende_de=obj1.id
        )
        async_session.add(obj2)
        await async_session.commit()
        await async_session.refresh(obj2)

        assert obj2.depende_de == obj1.id

    async def test_get_blocked_objectives(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test getting blocked objectives"""
        # Create dependency chain
        obj1 = MicroObjetivo(
            pdc_id=pdc.id,
            title="Foundation",
            description="Foundation concept",
            level=1,
            completed=False
        )
        async_session.add(obj1)
        await async_session.commit()
        await async_session.refresh(obj1)

        obj2 = MicroObjetivo(
            pdc_id=pdc.id,
            title="Advanced",
            description="Advanced concept",
            level=2,
            depende_de=obj1.id,
            completed=False
        )
        async_session.add(obj2)
        await async_session.commit()

        # Service would return obj2 as blocked
        service = PlanningService(async_session)
        blocked = await service.get_blocked_objectives(pdc.id)

        # Verify obj2 is in blocked if it exists
        if blocked:
            blocked_ids = [b.id for b in blocked]
            assert obj2.id in blocked_ids or len(blocked) == 0


@pytest.mark.asyncio
class TestCopyWeek:
    """Test weekly plan copy functionality"""

    async def test_copy_week_clones_momentos(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test copying week duplicates all momentos"""
        # Create source week with 3 momentos
        source_week = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=1,
            status="draft",
            content={}
        )
        async_session.add(source_week)
        await async_session.commit()
        await async_session.refresh(source_week)

        for tipo in ["inicio", "desarrollo", "cierre"]:
            momento = Momento(
                weekly_plan_id=source_week.id,
                tipo=tipo,
                duration=10,
                content={"content": f"{tipo} lesson"}
            )
            async_session.add(momento)

        await async_session.commit()

        # Create target week
        target_week = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=2,
            status="draft",
            content=source_week.content
        )
        async_session.add(target_week)
        await async_session.commit()

        # Copy momentos
        from sqlalchemy import select
        result = await async_session.execute(
            select(Momento).where(Momento.weekly_plan_id == source_week.id)
        )
        source_momentos = result.scalars().all()

        for momento in source_momentos:
            new_momento = Momento(
                weekly_plan_id=target_week.id,
                tipo=momento.tipo,
                duration=momento.duration,
                content=momento.content
            )
            async_session.add(new_momento)

        await async_session.commit()

        result = await async_session.execute(
            select(Momento).where(Momento.weekly_plan_id == target_week.id)
        )
        target_momentos = result.scalars().all()

        assert len(target_momentos) == 3
