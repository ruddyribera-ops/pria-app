"""
Celery async tasks for document export operations in PRIA v7
Handles DOCX, XLSX, PDF, and ZIP batch exports
"""
import asyncio
import os
import zipfile
from datetime import datetime
from pathlib import Path
from typing import List, Optional

try:
    from celery import Celery, Task
    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False
    Celery = None  # type: ignore


# Initialize Celery app (will be configured in main app)
celery_app: Optional[object] = None


def init_celery(app: Celery) -> None:
    """Initialize Celery with FastAPI app"""
    global celery_app
    celery_app = app


def get_exports_dir() -> Path:
    """Get or create exports directory"""
    exports_dir = Path("/tmp/pria_exports") if os.name != "nt" else Path("C:\\tmp\\pria_exports")
    exports_dir.mkdir(parents=True, exist_ok=True)
    return exports_dir


async def export_pdc_async(
    pdc_id: int,
    format_type: str,
    user_id: int,
    db_session,
    job_id: int,
) -> dict:
    """
    Async core logic for exporting a single PDC.
    Called by Celery task.

    Args:
        pdc_id: PDC ID to export
        format_type: "docx", "xlsx", or "pdf"
        user_id: User ID (for permission checks)
        db_session: Database session
        job_id: Export job ID (for updating status)

    Returns:
        Dict with export result including file_url and status
    """
    from sqlalchemy import select, update
    from app.models.pdc import PDC
    from app.models.export_job import ExportJob
    from app.services.branding_service import BrandingService
    from app.services.docx_export_service import DocxExportService
    from app.services.xlsx_export_service import XlsxExportService
    from app.services.pdf_export_service import PdfExportService

    try:
        # Load PDC
        result = await db_session.execute(
            select(PDC).where(PDC.id == pdc_id).where(PDC.user_id == user_id)
        )
        pdc = result.scalars().first()

        if not pdc:
            raise ValueError(f"PDC {pdc_id} not found or access denied")

        # Update job status to processing
        await db_session.execute(
            update(ExportJob).where(ExportJob.id == job_id).values(
                status="processing",
                progress=10
            )
        )
        await db_session.commit()

        # Load branding
        branding = await BrandingService.get_branding(db_session)

        # Update progress
        await db_session.execute(
            update(ExportJob).where(ExportJob.id == job_id).values(progress=30)
        )
        await db_session.commit()

        # Export based on format
        file_bytes = None
        if format_type == "docx":
            file_bytes = DocxExportService.export_pdc(pdc, branding, "detailed")
            extension = ".docx"
        elif format_type == "xlsx":
            weekly_plans = list(pdc.weekly_plans) if hasattr(pdc, "weekly_plans") else []
            file_bytes = XlsxExportService.export_pdc(pdc, weekly_plans, branding)
            extension = ".xlsx"
        elif format_type == "pdf":
            file_bytes = PdfExportService.export_pdc(pdc, branding, "detailed")
            extension = ".pdf"
        else:
            raise ValueError(f"Unsupported format: {format_type}")

        # Update progress
        await db_session.execute(
            update(ExportJob).where(ExportJob.id == job_id).values(progress=80)
        )
        await db_session.commit()

        # Save file
        exports_dir = get_exports_dir()
        filename = f"{pdc.subject.replace(' ', '_')}_{pdc.grade_level.replace(' ', '_')}_{job_id}{extension}"
        file_path = exports_dir / filename
        file_path.write_bytes(file_bytes)
        file_url = f"/exports/{filename}"

        # Update job with file URL and complete status
        await db_session.execute(
            update(ExportJob).where(ExportJob.id == job_id).values(
                status="complete",
                progress=100,
                file_url=file_url,
                completed_at=datetime.utcnow()
            )
        )
        await db_session.commit()

        return {
            "success": True,
            "job_id": job_id,
            "file_url": file_url,
            "format": format_type,
        }

    except Exception as e:
        # Update job with error status
        error_message = str(e)
        try:
            await db_session.execute(
                update(ExportJob).where(ExportJob.id == job_id).values(
                    status="failed",
                    error_message=error_message,
                    completed_at=datetime.utcnow()
                )
            )
            await db_session.commit()
        except Exception:
            pass

        return {
            "success": False,
            "job_id": job_id,
            "error": error_message,
        }


