"""
Planning module schemas (Pydantic) for PRIA v7
Request and response validation
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, date


class MomentoRequest(BaseModel):
    """Request to create/update a Momento."""
    nombre: str = Field(..., description="Momento name: Inicio, Desarrollo, or Cierre")
    duration_minutes: int = Field(default=15, description="Duration in minutes")
    content_text: Optional[str] = Field(None, description="Main lesson content")
    recursos: List[str] = Field(default=[], description="List of resources needed")
    evaluacion: Optional[str] = Field(None, description="Assessment for this moment")


class MomentoResponse(BaseModel):
    """Response with Momento details."""
    id: int
    order: int
    nombre: str
    duration_minutes: int
    content_text: Optional[str]
    recursos: List[str]
    evaluacion: Optional[str]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class MicroObjetivoRequest(BaseModel):
    """Request to create/update a MicroObjetivo."""
    texto: str = Field(..., description="SMART objective text")
    verificable: bool = Field(default=True, description="Is it measurable?")
    prioridad: str = Field(default="normal", description="baja, normal, or alta")
    depende_de: Optional[int] = Field(None, description="ID of parent objective")


class MicroObjetivoResponse(BaseModel):
    """Response with MicroObjetivo details."""
    id: int
    texto: str
    verificable: bool
    completado: bool
    prioridad: str
    depende_de: Optional[int]
    created_at: datetime

    class Config:
        from_attributes = True


class CreateWeekRequest(BaseModel):
    """Request to create a weekly plan."""
    pdc_id: int
    week_number: int = Field(..., description="Week number 15-30")
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    status: str = Field(default="draft", description="draft, published, or completed")


class UpdateWeekRequest(BaseModel):
    """Request to update a weekly plan."""
    subject: Optional[str] = None
    grade_level: Optional[str] = None
    status: Optional[str] = None


class WeeklyPlanResponse(BaseModel):
    """Response with full weekly plan including momentos."""
    id: int
    pdc_id: int
    week_number: int
    subject: Optional[str]
    grade_level: Optional[str]
    status: str
    momentos: List[MomentoResponse] = []
    micro_objetivos: List[MicroObjetivoResponse] = []
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class GenerateWeekRequest(BaseModel):
    """Request to auto-generate a weekly plan."""
    pdc_id: int
    week_number: Optional[int] = None  # If None, generate all 16 weeks
    profile_overrides: Optional[dict] = None


class GenerationJobResponse(BaseModel):
    """Response for async generation job."""
    job_id: str = Field(..., description="Celery task ID")
    status: str = Field(default="queued", description="queued, processing, complete, failed")
    progress: int = Field(default=0, description="0-100")
    weeks_completed: int = Field(default=0)
    weeks_total: int = Field(default=1)
    eta: Optional[float] = None


class CalendarEventResponse(BaseModel):
    """Response with calendar event details."""
    id: int
    fecha: date
    nombre_evento: str
    tipo: str  # vacation, holiday, event
    descripcion: Optional[str]

    class Config:
        from_attributes = True


class CopyWeekRequest(BaseModel):
    """Request to copy a week to another week."""
    target_week_id: int = Field(..., description="Target weekly plan ID")
