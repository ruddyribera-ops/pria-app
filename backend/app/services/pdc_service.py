"""PDC (Plan de Desarrollo Curricular) domain service."""

from typing import Optional, List, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.pdc import PDC, PDCAdaptation, AdaptationCache
from app.schemas.pdc import CreatePDCRequest, UpdatePDCRequest, AdaptationRequest
from .gemini_service import GeminiAdaptationService, NeuroDiversityProfile
from .errors import ContentValidationError


class PDCService:
    """Domain logic for PDC operations."""

    def __init__(self, db: AsyncSession, gemini_service: GeminiAdaptationService):
        """Initialize PDC service.

        Args:
            db: SQLAlchemy async session
            gemini_service: Gemini adaptation service
        """
        self.db = db
        self.gemini = gemini_service

    async def create_pdc(
        self,
        school_id: int,
        teacher_id: int,
        request: CreatePDCRequest,
    ) -> PDC:
        """Create a new PDC.

        Args:
            school_id: School identifier
            teacher_id: Teacher/creator identifier
            request: PDC creation request with title, subject, grade_level, content

        Returns:
            Created PDC object
        """
        pdc = PDC(
            school_id=school_id,
            teacher_id=teacher_id,
            title=request.title,
            subject=request.subject,
            grade_level=request.grade_level,
            content=request.content.dict() if hasattr(request.content, 'dict') else request.content,
            trimester=request.trimester,
            version=1,
        )

        self.db.add(pdc)
        await self.db.commit()
        await self.db.refresh(pdc)

        return pdc

    async def get_pdc(self, pdc_id: int) -> Optional[PDC]:
        """Get PDC by ID."""
        result = await self.db.execute(
            select(PDC).where(PDC.id == pdc_id)
        )
        return result.scalars().first()

    async def get_pdc_with_adaptations(self, pdc_id: int) -> Optional[Dict[str, Any]]:
        """Get PDC with all its adaptations joined."""
        pdc = await self.get_pdc(pdc_id)
        if not pdc:
            return None

        result = await self.db.execute(
            select(PDCAdaptation).where(PDCAdaptation.pdc_id == pdc_id)
        )
        adaptations = result.scalars().all()

        return {
            "id": pdc.id,
            "title": pdc.title,
            "subject": pdc.subject,
            "grade_level": pdc.grade_level,
            "content": pdc.content,
            "trimester": pdc.trimester,
            "version": pdc.version,
            "created_at": pdc.created_at.isoformat(),
            "updated_at": pdc.updated_at.isoformat(),
            "adaptations": [
                {
                    "id": a.id,
                    "profile": a.profile_type,
                    "content_section": a.content_section,
                    "original_content": a.original_content,
                    "adapted_content": a.adapted_content,
                    "ai_confidence_score": a.ai_confidence_score,
                    "teacher_approved": a.teacher_approved,
                    "created_at": a.created_at.isoformat(),
                }
                for a in adaptations
            ],
        }

    async def update_pdc(
        self,
        pdc_id: int,
        request: UpdatePDCRequest,
    ) -> Optional[PDC]:
        """Update an existing PDC."""
        pdc = await self.get_pdc(pdc_id)
        if not pdc:
            return None

        if request.title:
            pdc.title = request.title
        if request.subject:
            pdc.subject = request.subject
        if request.content:
            pdc.content = request.content.dict() if hasattr(request.content, 'dict') else request.content
        if request.trimester:
            pdc.trimester = request.trimester

        pdc.version += 1

        await self.db.commit()
        await self.db.refresh(pdc)

        return pdc

    async def delete_pdc(self, pdc_id: int) -> bool:
        """Delete a PDC (soft or hard delete)."""
        pdc = await self.get_pdc(pdc_id)
        if not pdc:
            return False

        await self.db.delete(pdc)
        await self.db.commit()

        return True

    async def request_adaptations(
        self,
        pdc_id: int,
        request: AdaptationRequest,
    ) -> Dict[str, Any]:
        """Request AI adaptations for specific content sections.

        Args:
            pdc_id: PDC identifier
            request: Adaptation request with profiles, content_sections, etc.

        Returns:
            Status with adaptation request info
        """
        pdc = await self.get_pdc(pdc_id)
        if not pdc:
            raise ValueError(f"PDC {pdc_id} not found")

        # Validate requested profiles
        profiles = [
            NeuroDiversityProfile(p) if isinstance(p, str) else p
            for p in request.profiles
        ]

        # Store adaptation requests (will be processed async)
        adaptations_requested = []

        for profile in profiles:
            for section_key, section_content in request.content_sections.items():
                # Generate adaptation
                try:
                    adaptation_result = await self.gemini.adapt_content(
                        content=section_content,
                        content_type=request.content_type,
                        profile=profile,
                        subject=pdc.subject,
                        grade_level=pdc.grade_level,
                    )

                    # Store in database
                    adaptation = PDCAdaptation(
                        pdc_id=pdc_id,
                        profile_type=profile.value,
                        content_section=section_key,
                        original_content={"text": section_content},
                        adapted_content=adaptation_result,
                        ai_confidence_score=adaptation_result.get("ai_confidence_score", 0.85),
                        teacher_approved=False,
                        version=1,
                    )

                    self.db.add(adaptation)
                    adaptations_requested.append(adaptation)

                except Exception as e:
                    # Log error but continue with other profiles
                    print(f"Adaptation failed for {profile.value}: {str(e)}")

        await self.db.commit()

        return {
            "pdc_id": pdc_id,
            "adaptations_generated": len(adaptations_requested),
            "profiles": [p.value for p in profiles],
            "status": "completed",
        }

    async def approve_adaptation(
        self,
        pdc_id: int,
        adaptation_id: int,
        teacher_feedback: Optional[str] = None,
    ) -> Optional[PDCAdaptation]:
        """Approve an adaptation."""
        result = await self.db.execute(
            select(PDCAdaptation).where(
                PDCAdaptation.id == adaptation_id,
                PDCAdaptation.pdc_id == pdc_id,
            )
        )
        adaptation = result.scalars().first()

        if not adaptation:
            return None

        adaptation.teacher_approved = True
        if teacher_feedback:
            adaptation.teacher_feedback = teacher_feedback

        await self.db.commit()
        await self.db.refresh(adaptation)

        return adaptation

    async def reject_adaptation(
        self,
        pdc_id: int,
        adaptation_id: int,
        reason: Optional[str] = None,
        feedback: Optional[str] = None,
    ) -> Optional[PDCAdaptation]:
        """Reject an adaptation."""
        result = await self.db.execute(
            select(PDCAdaptation).where(
                PDCAdaptation.id == adaptation_id,
                PDCAdaptation.pdc_id == pdc_id,
            )
        )
        adaptation = result.scalars().first()

        if not adaptation:
            return None

        adaptation.teacher_approved = False
        if reason:
            adaptation.rejection_reason = reason
        if feedback:
            adaptation.teacher_feedback = feedback

        await self.db.commit()
        await self.db.refresh(adaptation)

        return adaptation

    async def list_pdc(
        self,
        school_id: int,
        subject: Optional[str] = None,
        grade_level: Optional[str] = None,
        trimester: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> tuple[List[PDC], int]:
        """List PDCs with optional filtering."""
        query = select(PDC).where(PDC.school_id == school_id)

        if subject:
            query = query.where(PDC.subject == subject)
        if grade_level:
            query = query.where(PDC.grade_level == grade_level)
        if trimester:
            query = query.where(PDC.trimester == trimester)

        # Count total
        count_result = await self.db.execute(select(PDC).where(*query.whereclause.clauses if hasattr(query.whereclause, 'clauses') else []))
        total = len(count_result.scalars().all())

        # Get paginated results
        query = query.offset(skip).limit(limit)
        result = await self.db.execute(query)
        pdcs = result.scalars().all()

        return pdcs, total
