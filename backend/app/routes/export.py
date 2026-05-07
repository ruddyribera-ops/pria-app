"""
Export and Branding API routes for PRIA v7
Handles DOCX/XLSX/PDF exports and school branding management
"""
from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_

from app.database import get_async_db
from app.auth.routes import get_current_user
from app.models.user import User
from app.models.pdc import PDC
from app.models.export_job import ExportJob
from app.models.school_branding import SchoolBranding
from app.schemas.export import (
    ExportRequest,
    ExportJobResponse,
    BrandingConfig,
    BatchExportRequest,
    ExportListResponse,
)
from app.services.branding_service import BrandingService
from app.tasks.export_tasks import export_pdc_async, export_batch_async

router = APIRouter(prefix="/api/export", tags=["export"])


@router.post("/pdc", response_model=dict)
async def export_pdc(
    request: ExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Export a single PDC to specified format (DOCX, XLSX, or PDF).

    Request body:
    - pdc_id: int (required) - PDC to export
    - format: str (required) - "docx", "xlsx", or "pdf"
    - branding_id: int (optional) - Branding config to use
    - include_adaptations: bool (default: true)
    - include_micro_objetivos: bool (default: true)

    Returns:
    - job_id: int - Unique export job ID
    - status: str - "queued" (initial status)
    - eta: int - Estimated seconds to completion
    """
    # Verify PDC exists and user has access
    result = await db.execute(
        select(PDC).where(
            and_(PDC.id == request.pdc_id, PDC.user_id == current_user.id)
        )
    )
    pdc = result.scalars().first()

    if not pdc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="PDC not found or access denied",
        )

    # Create export job record
    export_job = ExportJob(
        user_id=current_user.id,
        pdc_id=request.pdc_id,
        format=request.format.lower(),
        status="queued",
        progress=0,
    )
    db.add(export_job)
    await db.commit()
    await db.refresh(export_job)

    # Enqueue async task (placeholder - actual Celery integration in production)
    # In production, use: export_pdc_task.delay(pdc_id, format, user_id, job_id)
    import asyncio
    asyncio.create_task(
        export_pdc_async(
            pdc_id=request.pdc_id,
            format_type=request.format,
            user_id=current_user.id,
            db_session=db,
            job_id=export_job.id,
        )
    )

    return {
        "job_id": export_job.id,
        "status": "queued",
        "eta": 30,  # Estimated 30 seconds
    }


@router.post("/batch", response_model=dict)
async def export_batch(
    request: BatchExportRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Export multiple PDCs as a ZIP file.

    Request body:
    - pdc_ids: List[int] - PDC IDs to export (1-50)
    - format: str - "docx", "xlsx", or "pdf"
    - branding_id: int (optional)

    Returns:
    - job_id: int - Batch export job ID
    - status: str - "queued"
    - eta: int - Estimated seconds
    """
    # Verify all PDCs exist and user has access
    result = await db.execute(
        select(PDC).where(
            and_(
                PDC.id.in_(request.pdc_ids),
                PDC.user_id == current_user.id,
            )
        )
    )
    pdcs = result.scalars().all()

    if len(pdcs) != len(request.pdc_ids):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="One or more PDCs not found or access denied",
        )

    # Create batch export job
    export_job = ExportJob(
        user_id=current_user.id,
        pdc_id=request.pdc_ids[0],  # Reference first PDC (this is a batch)
        format="zip",
        status="queued",
        progress=0,
    )
    db.add(export_job)
    await db.commit()
    await db.refresh(export_job)

    # Enqueue batch task
    import asyncio
    asyncio.create_task(
        export_batch_async(
            pdc_ids=request.pdc_ids,
            format_type=request.format,
            user_id=current_user.id,
            db_session=db,
            batch_job_id=export_job.id,
        )
    )

    return {
        "job_id": export_job.id,
        "status": "queued",
        "eta": 60,  # Estimated 60 seconds for batch
    }


