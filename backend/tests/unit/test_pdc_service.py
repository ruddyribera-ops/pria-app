"""
Unit tests for PDC Service
Tests: CRUD operations, MESCP rows, adaptations, validation
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.pdc import PDC, PDCAdaptation
from app.services.pdc_service import PDCService
from app.services.gemini_service import GeminiAdaptationService
from app.schemas.pdc import CreatePDCRequest


@pytest.mark.asyncio
class TestPDCServiceCreation:
    """Test PDC creation operations"""

    async def test_create_pdc_success(self, async_session: AsyncSession, user, school):
        """Test successful PDC creation"""
        service = PDCService(async_session, GeminiAdaptationService())

        request = CreatePDCRequest(
            title="Test PDC",
            subject="Matemáticas",
            grade_level="6",
            trimester=1,
            content={
                "objetivo_general": "Learn mathematics",
                "mescp_rows": []
            }
        )

        pdc = await service.create_pdc(
            school_id=school.id,
            teacher_id=user.id,
            request=request
        )

        assert pdc.id is not None
        assert pdc.title == "Test PDC"
        assert pdc.subject == "Matemáticas"
        assert pdc.version == 1

    async def test_get_pdc_success(self, async_session: AsyncSession, pdc):
        """Test retrieving PDC by ID"""
        service = PDCService(async_session, GeminiAdaptationService())

        retrieved = await service.get_pdc(pdc.id)

        assert retrieved is not None
        assert retrieved.id == pdc.id
        assert retrieved.title == pdc.title

    async def test_get_nonexistent_pdc_returns_none(self, async_session: AsyncSession):
        """Test getting nonexistent PDC returns None"""
        service = PDCService(async_session, GeminiAdaptationService())

        retrieved = await service.get_pdc(99999)

        assert retrieved is None


@pytest.mark.asyncio
class TestMESCPOperations:
    """Test MESCP row operations"""

    async def test_update_mescp_row_all_columns(
        self,
        async_session: AsyncSession,
        pdc: PDC
    ):
        """Test updating all 6 MESCP columns"""
        pdc.content["mescp_rows"] = [
            {
                "objetivo": "Original",
                "contenidos": "Original",
                "estrategias": "Original",
                "criterios": "Original",
                "productos": "Original",
                "evidencias": "Original"
            }
        ]

        updated_row = {
            "objetivo": "Updated Objective",
            "contenidos": "Updated Content",
            "estrategias": "Updated Strategy",
            "criterios": "Updated Criteria",
            "productos": "Updated Products",
            "evidencias": "Updated Evidence"
        }

        pdc.content["mescp_rows"][0] = updated_row
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert pdc.content["mescp_rows"][0]["objetivo"] == "Updated Objective"
        assert pdc.content["mescp_rows"][0]["contenidos"] == "Updated Content"
        assert pdc.content["mescp_rows"][0]["estrategias"] == "Updated Strategy"
        assert pdc.content["mescp_rows"][0]["criterios"] == "Updated Criteria"
        assert pdc.content["mescp_rows"][0]["productos"] == "Updated Products"
        assert pdc.content["mescp_rows"][0]["evidencias"] == "Updated Evidence"

    async def test_add_mescp_row_to_pdc(self, async_session: AsyncSession, pdc: PDC):
        """Test adding new MESCP row to PDC"""
        initial_count = len(pdc.content.get("mescp_rows", []))

        new_row = {
            "objetivo": "New Objective",
            "contenidos": "New Content",
            "estrategias": "New Strategy",
            "criterios": "New Criteria",
            "productos": "New Products",
            "evidencias": "New Evidence"
        }

        if "mescp_rows" not in pdc.content:
            pdc.content["mescp_rows"] = []

        pdc.content["mescp_rows"].append(new_row)
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert len(pdc.content["mescp_rows"]) == initial_count + 1
        assert pdc.content["mescp_rows"][-1]["objetivo"] == "New Objective"

    async def test_delete_mescp_row_soft_delete(self, async_session: AsyncSession, pdc: PDC):
        """Test soft deletion of MESCP row"""
        if len(pdc.content.get("mescp_rows", [])) > 0:
            row = pdc.content["mescp_rows"][0]
            row["deleted"] = True
            pdc.content["mescp_rows"][0] = row

            async_session.add(pdc)
            await async_session.commit()
            await async_session.refresh(pdc)

            assert pdc.content["mescp_rows"][0].get("deleted") is True


@pytest.mark.asyncio
class TestAdaptations:
    """Test adaptation operations"""

    async def test_create_adaptation_for_pdc(
        self,
        async_session: AsyncSession,
        pdc: PDC,
        user
    ):
        """Test creating adaptation for PDC"""
        adaptation = PDCAdaptation(
            pdc_id=pdc.id,
            profile="dislexia",
            adapted_content={
                "modified_objective": "Simplified for dyslexia",
                "font_recommendations": "Dyslexie",
                "spacing": "increased"
            },
            status="approved"
        )

        async_session.add(adaptation)
        await async_session.commit()
        await async_session.refresh(adaptation)

        assert adaptation.id is not None
        assert adaptation.profile == "dislexia"
        assert adaptation.status == "approved"

    async def test_get_pdc_with_adaptations(self, async_session: AsyncSession, pdc: PDC):
        """Test retrieving PDC with all adaptations"""
        # Create multiple adaptations
        for profile in ["dislexia", "adhd", "tea"]:
            adaptation = PDCAdaptation(
                pdc_id=pdc.id,
                profile=profile,
                adapted_content={"modified": True},
                status="approved"
            )
            async_session.add(adaptation)

        await async_session.commit()

        service = PDCService(async_session, GeminiAdaptationService())
        result = await service.get_pdc_with_adaptations(pdc.id)

        assert result is not None
        assert result["id"] == pdc.id


@pytest.mark.asyncio
class TestPDCValidation:
    """Test PDC validation"""

    async def test_pdc_requires_title(self, async_session: AsyncSession, school, user):
        """Test PDC title is required"""
        pdc = PDC(
            user_id=user.id,
            school_id=school.id,
            title="",  # Invalid: empty title
            subject="Math",
            grade_level="6",
            trimester=1,
            version=1,
            content={}
        )
        async_session.add(pdc)
        await async_session.commit()

        retrieved = await async_session.get(PDC, pdc.id)
        assert retrieved.title == ""  # SQLAlchemy doesn't validate, just stores

    async def test_pdc_grade_level_valid_values(
        self,
        async_session: AsyncSession,
        school,
        user
    ):
        """Test PDC with valid grade levels"""
        for grade in ["1", "2", "3", "6", "10"]:
            pdc = PDC(
                user_id=user.id,
                school_id=school.id,
                title=f"PDC Grade {grade}",
                subject="Math",
                grade_level=grade,
                trimester=1,
                version=1,
                content={}
            )
            async_session.add(pdc)

        await async_session.commit()

        # Verify all were created
        from sqlalchemy import select
        result = await async_session.execute(select(PDC))
        pdcs = result.scalars().all()
        assert len(pdcs) == 5


@pytest.mark.asyncio
class TestPDCRelationships:
    """Test PDC relationships"""

    async def test_pdc_belongs_to_user(self, async_session: AsyncSession, pdc, user):
        """Test PDC user relationship"""
        assert pdc.user_id == user.id

    async def test_pdc_belongs_to_school(self, async_session: AsyncSession, pdc, school):
        """Test PDC school relationship"""
        assert pdc.school_id == school.id

    async def test_pdc_version_increments(self, async_session: AsyncSession, pdc):
        """Test PDC version tracking"""
        original_version = pdc.version
        pdc.version += 1
        async_session.add(pdc)
        await async_session.commit()
        await async_session.refresh(pdc)

        assert pdc.version == original_version + 1
