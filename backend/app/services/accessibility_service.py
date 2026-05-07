"""Accessibility profile domain service for PRIA v7."""

from typing import Optional, List, Dict, Any
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.user_profile import UserProfile
from app.models.student_profile import StudentProfile
from app.schemas.accessibility import (
    AccessibilityProfileUpdate,
    AccessibilityProfileResponse,
    StudentProfileCreate,
    StudentProfileResponse,
    ProfileMetadata,
)


# Accessibility profile metadata definitions
ACCESSIBILITY_PROFILES: Dict[str, Dict[str, Any]] = {
    "default": {
        "name": "default",
        "description": "Standard interface with default settings",
        "fonts": ["Inter", "Arial"],
        "colors": ["slate", "gray"],
        "spacing": 1.5,
        "contrast_ratio": 4.5,
        "font_size": 16,
        "features": {
            "italics_enabled": True,
            "animations_enabled": True,
            "decorative_elements": True,
        },
    },
    "dislexia": {
        "name": "dislexia",
        "description": "Dyslexie font 14pt, 2.0 line spacing, warm background, no italics, left-aligned",
        "fonts": ["Dyslexie", "OpenDyslexic"],
        "colors": ["warm_cream"],
        "spacing": 2.0,
        "contrast_ratio": 7.0,
        "font_size": 14,
        "features": {
            "italics_enabled": False,
            "animations_enabled": False,
            "decorative_elements": False,
            "background_color": "#FAF7F2",
            "text_align": "left",
            "letter_spacing": "0.05em",
        },
    },
    "adhd": {
        "name": "adhd",
        "description": "High contrast, color-coded sections, progress indicators, reduced animations, bold keywords",
        "fonts": ["Arial", "Verdana"],
        "colors": ["high_contrast"],
        "spacing": 1.6,
        "contrast_ratio": 7.0,
        "font_size": 13,
        "features": {
            "italics_enabled": False,
            "animations_enabled": False,
            "decorative_elements": False,
            "color_coding": True,
            "progress_indicators": True,
            "bold_keywords": True,
            "sections_collapsible": True,
            "focus_mode": True,
        },
    },
    "tea": {
        "name": "tea",
        "description": "Predictable grid layout, minimal clutter, explicit instructions, text-only labels, no animations",
        "fonts": ["Arial", "Helvetica"],
        "colors": ["neutral"],
        "spacing": 1.6,
        "contrast_ratio": 4.5,
        "font_size": 14,
        "features": {
            "italics_enabled": False,
            "animations_enabled": False,
            "decorative_elements": False,
            "grid_layout": True,
            "minimal_clutter": True,
            "predictable_structure": True,
            "explicit_instructions": True,
            "visual_schedules": True,
            "no_idioms": True,
        },
    },
    "dyscalculia": {
        "name": "dyscalculia",
        "description": "Monospace font for numbers, color-coded by magnitude, tens frames, concrete language, pre-filled grids",
        "fonts": ["Courier", "Consolas"],
        "colors": ["number_coded"],
        "spacing": 1.5,
        "contrast_ratio": 7.0,
        "font_size": 14,
        "features": {
            "italics_enabled": False,
            "animations_enabled": False,
            "decorative_elements": False,
            "monospace_numbers": True,
            "color_code_magnitude": True,
            "tens_frames": True,
            "concrete_language": True,
            "base_ten_blocks": True,
            "pre_filled_grids": True,
        },
    },
}


