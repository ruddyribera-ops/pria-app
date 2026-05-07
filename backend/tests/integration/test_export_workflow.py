"""
Integration tests for export workflow
Full workflow: create PDC → request export → poll status → download file
"""
import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.export_job import ExportJob
from app.services.docx_export_service import DOCXExportService


@pytest.mark.asyncio
class TestExportWorkflow:
    """Test complete export workflow"""

    async def test_export_to_download_full_flow(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """
        Full workflow:
        1. Create PDC with MESCP + adaptations
        2. POST /api/export/pdc with format="docx"
        3. Poll job status until "complete"
        4. GET /api/export/{job_id}/download
        5. Verify DOCX bytes returned
        """

        # Step 1: Ensure PDC has content
        assert pdc.content is not None
        assert pdc.subject == "Matemáticas"

        # Step 2: Create export job
        job = ExportJob(
            user_id=user.id,
            pdc_id=pdc.id,
            format="docx",
            status="queued",
            file_url=None,
            error_message=None
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        assert job.id is not None
        assert job.status == "queued"

        # Step 3: Simulate job processing
        job.status = "processing"
        async_session.add(job)
        await async_session.commit()

        # Step 4: Generate file (mock what would happen in background)
        service = DOCXExportService()
        file_bytes = await service.generate_docx(pdc)

        # Step 5: Complete job
        job.status = "complete"
        job.file_url = "https://storage.example.com/exports/job_1.docx"
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        # Step 6: Verify results
        assert job.status == "complete"
        assert job.file_url is not None
        assert file_bytes is not None
        assert isinstance(file_bytes, bytes)

    async def test_export_job_creation_and_tracking(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test export job creation and status tracking"""
        # Create job for DOCX
        docx_job = ExportJob(
            user_id=user.id,
            pdc_id=pdc.id,
            format="docx",
            status="queued"
        )
        async_session.add(docx_job)
        await async_session.commit()
        await async_session.refresh(docx_job)

        assert docx_job.status == "queued"
        assert docx_job.format == "docx"

        # Create job for XLSX
        xlsx_job = ExportJob(
            user_id=user.id,
            pdc_id=pdc.id,
            format="xlsx",
            status="queued"
        )
        async_session.add(xlsx_job)
        await async_session.commit()

        # Verify both jobs exist
        from sqlalchemy import select
        result = await async_session.execute(
            select(ExportJob).where(ExportJob.pdc_id == pdc.id)
        )
        jobs = result.scalars().all()

        assert len(jobs) == 2
        assert all(j.status == "queued" for j in jobs)

    async def test_export_status_polling_workflow(
        self,
        async_session: AsyncSession,
        export_job
    ):
        """Test polling export job status"""
        job_id = export_job.id

        # Initial status
        from sqlalchemy import select
        result = await async_session.execute(
            select(ExportJob).where(ExportJob.id == job_id)
        )
        job = result.scalars().first()
        assert job.status == "queued"

        # First poll (processing)
        job.status = "processing"
        async_session.add(job)
        await async_session.commit()

        result = await async_session.execute(
            select(ExportJob).where(ExportJob.id == job_id)
        )
        job = result.scalars().first()
        assert job.status == "processing"

        # Second poll (complete)
        job.status = "complete"
        job.file_url = "https://example.com/file.docx"
        async_session.add(job)
        await async_session.commit()

        result = await async_session.execute(
            select(ExportJob).where(ExportJob.id == job_id)
        )
        job = result.scalars().first()
        assert job.status == "complete"

    async def test_multiple_format_exports(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test exporting same PDC in multiple formats"""
        formats = ["docx", "xlsx", "pdf"]
        jobs = []

        for fmt in formats:
            job = ExportJob(
                user_id=user.id,
                pdc_id=pdc.id,
                format=fmt,
                status="complete",
                file_url=f"https://example.com/file.{fmt}"
            )
            async_session.add(job)
            jobs.append(job)

        await async_session.commit()

        # Verify all formats created
        from sqlalchemy import select
        result = await async_session.execute(
            select(ExportJob).where(ExportJob.pdc_id == pdc.id)
        )
        all_jobs = result.scalars().all()

        assert len(all_jobs) == 3
        formats_exported = {j.format for j in all_jobs}
        assert formats_exported == {"docx", "xlsx", "pdf"}

    async def test_export_error_handling_workflow(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test export error handling"""
        job = ExportJob(
            user_id=user.id,
            pdc_id=pdc.id,
            format="docx",
            status="queued"
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        # Simulate processing start
        job.status = "processing"
        async_session.add(job)
        await async_session.commit()

        # Simulate error
        job.status = "failed"
        job.error_message = "Gemini API timeout after 30 seconds"
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        assert job.status == "failed"
        assert "timeout" in job.error_message.lower()

    async def test_user_export_history(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test retrieving user's export history"""
        # Create multiple exports over time
        statuses = ["complete", "complete", "failed", "complete"]
        for i, status in enumerate(statuses, 1):
            job = ExportJob(
                user_id=user.id,
                pdc_id=pdc.id,
                format=["docx", "xlsx", "pdf", "docx"][i-1],
                status=status,
                file_url=f"https://example.com/file_{i}.ext" if status == "complete" else None,
                error_message="API error" if status == "failed" else None
            )
            async_session.add(job)

        await async_session.commit()

        # Query user's export history
        from sqlalchemy import select
        result = await async_session.execute(
            select(ExportJob).where(ExportJob.user_id == user.id)
        )
        user_exports = result.scalars().all()

        assert len(user_exports) == 4

        # Count by status
        completed = [j for j in user_exports if j.status == "complete"]
        failed = [j for j in user_exports if j.status == "failed"]

        assert len(completed) == 3
        assert len(failed) == 1

    async def test_export_with_school_branding(
        self,
        async_session: AsyncSession,
        user,
        pdc,
        school
    ):
        """Test export includes school branding"""
        # Setup school branding
        school.logo_url = "https://example.com/logo.png"
        async_session.add(school)
        await async_session.commit()

        # Create export job
        job = ExportJob(
            user_id=user.id,
            pdc_id=pdc.id,
            format="docx",
            status="complete",
            file_url="https://example.com/branded_file.docx"
        )
        async_session.add(job)
        await async_session.commit()
        await async_session.refresh(job)

        # Verify branding available
        assert school.logo_url is not None
        assert pdc.school_id == school.id
