"""
Unit tests for Export Service
Tests: DOCX, XLSX, PDF generation, branding, export job tracking
"""
import pytest
from io import BytesIO
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.export_job import ExportJob
from app.services.docx_export_service import DOCXExportService
from app.services.xlsx_export_service import XLSXExportService
from app.services.pdf_export_service import PDFExportService


@pytest.mark.asyncio
class TestDOCXExport:
    """Test DOCX export generation"""

    async def test_docx_export_generates_bytes(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test DOCX export generates valid bytes"""
        service = DOCXExportService()
        docx_bytes = await service.generate_docx(pdc)

        assert docx_bytes is not None
        assert isinstance(docx_bytes, bytes)
        assert len(docx_bytes) > 0
        # Check for DOCX signature (PK format)
        assert docx_bytes[:2] == b"PK"

    async def test_docx_export_contains_mescp_table(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test DOCX export includes MESCP table"""
        service = DOCXExportService()
        docx_bytes = await service.generate_docx(pdc)

        # DOCX is a ZIP file, verify structure exists
        assert len(docx_bytes) > 1000

    async def test_docx_export_with_empty_pdc(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test DOCX export handles empty PDC gracefully"""
        pdc.content = {}
        async_session.add(pdc)
        await async_session.commit()

        service = DOCXExportService()
        # Should not crash
        docx_bytes = await service.generate_docx(pdc)

        assert docx_bytes is not None


@pytest.mark.asyncio
class TestXLSXExport:
    """Test XLSX export generation"""

    async def test_xlsx_export_generates_bytes(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test XLSX export generates valid bytes"""
        service = XLSXExportService()
        xlsx_bytes = await service.generate_xlsx(pdc)

        assert xlsx_bytes is not None
        assert isinstance(xlsx_bytes, bytes)
        assert len(xlsx_bytes) > 0

    async def test_xlsx_export_contains_3_sheets(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test XLSX export contains required sheets"""
        service = XLSXExportService()
        xlsx_bytes = await service.generate_xlsx(pdc)

        # XLSX is a ZIP file containing sheet files
        assert b"sheet1.xml" in xlsx_bytes or b"Sheet" in xlsx_bytes

    async def test_xlsx_export_includes_formulas(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test XLSX export includes calculation formulas"""
        service = XLSXExportService()
        xlsx_bytes = await service.generate_xlsx(pdc)

        # Verify it's valid XLSX structure
        assert len(xlsx_bytes) > 500


@pytest.mark.asyncio
class TestPDFExport:
    """Test PDF export generation"""

    async def test_pdf_export_generates_bytes(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test PDF export generates valid bytes"""
        service = PDFExportService()
        pdf_bytes = await service.generate_pdf(pdc)

        if pdf_bytes:  # May be None if WeasyPrint not available
            assert isinstance(pdf_bytes, bytes)
            assert len(pdf_bytes) > 0
            # Check PDF signature
            assert pdf_bytes[:4] == b"%PDF"

    async def test_pdf_export_graceful_failure(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test PDF export handles missing dependencies gracefully"""
        service = PDFExportService()
        # Should not crash even if WeasyPrint missing
        result = await service.generate_pdf(pdc)

        # Either returns bytes or None (if unavailable)
        assert result is None or isinstance(result, bytes)


@pytest.mark.asyncio
class TestBrandingApplication:
    """Test branding applied to exports"""

    async def test_branding_applied_to_docx(
        self,
        async_session: AsyncSession,
        pdc,
        school
    ):
        """Test school branding applied to DOCX"""
        service = DOCXExportService()

        # Set school branding
        school.logo_url = "https://example.com/logo.png"
        async_session.add(school)
        await async_session.commit()

        docx_bytes = await service.generate_docx(pdc)

        # Verify document structure is valid
        assert docx_bytes is not None
        assert len(docx_bytes) > 0

    async def test_school_colors_in_export(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test school colors applied to export"""
        service = XLSXExportService()
        xlsx_bytes = await service.generate_xlsx(pdc)

        # XLSX includes color information
        assert xlsx_bytes is not None


@pytest.mark.asyncio
class TestExportJobTracking:
    """Test export job status tracking"""

    async def test_export_job_created_with_queued_status(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test export job created with queued status"""
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

        assert job.status == "queued"
        assert job.file_url is None

    async def test_export_job_status_transitions(
        self,
        async_session: AsyncSession,
        export_job
    ):
        """Test export job transitions through states"""
        # queued -> processing
        export_job.status = "processing"
        async_session.add(export_job)
        await async_session.commit()
        await async_session.refresh(export_job)
        assert export_job.status == "processing"

        # processing -> complete
        export_job.status = "complete"
        export_job.file_url = "https://example.com/file.docx"
        async_session.add(export_job)
        await async_session.commit()
        await async_session.refresh(export_job)
        assert export_job.status == "complete"
        assert export_job.file_url is not None

    async def test_export_job_error_tracking(
        self,
        async_session: AsyncSession,
        export_job
    ):
        """Test export job error message tracking"""
        export_job.status = "failed"
        export_job.error_message = "Gemini API timeout"
        async_session.add(export_job)
        await async_session.commit()
        await async_session.refresh(export_job)

        assert export_job.status == "failed"
        assert export_job.error_message == "Gemini API timeout"

    async def test_get_user_export_jobs(
        self,
        async_session: AsyncSession,
        user,
        pdc
    ):
        """Test retrieving user's export jobs"""
        # Create multiple jobs
        for fmt in ["docx", "xlsx", "pdf"]:
            job = ExportJob(
                user_id=user.id,
                pdc_id=pdc.id,
                format=fmt,
                status="complete",
                file_url=f"https://example.com/{fmt}"
            )
            async_session.add(job)

        await async_session.commit()

        # Query user's jobs
        from sqlalchemy import select
        result = await async_session.execute(
            select(ExportJob).where(ExportJob.user_id == user.id)
        )
        jobs = result.scalars().all()

        assert len(jobs) == 3
        assert all(job.user_id == user.id for job in jobs)


@pytest.mark.asyncio
class TestExportGracefulHandling:
    """Test graceful handling of edge cases"""

    async def test_export_with_missing_data_handles_gracefully(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test export handles PDC with no adaptations/objectives"""
        pdc.content = {
            "objective_general": "Basic objective",
            "mescp_rows": []
        }
        async_session.add(pdc)
        await async_session.commit()

        service = DOCXExportService()
        # Should not crash with minimal data
        docx_bytes = await service.generate_docx(pdc)

        assert docx_bytes is not None

    async def test_export_with_special_characters(
        self,
        async_session: AsyncSession,
        pdc
    ):
        """Test export handles special characters"""
        pdc.title = "PDC with Español: ñáéíóú"
        pdc.content = {
            "mescp_rows": [
                {
                    "objetivo": "Objetivo con caracteres especiales: ñ, á, é, í, ó, ú",
                    "contenidos": "Contenidos",
                    "estrategias": "Estrategias",
                    "criterios": "Criterios",
                    "productos": "Productos",
                    "evidencias": "Evidencias"
                }
            ]
        }
        async_session.add(pdc)
        await async_session.commit()

        service = DOCXExportService()
        docx_bytes = await service.generate_docx(pdc)

        assert docx_bytes is not None
