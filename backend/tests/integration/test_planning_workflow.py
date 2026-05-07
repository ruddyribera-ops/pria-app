"""
Integration tests for planning workflow
Full workflow: load PDC → generate weekly plans → verify momentos → check vacation weeks
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pdc import WeeklyPlan
from app.models.moment import Momento


@pytest.mark.asyncio
class TestPlanningWorkflow:
    """Test complete planning workflow"""

    async def test_generate_weekly_plans_full_flow(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """
        Full workflow:
        1. Load PDC
        2. Create 16 weekly plans
        3. Create momentos for each week
        4. Verify structure
        5. Check vacation weeks (23-24)
        """

        # Step 1: PDC already loaded (fixture)
        assert pdc.id is not None
        assert pdc.subject == "Matemáticas"

        # Step 2: Create 16 weekly plans
        for week_num in range(1, 17):
            plan = WeeklyPlan(
                pdc_id=pdc.id,
                week_number=week_num,
                status="draft",
                content={
                    "tema": f"Week {week_num} Theme",
                    "is_vacation": week_num in [23, 24]
                }
            )
            async_session.add(plan)

        await async_session.commit()

        # Verify 16 plans created
        from sqlalchemy import select
        result = await async_session.execute(
            select(WeeklyPlan).where(WeeklyPlan.pdc_id == pdc.id)
        )
        plans = result.scalars().all()
        assert len(plans) == 16

        # Step 3: Create momentos for each week
        for plan in plans:
            for tipo in ["inicio", "desarrollo", "cierre"]:
                momento = Momento(
                    weekly_plan_id=plan.id,
                    tipo=tipo,
                    duration={"inicio": 10, "desarrollo": 30, "cierre": 5}[tipo],
                    content={
                        "activity": f"{tipo.capitalize()} activity",
                        "description": f"Week {plan.week_number} {tipo}"
                    }
                )
                async_session.add(momento)

        await async_session.commit()

        # Step 4: Verify structure
        for plan in plans:
            result = await async_session.execute(
                select(Momento).where(Momento.weekly_plan_id == plan.id)
            )
            momentos = result.scalars().all()
            assert len(momentos) == 3

            tipos = {m.tipo for m in momentos}
            assert tipos == {"inicio", "desarrollo", "cierre"}

        # Step 5: Check vacation weeks
        result = await async_session.execute(
            select(WeeklyPlan).where(WeeklyPlan.pdc_id == pdc.id)
        )
        all_plans = result.scalars().all()

        vacation_weeks = [p for p in all_plans if p.content.get("is_vacation")]
        assert len(vacation_weeks) == 2

    async def test_weekly_plan_status_progression(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test weekly plan status transitions"""
        plan = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=5,
            status="draft",
            content={}
        )
        async_session.add(plan)
        await async_session.commit()
        await async_session.refresh(plan)

        # draft -> in_progress
        plan.status = "in_progress"
        async_session.add(plan)
        await async_session.commit()
        assert plan.status == "in_progress"

        # in_progress -> published
        plan.status = "published"
        async_session.add(plan)
        await async_session.commit()
        assert plan.status == "published"

        # published -> completed
        plan.status = "completed"
        async_session.add(plan)
        await async_session.commit()
        await async_session.refresh(plan)
        assert plan.status == "completed"

    async def test_momento_durations_total_45_minutes(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test momentos total 45 minutes per lesson"""
        plan = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=3,
            status="draft",
            content={}
        )
        async_session.add(plan)
        await async_session.commit()
        await async_session.refresh(plan)

        # Create 3 momentos totaling 45 minutes
        inicio = Momento(
            weekly_plan_id=plan.id,
            tipo="inicio",
            duration=10,
            content={}
        )
        desarrollo = Momento(
            weekly_plan_id=plan.id,
            tipo="desarrollo",
            duration=30,
            content={}
        )
        cierre = Momento(
            weekly_plan_id=plan.id,
            tipo="cierre",
            duration=5,
            content={}
        )

        async_session.add_all([inicio, desarrollo, cierre])
        await async_session.commit()

        # Verify total
        from sqlalchemy import select
        result = await async_session.execute(
            select(Momento).where(Momento.weekly_plan_id == plan.id)
        )
        momentos = result.scalars().all()

        total_duration = sum(m.duration for m in momentos)
        assert total_duration == 45

    async def test_copy_week_duplicates_all_momentos(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test copying week structure to another week"""
        # Create source week with momentos
        source = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=1,
            status="draft",
            content={"tema": "Unit 1"}
        )
        async_session.add(source)
        await async_session.commit()
        await async_session.refresh(source)

        # Add momentos to source
        for tipo in ["inicio", "desarrollo", "cierre"]:
            momento = Momento(
                weekly_plan_id=source.id,
                tipo=tipo,
                duration=10,
                content={"content": f"Source {tipo}"}
            )
            async_session.add(momento)

        await async_session.commit()

        # Create target week
        target = WeeklyPlan(
            pdc_id=pdc.id,
            week_number=2,
            status="draft",
            content=source.content
        )
        async_session.add(target)
        await async_session.commit()
        await async_session.refresh(target)

        # Copy momentos from source to target
        from sqlalchemy import select
        result = await async_session.execute(
            select(Momento).where(Momento.weekly_plan_id == source.id)
        )
        source_momentos = result.scalars().all()

        for src_momento in source_momentos:
            new_momento = Momento(
                weekly_plan_id=target.id,
                tipo=src_momento.tipo,
                duration=src_momento.duration,
                content=src_momento.content
            )
            async_session.add(new_momento)

        await async_session.commit()

        # Verify target has same momentos
        result = await async_session.execute(
            select(Momento).where(Momento.weekly_plan_id == target.id)
        )
        target_momentos = result.scalars().all()

        assert len(target_momentos) == 3
        for tm in target_momentos:
            assert tm.tipo in ["inicio", "desarrollo", "cierre"]

    async def test_vacation_weeks_marked_correctly(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test vacation weeks 23-24 are marked"""
        # Create all 16 weeks
        for week_num in range(15, 31):  # Las Palmas calendar weeks 15-30
            is_vacation = week_num in [23, 24]
            plan = WeeklyPlan(
                pdc_id=pdc.id,
                week_number=week_num,
                status="draft",
                content={"is_vacation": is_vacation}
            )
            async_session.add(plan)

        await async_session.commit()

        # Verify vacation weeks
        from sqlalchemy import select
        result = await async_session.execute(
            select(WeeklyPlan).where(WeeklyPlan.pdc_id == pdc.id)
        )
        plans = result.scalars().all()

        vacation_plans = [p for p in plans if p.content.get("is_vacation")]
        vacation_week_nums = {p.week_number for p in vacation_plans}

        assert 23 in vacation_week_nums
        assert 24 in vacation_week_nums
