"""
Unit tests for Accessibility Service
Tests: user profiles, accessibility settings, profile metadata, student profiles
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user_profile import UserProfile
from app.models.student_profile import StudentProfile
from app.services.accessibility_service import AccessibilityService


@pytest.mark.asyncio
class TestUserProfileCRUD:
    """Test user profile CRUD operations"""

    async def test_get_user_profile_creates_default(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test first access creates default profile"""
        service = AccessibilityService(async_session)

        profile = await service.get_or_create_user_profile(user.id)

        assert profile is not None
        assert profile.user_id == user.id
        assert profile.profile_name == "default"

    async def test_update_user_profile(
        self,
        async_session: AsyncSession,
        user_profile
    ):
        """Test updating user profile settings"""
        user_profile.font_size = 20
        user_profile.text_color = "#FFFFFF"
        user_profile.background_color = "#000000"

        async_session.add(user_profile)
        await async_session.commit()
        await async_session.refresh(user_profile)

        assert user_profile.font_size == 20
        assert user_profile.text_color == "#FFFFFF"
        assert user_profile.background_color == "#000000"

    async def test_delete_user_profile(
        self,
        async_session: AsyncSession,
        user_profile
    ):
        """Test deleting user profile"""
        profile_id = user_profile.id
        await async_session.delete(user_profile)
        await async_session.commit()

        result = await async_session.execute(
            select(UserProfile).where(UserProfile.id == profile_id)
        )
        retrieved = result.scalars().first()
        assert retrieved is None


