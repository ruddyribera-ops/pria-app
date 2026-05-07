"""Pydantic schemas for PDC (Plan de Desarrollo Curricular) operations."""

from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime


# ==================== Content Models ====================

class PDCLesson(BaseModel):
    """Individual lesson within a PDC unit."""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    duration_minutes: int = Field(default=45, ge=15, le=480)
    learning_objectives: List[str] = Field(default_factory=list)
    assessment_strategy: Optional[str] = None
    materials: List[str] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "id": "lesson_1",
                "title": "Introduction to Fractions",
                "duration_minutes": 45,
                "learning_objectives": ["Understand parts and wholes", "Identify fractions in real objects"],
                "assessment_strategy": "Visual fraction activities",
                "materials": ["Fraction bars", "Pie charts", "Real objects"],
            }
        }


class PDCUnit(BaseModel):
    """Unit within a PDC."""
    id: Optional[str] = None
    title: str = Field(..., min_length=1, max_length=200)
    duration_days: int = Field(default=5, ge=1, le=60)
    lessons: List[PDCLesson] = Field(default_factory=list)
    learning_objectives: List[str] = Field(default_factory=list)
    assessment_strategy: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "id": "unit_1",
                "title": "Fractions and Decimals",
                "duration_days": 10,
                "lessons": [],
                "learning_objectives": ["Master fraction concepts", "Apply to real-world contexts"],
                "assessment_strategy": "Project-based assessment",
            }
        }


class PDCContent(BaseModel):
    """Complete PDC content structure."""
    units: List[PDCUnit] = Field(default_factory=list)
    general_objectives: List[str] = Field(default_factory=list)
    assessment_methods: List[str] = Field(default_factory=list)
    resources: Dict[str, Any] = Field(default_factory=dict)

    class Config:
        json_schema_extra = {
            "example": {
                "units": [],
                "general_objectives": ["Students will understand decimal numbers"],
                "assessment_methods": ["Quizzes", "Projects", "Observations"],
                "resources": {"textbook": "Math Grade 3", "manipulatives": ["Blocks", "Counters"]},
            }
        }


# ==================== Request Schemas ====================

class CreatePDCRequest(BaseModel):
    """Request to create a new PDC."""
    title: str = Field(..., min_length=1, max_length=300, description="PDC title")
    subject: str = Field(..., min_length=1, max_length=100, description="Subject area")
    grade_level: str = Field(..., description="Grade level (e.g., '1ro Primaria', '3ro Secundaria')")
    trimester: Optional[str] = Field(default="T1", description="Trimester (T1, T2, T3)")
    content: PDCContent = Field(default_factory=PDCContent)

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Fractions Unit - 1st Grade",
                "subject": "Mathematics",
                "grade_level": "1ro Primaria",
                "trimester": "T1",
                "content": {
                    "units": [],
                    "general_objectives": [],
                    "assessment_methods": [],
                    "resources": {},
                },
            }
        }


class UpdatePDCRequest(BaseModel):
    """Request to update an existing PDC."""
    title: Optional[str] = Field(None, min_length=1, max_length=300)
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    trimester: Optional[str] = None
    content: Optional[PDCContent] = None

    class Config:
        json_schema_extra = {
            "example": {
                "title": "Updated Fractions Unit",
                "content": None,
            }
        }


class AdaptationRequest(BaseModel):
    """Request to generate adaptations for PDC content."""
    profiles: List[str] = Field(
        ...,
        description="Neurodiversity profiles: dyslexia, adhd, autism, dyscalculia"
    )
    content_type: str = Field(
        ...,
        description="Type of content being adapted: objective, assessment, activity, content, material"
    )
    content_sections: Dict[str, str] = Field(
        ...,
        description="Content sections to adapt as {section_name: content_text}"
    )
    context: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional context about curriculum unit"
    )

    class Config:
        json_schema_extra = {
            "example": {
                "profiles": ["dyslexia", "adhd"],
                "content_type": "objective",
                "content_sections": {
                    "intro": "Students will understand the concept of fractions.",
                    "detail": "A fraction represents a part of a whole...",
                },
                "context": {"unit": "Fractions", "duration": "10 days"},
            }
        }


# ==================== Response Schemas ====================

class AdaptationResponse(BaseModel):
    """Response containing AI-generated adaptation."""
    profile: str
    content_type: str
    original_content: str
    adapted_content: str
    teaching_tips: Optional[str] = None
    visual_aids: Optional[str] = None
    engagement_strategies: Optional[str] = None
    clarity_notes: Optional[str] = None
    sensory_considerations: Optional[str] = None
    visual_supports: Optional[str] = None
    concrete_examples: Optional[str] = None
    ai_confidence_score: float = Field(..., ge=0.0, le=1.0)
    generation_time_ms: int
    generated_at: str

    class Config:
        json_schema_extra = {
            "example": {
                "profile": "dyslexia",
                "content_type": "objective",
                "original_content": "Students will understand fractions...",
                "adapted_content": "Students will learn about parts of a whole...",
                "teaching_tips": "Use visual aids with clear colors",
                "ai_confidence_score": 0.92,
                "generation_time_ms": 2340,
                "generated_at": "2026-05-08T10:30:00",
            }
        }


