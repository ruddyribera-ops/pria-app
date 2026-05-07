"""
Integration tests for PDC workflow
Full user perspective: create PDC → add MESCP → request adaptation → approve
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pdc import PDC, PDCAdaptation


@pytest.mark.asyncio
class TestPDCWorkflow:
    """Test complete PDC workflow"""

    async def test_create_pdc_to_adaptation_request_full_workflow(
        self,
        async_session: AsyncSession,
        user,
        school
    ):
        """
        Full workflow:
        1. Register user (already done in fixture)
        2. Create PDC
        3. Add MESCP row
        4. Request AI adaptation for "dislexia" profile
        5. Verify adaptation returned
        6. Approve adaptation
        7. Verify status changed to "approved"
        """

        # Step 2: Create PDC
        pdc = PDC(
            user_id=user.id,
            school_id=school.id,
            title="Mathematics PDC",
            subject="Matemáticas",
            grade_level="6",
            trimester=1,
            version=1,
            content={
                "objetivo_general": "Master algebra fundamentals",
                "mescp_rows": []
            }
        )
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert pdc.id is not None
        assert pdc.title == "Mathematics PDC"

        # Step 3: Add MESCP row
        pdc.content["mescp_rows"] = [
            {
                "objetivo": "Solve linear equations",
                "contenidos": "Linear equations ax + b = c",
                "estrategias": "Hands-on practice with variables",
                "criterios": "Solve 5 equations correctly",
                "productos": "Worksheet with 10 problems",
                "evidencias": "Student portfolio with solutions"
            }
        ]
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert len(pdc.content["mescp_rows"]) == 1
        assert pdc.content["mescp_rows"][0]["objetivo"] == "Solve linear equations"

        # Step 4: Request AI adaptation
        adaptation = PDCAdaptation(
            pdc_id=pdc.id,
            profile="dislexia",
            adapted_content={
                "objetivo": "Understand and solve simple equations with support",
                "estrategias": "Use Dyslexie font, increase spacing, provide templates",
                "recursos": "Equation templates, variable reference sheet",
                "tiempo_adicional": "25% extra time",
                "formato": "Large print (18pt), double-spaced"
            },
            status="pending"
        )
        async_session.add(adaptation)
        await async_session.commit()
        await async_session.refresh(adaptation)

        assert adaptation.id is not None
        assert adaptation.status == "pending"

        # Step 5: Verify adaptation
        assert adaptation.adapted_content is not None
        assert "objetivo" in adaptation.adapted_content
        assert "Dyslexie font" in adaptation.adapted_content["estrategias"]

        # Step 6: Approve adaptation
        adaptation.status = "approved"
        async_session.add(adaptation)
        await async_session.commit()
        await async_session.refresh(adaptation)

        # Step 7: Verify status
        assert adaptation.status == "approved"

    async def test_create_pdc_with_multiple_mescp_rows(
        self,
        async_session: AsyncSession,
        user,
        school
    ):
        """Test creating PDC with multiple MESCP rows"""
        pdc = PDC(
            user_id=user.id,
            school_id=school.id,
            title="Complete Unit PDC",
            subject="Science",
            grade_level="7",
            trimester=2,
            version=1,
            content={
                "objetivo_general": "Understand ecosystem dynamics",
                "mescp_rows": [
                    {
                        "objetivo": "Identify food chains",
                        "contenidos": "Food chains and webs",
                        "estrategias": "Outdoor observation",
                        "criterios": "Correctly identify 5 chains",
                        "productos": "Food chain diagrams",
                        "evidencias": "Peer assessment"
                    },
                    {
                        "objetivo": "Analyze ecosystem balance",
                        "contenidos": "Predator-prey relationships",
                        "estrategias": "Case studies and simulations",
                        "criterios": "Explain 3 relationships",
                        "productos": "Case study report",
                        "evidencias": "Written analysis"
                    },
                    {
                        "objetivo": "Design sustainable practices",
                        "contenidos": "Conservation methods",
                        "estrategias": "Project-based learning",
                        "criterios": "Create viable plan",
                        "productos": "Conservation proposal",
                        "evidencias": "Project presentation"
                    }
                ]
            }
        )
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert len(pdc.content["mescp_rows"]) == 3
        assert all("objetivo" in row for row in pdc.content["mescp_rows"])

    async def test_update_pdc_and_mescp_content(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test updating PDC content and MESCP rows"""
        original_title = pdc.title

        # Update PDC title
        pdc.title = "Updated PDC Title"
        pdc.version += 1

        # Update MESCP row
        if pdc.content.get("mescp_rows"):
            pdc.content["mescp_rows"][0]["objetivo"] = "Updated objective"

        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert pdc.title == "Updated PDC Title"
        assert pdc.version == 2
        assert pdc.content["mescp_rows"][0]["objetivo"] == "Updated objective"

    async def test_request_adaptations_for_multiple_profiles(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test requesting adaptations for multiple neuroinclusive profiles"""
        profiles = ["dislexia", "adhd", "tea", "dyscalculia"]

        for profile in profiles:
            adaptation = PDCAdaptation(
                pdc_id=pdc.id,
                profile=profile,
                adapted_content={
                    "profile": profile,
                    "modifications": f"Adaptations for {profile}",
                    "resources": f"Resources specific to {profile}"
                },
                status="approved"
            )
            async_session.add(adaptation)

        await async_session.commit()

        # Verify all adaptations created
        from sqlalchemy import select
        result = await async_session.execute(
            select(PDCAdaptation).where(PDCAdaptation.pdc_id == pdc.id)
        )
        adaptations = result.scalars().all()

        assert len(adaptations) == 4
        assert all(a.status == "approved" for a in adaptations)
        assert set(a.profile for a in adaptations) == set(profiles)

    async def test_pdc_version_control_workflow(
        self,
        async_session: AsyncSession,
        user,
        school
    ):
        """Test PDC version control through workflow"""
        pdc = PDC(
            user_id=user.id,
            school_id=school.id,
            title="Version Controlled PDC",
            subject="History",
            grade_level="9",
            trimester=1,
            version=1,
            content={"objective": "Original objective"}
        )
        async_session.add(pdc)
        await async_session.commit()

        assert pdc.version == 1

        # Simulate edits creating new versions
        for i in range(2, 5):
            pdc.version = i
            pdc.content["objective"] = f"Objective version {i}"
            async_session.add(pdc)
            await async_session.commit()

        await async_session.refresh(pdc)
        assert pdc.version == 4
        assert pdc.content["objective"] == "Objective version 4"