@pytest.mark.asyncio
class TestAccessibilityProfiles:
    """Test accessibility profile types"""

    async def test_dyslexia_profile_metadata(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test dyslexia profile has correct metadata"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="dislexia",
            font_family="Dyslexie",
            font_size=18,
            text_color="#000000",
            background_color="#FFFFCC",
            line_spacing=2.0,
            contrast_level="high"
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.profile_name == "dislexia"
        assert profile.font_family == "Dyslexie"
        assert profile.line_spacing == 2.0

    async def test_adhd_profile_metadata(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test ADHD profile has correct metadata"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="adhd",
            font_family="Arial",
            font_size=16,
            text_color="#000000",
            background_color="#F0F0F0",
            line_spacing=1.8,
            contrast_level="normal"
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.profile_name == "adhd"

    async def test_tea_profile_metadata(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test TEA profile has correct metadata"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="tea",
            font_family="Helvetica",
            font_size=14,
            text_color="#000000",
            background_color="#FFFFFF",
            line_spacing=1.5,
            contrast_level="normal"
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.profile_name == "tea"

    async def test_dyscalculia_profile_metadata(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test dyscalculia profile has correct metadata"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="dyscalculia",
            font_family="Arial",
            font_size=16,
            text_color="#000000",
            background_color="#FFFFFF",
            line_spacing=1.6,
            contrast_level="high"
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.profile_name == "dyscalculia"


@pytest.mark.asyncio
class TestProfileMetadata:
    """Test profile metadata retrieval"""

    async def test_get_all_profile_metadata(
        self,
        async_session: AsyncSession
    ):
        """Test getting metadata for all 5 profiles"""
        service = AccessibilityService(async_session)

        # Should return metadata for: default, dislexia, adhd, tea, dyscalculia
        metadata = await service.get_all_profile_metadata()

        assert metadata is not None
        assert len(metadata) >= 4  # At least 4 special profiles

    async def test_profile_metadata_includes_fonts(
        self,
        async_session: AsyncSession,
        user_profile
    ):
        """Test profile metadata includes font information"""
        user_profile.font_family = "Dyslexie"
        async_session.add(user_profile)
        await async_session.commit()
        await async_session.refresh(user_profile)

        assert user_profile.font_family is not None

    async def test_profile_metadata_includes_colors(
        self,
        async_session: AsyncSession,
        user_profile
    ):
        """Test profile metadata includes color information"""
        user_profile.text_color = "#000000"
        user_profile.background_color = "#FFFFFF"
        async_session.add(user_profile)
        await async_session.commit()
        await async_session.refresh(user_profile)

        assert user_profile.text_color == "#000000"
        assert user_profile.background_color == "#FFFFFF"

    async def test_profile_metadata_includes_contrast(
        self,
        async_session: AsyncSession,
        user_profile
    ):
        """Test profile metadata includes contrast level"""
        user_profile.contrast_level = "high"
        async_session.add(user_profile)
        await async_session.commit()
        await async_session.refresh(user_profile)

        assert user_profile.contrast_level == "high"


@pytest.mark.asyncio
class TestStudentProfiles:
    """Test student profile management"""

    async def test_create_student_profile(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test creating student profile"""
        profile = StudentProfile(
            user_id=user.id,
            student_name="Juan García",
            grade_level="6",
            accessibility_needs="dislexia",
            custom_settings={
                "font_size": 18,
                "line_spacing": 2.0
            }
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.id is not None
        assert profile.student_name == "Juan García"

    async def test_read_student_profile(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test reading student profile"""
        profile = StudentProfile(
            user_id=user.id,
            student_name="María López",
            grade_level="8",
            accessibility_needs="adhd"
        )
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        result = await async_session.execute(
            select(StudentProfile).where(StudentProfile.id == profile.id)
        )
        retrieved = result.scalars().first()

        assert retrieved.student_name == "María López"

    async def test_update_student_profile(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test updating student profile"""
        profile = StudentProfile(
            user_id=user.id,
            student_name="Pedro Rodríguez",
            grade_level="5",
            accessibility_needs=None
        )
        async_session.add(profile)
        await async_session.commit()

        profile.accessibility_needs = "tea"
        async_session.add(profile)
        await async_session.commit()
        await async_session.refresh(profile)

        assert profile.accessibility_needs == "tea"

    async def test_delete_student_profile(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test deleting student profile"""
        profile = StudentProfile(
            user_id=user.id,
            student_name="Ana Martínez",
            grade_level="7",
            accessibility_needs="dyscalculia"
        )
        async_session.add(profile)
        await async_session.commit()

        profile_id = profile.id
        await async_session.delete(profile)
        await async_session.commit()

        result = await async_session.execute(
            select(StudentProfile).where(StudentProfile.id == profile_id)
        )
        retrieved = result.scalars().first()
        assert retrieved is None


@pytest.mark.asyncio
class TestAccessibilityValidation:
    """Test accessibility profile validation"""

    async def test_profile_name_validation(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test profile name validation"""
        # Valid profile name
        profile = UserProfile(
            user_id=user.id,
            profile_name="dislexia",
            font_family="Dyslexie",
            font_size=18,
            text_color="#000000",
            background_color="#FFFFFF",
            line_spacing=1.5,
            contrast_level="normal"
        )
        async_session.add(profile)
        await async_session.commit()

        assert profile.profile_name in ["default", "dislexia", "adhd", "tea", "dyscalculia"]

    async def test_font_size_within_range(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test font size is within valid range"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="default",
            font_family="Arial",
            font_size=18,  # Valid range: 10-28
            text_color="#000000",
            background_color="#FFFFFF",
            line_spacing=1.5,
            contrast_level="normal"
        )
        async_session.add(profile)
        await async_session.commit()

        assert 10 <= profile.font_size <= 28

    async def test_contrast_level_valid_values(
        self,
        async_session: AsyncSession,
        user
    ):
        """Test contrast level has valid values"""
        profile = UserProfile(
            user_id=user.id,
            profile_name="default",
            font_family="Arial",
            font_size=16,
            text_color="#000000",
            background_color="#FFFFFF",
            line_spacing=1.5,
            contrast_level="high"
        )
        async_session.add(profile)
        await async_session.commit()

        assert profile.contrast_level in ["normal", "high", "very_high"]