class PDCAdaptationDetail(BaseModel):
    """Detail view of a single adaptation."""
    id: int
    profile: str
    content_section: str
    original_content: Dict[str, Any]
    adapted_content: Dict[str, Any]
    ai_confidence_score: float
    teacher_approved: bool
    created_at: str
    rejection_reason: Optional[str] = None
    teacher_feedback: Optional[str] = None


class PDCDetailResponse(BaseModel):
    """Complete PDC with all its data and adaptations."""
    id: int
    title: str
    subject: str
    grade_level: str
    content: PDCContent
    trimester: Optional[str]
    version: int
    created_at: str
    updated_at: str
    adaptations: List[PDCAdaptationDetail] = Field(default_factory=list)

    class Config:
        json_schema_extra = {
            "example": {
                "id": 1,
                "title": "Fractions Unit",
                "subject": "Mathematics",
                "grade_level": "1ro Primaria",
                "content": {},
                "trimester": "T1",
                "version": 1,
                "created_at": "2026-05-08T10:00:00",
                "updated_at": "2026-05-08T10:00:00",
                "adaptations": [],
            }
        }


class PDCListResponse(BaseModel):
    """List of PDCs."""
    total: int
    skip: int
    limit: int
    items: List[PDCDetailResponse]


class AdaptationRequestResponse(BaseModel):
    """Response to adaptation request."""
    pdc_id: int
    adaptations_generated: int
    profiles: List[str]
    status: str = Field(..., description="Status: pending, processing, completed")
    message: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "pdc_id": 1,
                "adaptations_generated": 2,
                "profiles": ["dyslexia", "adhd"],
                "status": "completed",
                "message": None,
            }
        }


# ==================== MESCP Row Models ====================

class MESCPRow(BaseModel):
    """A single MESCP row with all 6 columns."""
    objetivo: str = Field(..., min_length=1, description="Learning objectives")
    contenidos: str = Field(..., min_length=1, description="Content/knowledge")
    momentos: str = Field(..., min_length=1, description="Lesson moments (Inicio, Desarrollo, Cierre)")
    recursos: str = Field(..., min_length=1, description="Resources and materials")
    periodos: str = Field(..., min_length=1, description="Time periods/durations")
    criterios: str = Field(..., min_length=1, description="Assessment criteria")

    class Config:
        json_schema_extra = {
            "example": {
                "objetivo": "Students will understand fractions",
                "contenidos": "Parts of a whole, equivalent fractions, fraction operations",
                "momentos": "Inicio: Review whole numbers; Desarrollo: Teach fractions; Cierre: Practice with real objects",
                "recursos": "Fraction bars, pie charts, manipulatives",
                "periodos": "5 days, 45 minutes per session",
                "criterios": "Ability to identify and create fractions; correct calculations",
            }
        }


class CreateMESCPRequest(BaseModel):
    """Request to create a MESCP row."""
    objetivo: str = Field(..., min_length=1)
    contenidos: str = Field(..., min_length=1)
    momentos: str = Field(..., min_length=1)
    recursos: str = Field(..., min_length=1)
    periodos: str = Field(..., min_length=1)
    criterios: str = Field(..., min_length=1)


class UpdateMESCPRequest(BaseModel):
    """Request to update a MESCP row."""
    objetivo: Optional[str] = None
    contenidos: Optional[str] = None
    momentos: Optional[str] = None
    recursos: Optional[str] = None
    periodos: Optional[str] = None
    criterios: Optional[str] = None


class MultipleIntelligenceItem(BaseModel):
    """Multiple intelligence type with description."""
    id: Optional[int] = None
    type: str = Field(..., description="linguistic, logical, spatial, bodily, musical, interpersonal, intrapersonal, naturalistic, existential")
    description: str = Field(..., min_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "type": "linguistic",
                "description": "Students will read about fractions in real-world contexts",
            }
        }


class ProductItem(BaseModel):
    """Learning product/deliverable."""
    id: Optional[int] = None
    type: str = Field(..., description="project, presentation, artifact, portfolio, etc.")
    description: str = Field(..., min_length=1)

    class Config:
        json_schema_extra = {
            "example": {
                "type": "project",
                "description": "Create a visual poster showing fraction equivalencies",
            }
        }


class AdaptationItem(BaseModel):
    """AI-generated adaptation."""
    id: Optional[int] = None
    profile: str = Field(..., description="dyslexia, adhd, autism, dyscalculia")
    content: str = Field(..., min_length=1)
    approved: bool = False

    class Config:
        json_schema_extra = {
            "example": {
                "profile": "dyslexia",
                "content": "Use short sentences. Fractions = parts of a whole.",
                "approved": False,
            }
        }