@router.get("/{job_id}", response_model=ExportJobResponse)
async def get_export_status(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get export job status and progress.

    Returns:
    - id: int
    - status: str - "queued", "processing", "complete", or "failed"
    - progress: int - 0-100
    - file_url: str (if complete)
    - error_message: str (if failed)
    - eta: int (estimated seconds remaining)
    """
    result = await db.execute(
        select(ExportJob).where(
            and_(ExportJob.id == job_id, ExportJob.user_id == current_user.id)
        )
    )
    job = result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export job not found",
        )

    # Calculate ETA
    eta = None
    if job.status == "processing":
        eta = max(5, (100 - job.progress) // 10)  # Rough estimate
    elif job.status == "queued":
        eta = 30

    return ExportJobResponse(
        id=job.id,
        pdc_id=job.pdc_id,
        format=job.format,
        status=job.status,
        progress=job.progress,
        file_url=job.file_url,
        error_message=job.error_message,
        eta=eta,
        created_at=job.created_at,
        completed_at=job.completed_at,
    )


@router.get("/{job_id}/download")
async def download_export(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Download exported file.
    Returns file bytes with appropriate Content-Disposition header.

    Only works if export is complete (status="complete").
    """
    result = await db.execute(
        select(ExportJob).where(
            and_(ExportJob.id == job_id, ExportJob.user_id == current_user.id)
        )
    )
    job = result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export job not found",
        )

    if job.status != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Export is {job.status}. Cannot download incomplete export.",
        )

    if not job.file_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Export file URL not found",
        )

    from pathlib import Path
    import os

    # Resolve file path
    file_path = Path(job.file_url)
    if not file_path.is_absolute():
        # Handle relative paths
        exports_dir = Path("/tmp/pria_exports") if os.name != "nt" else Path("C:\\tmp\\pria_exports")
        file_path = exports_dir / file_path.name

    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export file not found on disk",
        )

    from fastapi.responses import FileResponse

    return FileResponse(
        path=file_path,
        media_type="application/octet-stream",
        filename=file_path.name,
    )


@router.delete("/{job_id}")
async def cancel_export(
    job_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Cancel a queued or processing export job.

    Only works if status is "queued" or "processing".
    """
    result = await db.execute(
        select(ExportJob).where(
            and_(ExportJob.id == job_id, ExportJob.user_id == current_user.id)
        )
    )
    job = result.scalars().first()

    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Export job not found",
        )

    if job.status not in ["queued", "processing"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot cancel {job.status} export",
        )

    # Update job status to cancelled
    await db.execute(
        update(ExportJob).where(ExportJob.id == job_id).values(
            status="failed",
            error_message="Cancelled by user",
            completed_at=datetime.utcnow(),
        )
    )
    await db.commit()

    return {"message": "Export job cancelled"}


@router.get("/user/jobs/list", response_model=ExportListResponse)
async def list_user_exports(
    skip: int = 0,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    List all export jobs for the current user.

    Query params:
    - skip: int (default: 0) - Number of jobs to skip
    - limit: int (default: 20) - Max jobs to return

    Returns list of ExportJobResponse objects with pagination.
    """
    # Get total count
    count_result = await db.execute(
        select(ExportJob).where(ExportJob.user_id == current_user.id)
    )
    total = len(count_result.scalars().all())

    # Get paginated results
    result = await db.execute(
        select(ExportJob)
        .where(ExportJob.user_id == current_user.id)
        .order_by(ExportJob.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    jobs = result.scalars().all()

    return ExportListResponse(
        total=total,
        jobs=[
            ExportJobResponse(
                id=job.id,
                pdc_id=job.pdc_id,
                format=job.format,
                status=job.status,
                progress=job.progress,
                file_url=job.file_url,
                error_message=job.error_message,
                eta=None,
                created_at=job.created_at,
                completed_at=job.completed_at,
            )
            for job in jobs
        ],
    )


# Branding endpoints

@router.get("/branding", response_model=BrandingConfig)
async def get_branding(
    db: AsyncSession = Depends(get_async_db),
):
    """
    Get current school branding configuration.

    Returns Las Palmas defaults if no branding configured.
    """
    return await BrandingService.get_branding(db)


@router.put("/branding", response_model=BrandingConfig)
async def update_branding(
    branding: BrandingConfig,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db),
):
    """
    Update school branding configuration.

    Only accessible to admin users.

    Request body:
    - school_name: str
    - logo_url: str (optional)
    - header_color: str (hex #RRGGBB)
    - footer_color: str (hex #RRGGBB)
    - accent_color: str (hex #RRGGBB)
    - primary_font: str ("Arial", "Verdana", "Georgia")
    - footer_text: str (optional)

    Returns updated BrandingConfig.
    """
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only administrators can update branding",
        )

    return await BrandingService.update_branding(db, branding)
