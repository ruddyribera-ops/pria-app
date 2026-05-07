"""
Accessibility and neuroinclusive profile routes for PRIA v7
Endpoints for managing user accessibility preferences and student profiles
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.database import get_async_db
from app.auth.routes import get_current_user
from app.models.user import User
from app.services.accessibility_service import AccessibilityService
from app.schemas.accessibility import (
    AccessibilityProfileUpdate,
    AccessibilityProfileResponse,
    StudentProfileCreate,
    StudentProfileResponse,
    ProfileMetadata,
)

router = APIRouter()


@router.get("/me", response_model=AccessibilityProfileResponse)
async def get_current_accessibility_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> AccessibilityProfileResponse:
    """Get current user's accessibility profile.

    Returns user's current accessibility preferences including profile type,
    font size, color scheme, motion settings, and language.

    Args:
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        AccessibilityProfileResponse with user's current settings
    """
    service = AccessibilityService(db)
    profile = await service.get_user_profile(current_user.id)
    return AccessibilityProfileResponse.model_validate(profile)


@router.put("/me", response_model=AccessibilityProfileResponse)
async def update_accessibility_profile(
    data: AccessibilityProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> AccessibilityProfileResponse:
    """Update user's accessibility preferences.

    Validates profile name and updates settings immediately in database.

    Args:
        data: AccessibilityProfileUpdate with new preferences
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        Updated AccessibilityProfileResponse

    Raises:
        400: If profile name or settings are invalid
    """
    try:
        service = AccessibilityService(db)
        profile = await service.update_user_profile(current_user.id, data)
        return AccessibilityProfileResponse.model_validate(profile)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/profiles", response_model=List[ProfileMetadata])
async def get_available_profiles(
    db: AsyncSession = Depends(get_async_db),
) -> List[ProfileMetadata]:
    """Get list of all available accessibility profiles with metadata.

    Returns information about all 5 profiles (default, dislexia, adhd, tea, dyscalculia)
    including descriptions, fonts, colors, spacing, and feature flags.

    Args:
        db: Database session

    Returns:
        List of ProfileMetadata objects for all available profiles
    """
    service = AccessibilityService(db)
    return await service.get_all_profiles_metadata()


@router.post("/students", response_model=StudentProfileResponse)
async def create_student_profile(
    data: StudentProfileCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> StudentProfileResponse:
    """Create a new student accessibility profile.

    Creates a profile documenting a student's accessibility needs, diagnosis,
    learning strengths, and required accommodations.

    Admin/teacher only endpoint.

    Args:
        data: StudentProfileCreate with student information
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        Created StudentProfileResponse

    Raises:
        403: If user is not admin
        400: If student data is invalid
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can create student profiles",
        )

    try:
        service = AccessibilityService(db)
        profile = await service.create_student_profile(data)
        return StudentProfileResponse.model_validate(profile)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get("/students", response_model=List[StudentProfileResponse])
async def get_student_profiles(
    school_id: int,
    diagnostico: str = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
) -> List[StudentProfileResponse]:
    """Get student profiles for a school.

    Lists all student accessibility profiles for the specified school.
    Optionally filters by diagnosis.

    Admin/teacher only endpoint.

    Args:
        school_id: School to filter by
        diagnostico: Optional diagnosis filter (dislexia|adhd|tea|dyscalculia|none)
        current_user: Authenticated user from JWT
        db: Database session

    Returns:
        List of StudentProfileResponse objects

    Raises:
        403: If user is not admin or teacher for the school
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can view student profiles",
        )

    service = AccessibilityService(db)
    if diagnostico:
        profiles = await service.get_student_profiles_by_diagnostico(school_id, diagnostico)
    else:
        profiles = await service.get_student_profiles_by_school(school_id)

    return [StudentProfileResponse.model_validate(p) for p in profiles]