class AccessibilityService:
    """Domain logic for accessibility profile operations."""

    def __init__(self, db: AsyncSession):
        """Initialize accessibility service.

        Args:
            db: SQLAlchemy async session
        """
        self.db = db

    async def get_user_profile(self, user_id: int) -> UserProfile:
        """Get or create user accessibility profile.

        If profile doesn't exist, creates default profile for user.

        Args:
            user_id: User identifier

        Returns:
            UserProfile object (existing or newly created)

        Raises:
            ValueError: If user_id is invalid
        """
        if user_id <= 0:
            raise ValueError("Invalid user_id")

        # Try to fetch existing profile
        stmt = select(UserProfile).where(UserProfile.user_id == user_id)
        result = await self.db.execute(stmt)
        profile = result.scalar_one_or_none()

        # Create default profile if doesn't exist
        if profile is None:
            profile = UserProfile(
                user_id=user_id,
                accessibility_profile="default",
                font_size_override=None,
                color_scheme="light",
                reduced_motion=False,
                preferred_language="es",
            )
            self.db.add(profile)
            await self.db.commit()
            await self.db.refresh(profile)

        return profile

    async def update_user_profile(
        self, user_id: int, data: AccessibilityProfileUpdate
    ) -> UserProfile:
        """Update user accessibility preferences.

        Validates profile name and updates database immediately.

        Args:
            user_id: User identifier
            data: AccessibilityProfileUpdate with new preferences

        Returns:
            Updated UserProfile

        Raises:
            ValueError: If profile name is invalid
        """
        # Validate profile name
        valid_profiles = list(ACCESSIBILITY_PROFILES.keys())
        if data.accessibility_profile not in valid_profiles:
            raise ValueError(
                f"Invalid profile '{data.accessibility_profile}'. Must be one of: {', '.join(valid_profiles)}"
            )

        # Validate font size if provided
        if data.font_size_override is not None:
            if not (10 <= data.font_size_override <= 20):
                raise ValueError("Font size must be between 10 and 20 points")

        # Validate color scheme
        valid_schemes = ["light", "dark", "high_contrast"]
        if data.color_scheme not in valid_schemes:
            raise ValueError(f"Invalid color scheme. Must be one of: {', '.join(valid_schemes)}")

        # Get or create profile
        profile = await self.get_user_profile(user_id)

        # Update fields
        profile.accessibility_profile = data.accessibility_profile
        profile.font_size_override = data.font_size_override
        profile.color_scheme = data.color_scheme
        profile.reduced_motion = data.reduced_motion
        profile.preferred_language = data.preferred_language
        profile.updated_at = datetime.utcnow()

        await self.db.commit()
        await self.db.refresh(profile)

        return profile

    async def get_profile_metadata(self, profile_name: str) -> ProfileMetadata:
        """Get metadata for an accessibility profile.

        Returns profile description, fonts, colors, and feature settings.

        Args:
            profile_name: Profile identifier

        Returns:
            ProfileMetadata with profile configuration

        Raises:
            ValueError: If profile name doesn't exist
        """
        if profile_name not in ACCESSIBILITY_PROFILES:
            raise ValueError(f"Profile '{profile_name}' not found")

        profile_data = ACCESSIBILITY_PROFILES[profile_name]
        return ProfileMetadata(**profile_data)

    async def get_all_profiles_metadata(self) -> List[ProfileMetadata]:
        """Get metadata for all accessibility profiles.

        Returns:
            List of ProfileMetadata objects for all 5 profiles
        """
        profiles = []
        for profile_name in list(ACCESSIBILITY_PROFILES.keys()):
            metadata = await self.get_profile_metadata(profile_name)
            profiles.append(metadata)
        return profiles

    async def log_accessibility_event(
        self, user_id: int, profile_name: str, timestamp: datetime
    ) -> None:
        """Log accessibility profile change event for analytics.

        Args:
            user_id: User identifier
            profile_name: Profile that was selected
            timestamp: When the change occurred

        Note:
            This is a stub for future analytics implementation.
            Currently logs to service logger.
        """
        import logging

        logger = logging.getLogger(__name__)
        logger.info(
            f"Accessibility event: user_id={user_id}, profile={profile_name}, timestamp={timestamp}"
        )

    async def create_student_profile(
        self, data: StudentProfileCreate
    ) -> StudentProfile:
        """Create a new student accessibility profile.

        Args:
            data: StudentProfileCreate with student information

        Returns:
            Created StudentProfile

        Raises:
            ValueError: If diagnostico is invalid
        """
        # Validate diagnostico
        valid_diagnosticos = ["dislexia", "adhd", "tea", "dyscalculia", "none"]
        if data.diagnostico not in valid_diagnosticos:
            raise ValueError(
                f"Invalid diagnostico '{data.diagnostico}'. Must be one of: {', '.join(valid_diagnosticos)}"
            )

        profile = StudentProfile(
            school_id=data.school_id,
            student_name=data.student_name,
            diagnostico=data.diagnostico,
            learning_strengths=data.learning_strengths,
            accommodations=data.accommodations,
        )
        self.db.add(profile)
        await self.db.commit()
        await self.db.refresh(profile)

        return profile

    async def get_student_profiles_by_school(
        self, school_id: int
    ) -> List[StudentProfile]:
        """Get all student profiles for a school.

        Args:
            school_id: School identifier

        Returns:
            List of StudentProfile objects
        """
        stmt = select(StudentProfile).where(StudentProfile.school_id == school_id)
        result = await self.db.execute(stmt)
        return result.scalars().all()

    async def get_student_profiles_by_diagnostico(
        self, school_id: int, diagnostico: str
    ) -> List[StudentProfile]:
        """Get student profiles filtered by diagnostico.

        Args:
            school_id: School identifier
            diagnostico: Diagnosis filter

        Returns:
            List of filtered StudentProfile objects
        """
        stmt = select(StudentProfile).where(
            (StudentProfile.school_id == school_id)
            & (StudentProfile.diagnostico == diagnostico)
        )
        result = await self.db.execute(stmt)
        return result.scalars().all()
