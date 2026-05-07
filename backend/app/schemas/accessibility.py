"""
Pydantic schemas for accessibility and neuroinclusive profiles
"""
from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class AccessibilityProfileUpdate(BaseModel):
    """Request schema for updating user accessibility preferences."""

    accessibility_profile: str = Field(..., description="Profile: default|dislexia|adhd|tea|dyscalculia")
    font_size_override: Optional[float] = Field(None, description="Font size 10-20pt, nullable for default")
    color_scheme: str = Field(..., description="Color scheme: light|dark|high_contrast")
    reduced_motion: bool = Field(False, description="Reduce animations and transitions")
    preferred_language: str = Field("es", description="ISO 639-1 language code")

    class Config:
        from_attributes = True


class AccessibilityProfileResponse(BaseModel):
    """Response schema for user accessibility profile."""

    user_id: int
    accessibility_profile: str
    font_size_override: Optional[float]
    color_scheme: str
    reduced_motion: bool
    preferred_language: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class StudentProfileCreate(BaseModel):
    """Request schema for creating student accessibility profile."""

    school_id: int
    student_name: str
    diagnostico: str = Field("none", description="Diagnosis: dislexia|adhd|tea|dyscalculia|none")
    learning_strengths: List[str] = Field(default=[], description="Array of learning strength strings")
    accommodations: List[str] = Field(default=[], description="Array of accommodations: large_font, extra_time, visual_aids, oral_assessment")

    class Config:
        from_attributes = True


class StudentProfileResponse(BaseModel):
    """Response schema for student accessibility profile."""

    id: int
    school_id: int
    student_name: str
    diagnostico: str
    learning_strengths: List[str]
    accommodations: List[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProfileMetadata(BaseModel):
    """Metadata describing an accessibility profile."""

    name: str = Field(..., description="Profile identifier: default|dislexia|adhd|tea|dyscalculia")
    description: str = Field(..., description="Human-readable profile description")
    fonts: List[str] = Field(..., description="Recommended fonts for this profile")
    colors: List[str] = Field(..., description="Color scheme options")
    spacing: float = Field(..., description="Recommended line spacing multiplier")
    contrast_ratio: float = Field(..., description="Minimum WCAG contrast ratio (4.5 or 7)")
    font_size: int = Field(..., description="Default font size in pixels")
    features: dict = Field(default_factory=dict, description="Profile-specific features")

    class Config:
        from_attributes = True