async def export_batch_async(
    pdc_ids: List[int],
    format_type: str,
    user_id: int,
    db_session,
    batch_job_id: int,
) -> dict:
    """
    Async core logic for batch exporting multiple PDCs.

    Args:
        pdc_ids: List of PDC IDs to export
        format_type: Export format
        user_id: User ID
        db_session: Database session
        batch_job_id: Batch job ID

    Returns:
        Dict with batch export result including ZIP file URL
    """
    from sqlalchemy import select, update
    from app.models.pdc import PDC
    from app.models.export_job import ExportJob

    try:
        # Create export jobs for each PDC
        job_ids = []
        for i, pdc_id in enumerate(pdc_ids):
            # Update batch progress
            progress = int((i / len(pdc_ids)) * 100)
            await db_session.execute(
                update(ExportJob).where(ExportJob.id == batch_job_id).values(progress=progress)
            )

        # Create ZIP file with all exports
        exports_dir = get_exports_dir()
        batch_filename = f"batch_export_{batch_job_id}.zip"
        batch_path = exports_dir / batch_filename

        with zipfile.ZipFile(batch_path, "w") as zf:
            for pdc_id in pdc_ids:
                # Load PDC
                result = await db_session.execute(
                    select(PDC).where(PDC.id == pdc_id).where(PDC.user_id == user_id)
                )
                pdc = result.scalars().first()

                if pdc:
                    # Export and add to ZIP (organized by subject/grade)
                    from app.services.docx_export_service import DocxExportService
                    from app.services.branding_service import BrandingService

                    branding = await BrandingService.get_branding(db_session)
                    file_bytes = DocxExportService.export_pdc(pdc, branding)

                    folder = f"{pdc.subject}/{pdc.grade_level}"
                    filename = f"{pdc.title or 'pdc'}.docx"
                    zf.writestr(f"{folder}/{filename}", file_bytes)

        # Update job with ZIP file URL
        batch_url = f"/exports/{batch_filename}"
        await db_session.execute(
            update(ExportJob).where(ExportJob.id == batch_job_id).values(
                status="complete",
                progress=100,
                file_url=batch_url,
                completed_at=datetime.utcnow()
            )
        )
        await db_session.commit()

        return {
            "success": True,
            "job_id": batch_job_id,
            "file_url": batch_url,
            "format": "zip",
            "pdc_count": len(pdc_ids),
        }

    except Exception as e:
        error_message = str(e)
        try:
            from sqlalchemy import update
            from app.models.export_job import ExportJob

            await db_session.execute(
                update(ExportJob).where(ExportJob.id == batch_job_id).values(
                    status="failed",
                    error_message=error_message,
                    completed_at=datetime.utcnow()
                )
            )
            await db_session.commit()
        except Exception:
            pass

        return {
            "success": False,
            "job_id": batch_job_id,
            "error": error_message,
        }


# Celery task definitions (will be registered if Celery is available)
if CELERY_AVAILABLE:

    @celery_app.task(name="export.export_pdc_task", bind=True)
    def export_pdc_task(
        self,
        pdc_id: int,
        format_type: str,
        user_id: int,
        job_id: int,
    ) -> dict:
        """
        Celery task to export a single PDC asynchronously.

        Args:
            pdc_id: PDC ID
            format_type: Export format ("docx", "xlsx", "pdf")
            user_id: User ID
            job_id: Export job ID

        Returns:
            Export result dict
        """
        from app.database import AsyncSessionLocal

        # Create async session and run async logic
        async_session = AsyncSessionLocal()

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(
            export_pdc_async(pdc_id, format_type, user_id, async_session, job_id)
        )

        async_session.close()
        return result

    @celery_app.task(name="export.export_batch_task", bind=True)
    def export_batch_task(
        self,
        pdc_ids: List[int],
        format_type: str,
        user_id: int,
        job_id: int,
    ) -> dict:
        """
        Celery task to batch export multiple PDCs asynchronously.

        Args:
            pdc_ids: List of PDC IDs
            format_type: Export format
            user_id: User ID
            job_id: Batch job ID

        Returns:
            Batch export result dict
        """
        from app.database import AsyncSessionLocal

        async_session = AsyncSessionLocal()

        try:
            loop = asyncio.get_event_loop()
        except RuntimeError:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

        result = loop.run_until_complete(
            export_batch_async(pdc_ids, format_type, user_id, async_session, job_id)
        )

        async_session.close()
        return result
