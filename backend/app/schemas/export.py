"""
Pydantic schemas for Export and Branding operations in PRIA v7
"""
from typing import Optional, List
from pydantic import BaseModel, Field
from datetime import datetime


class BrandingConfig(BaseModel):
    """School branding configuration"""
    id: Optional[int] = None
    school_name: str = Field(default="Las Palmas", min_length=1, max_length=255)
    logo_url: Optional[str] = None
    header_color: str = Field(default="#D52B1E", pattern="^#[0-9A-Fa-f]{6}$")
    footer_color: str = Field(default="#FDB927", pattern="^#[0-9A-Fa-f]{6}$")
    accent_color: str = Field(default="#007934", pattern="^#[0-9A-Fa-f]{6}$")
    primary_font: str = Field(default="Arial")  # "Arial", "Verdana", "Georgia"
    footer_text: Optional[str] = None

    class Config:
        json_schema_extra = {
            "example": {
                "school_name": "Las Palmas",
                "logo_url": "/exports/logo.png",
                "header_color": "#D52B1E",
                "footer_color": "#FDB927",
                "accent_color": "#007934",
                "primary_font": "Arial",
                "footer_text": "Las Palmas School, La Paz, Bolivia",
            }
        }


class ExportRequest(BaseModel):
    """Request body for exporting a single PDC"""
    pdc_id: int = Field(..., ge=1)
    format: str = Field(..., min_length=3, max_length=10)  # "docx", "xlsx", "pdf"
    branding_id: Optional[int] = None
    include_adaptations: bool = Field(default=True)
    include_micro_objetivos: bool = Field(default=True)

    class Config:
        json_schema_extra = {
            "example": {
                "pdc_id": 1,
                "format": "docx",
                "branding_id": 1,
                "include_adaptations": True,
                "include_micro_objetivos": True,
            }
        }


class BatchExportRequest(BaseModel):
    """Request body for batch exporting multiple PDCs"""
    pdc_ids: List[int] = Field(..., min_items=1, max_items=50)
    format: str = Field(..., min_length=3, max_length=10)  # "docx", "xlsx", "pdf"
    branding_id: Optional[int] = None

    class Config:
        json_schema_extra = {
            "example": {
                "pdc_ids": [1, 2, 3],
                "format": "zip",
                "branding_id": 1,
            }
        }


class ExportJobResponse(BaseModel):
    """Response for export job status and details"""
    id: int
    pdc_id: int
    format: str
    status: str  # "queued", "processing", "complete", "failed"
    progress: int  # 0-100
    file_url: Optional[str] = None
    error_message: Optional[str] = None
    eta: Optional[int] = None  # Estimated time in seconds
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": 1,
                "pdc_id": 1,
                "format": "docx",
                "status": "complete",
                "progress": 100,
                "file_url": "/exports/pdc_1_matematicas_2026.docx",
                "error_message": None,
                "eta": None,
                "created_at": "2026-05-07T10:00:00Z",
                "completed_at": "2026-05-07T10:05:00Z",
            }
        }


class ExportListResponse(BaseModel):
    """Response for listing export jobs"""
    total: int
    jobs: List[ExportJobResponse]

    class Config:
        json_schema_extra = {
            "example": {
                "total": 2,
                "jobs": []
            }
        }
