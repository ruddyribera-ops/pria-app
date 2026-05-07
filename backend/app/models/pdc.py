"""
PDC (Plan de Desarrollo Curricular) model for PRIA v7
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Boolean, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class PDC(Base):
    __tablename__ = "pdcs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    school_id = Column(Integer, ForeignKey("schools.id"), nullable=False)

    # Basic info
    subject = Column(String, nullable=False)  # e.g., "Tecnología"
    grade_level = Column(String, nullable=False)  # e.g., "5to Primaria"
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)

    # Trimester info
    trimester = Column(Integer, nullable=False)  # 1, 2, or 3
    school_year = Column(Integer, nullable=False)  # 2026

    # Content (stored as JSON)
    # Structure: {"units": [{"name": "...", "duration": 4, "lessons": [...]}]}
    content = Column(JSON, default={})

    # MESCP Columns (Modelo Educativo Socio-Crítico Progresista)
    objetivo = Column(Text, nullable=True)  # Learning objectives
    contenidos = Column(Text, nullable=True)  # Content/knowledge
    momentos = Column(Text, nullable=True)  # Lesson moments (Inicio, Desarrollo, Cierre)
    recursos = Column(Text, nullable=True)  # Resources and materials
    periodos = Column(Text, nullable=True)  # Time periods/durations
    criterios = Column(Text, nullable=True)  # Assessment criteria

    # Metadata
    version = Column(Integer, default=1)
    is_published = Column(Integer, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="pdcs")
    weekly_plans = relationship("WeeklyPlan", back_populates="pdc", cascade="all, delete-orphan")
    adaptations = relationship("Adaptation", back_populates="pdc", cascade="all, delete-orphan")
    inteligencias = relationship("MultipleIntelligence", back_populates="pdc", cascade="all, delete-orphan")
    productos = relationship("Product", back_populates="pdc", cascade="all, delete-orphan")
    export_jobs = relationship("ExportJob", back_populates="pdc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PDC {self.subject} - {self.grade_level}>"

class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False, index=True)

    # Week info
    week_number = Column(Integer, nullable=False)  # 15-30 (Las Palmas 2026)
    subject = Column(String, nullable=True)  # Subject for this week (cached from PDC)
    grade_level = Column(String, nullable=True)  # Grade level (cached from PDC)

    # Status and dates
    status = Column(String, default="draft")  # "draft", "published", "completed"
    start_date = Column(DateTime, nullable=True)
    end_date = Column(DateTime, nullable=True)

    # Content (stored as JSON) - Legacy support
    # Structure: {"days": [{"date": "...", "lessons": [...]}]}
    lessons = Column(JSON, default=[])
    units_covered = Column(JSON, default=[])

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC", back_populates="weekly_plans")
    momentos = relationship("Momento", back_populates="weekly_plan", cascade="all, delete-orphan")
    micro_objetivos = relationship("MicroObjetivo", back_populates="weekly_plan", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<WeeklyPlan Week {self.week_number} - {self.status}>"


class PDCAdaptation(Base):
    """AI-generated neuroinclusive adaptations for PDC content."""
    __tablename__ = "pdc_adaptations"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False, index=True)

    # Adaptation details
    profile_type = Column(String, nullable=False)  # dyslexia, adhd, autism, dyscalculia
    content_section = Column(String, nullable=False)  # section identifier within PDC
    section_id = Column(String, nullable=True)  # optional: specific lesson/unit ID

    # Content
    original_content = Column(JSON, nullable=False)  # {"text": "..."}
    adapted_content = Column(JSON, nullable=False)  # Full adaptation response from Gemini

    # Quality metrics
    ai_confidence_score = Column(Float, default=0.85)  # 0.0-1.0
    teacher_approved = Column(Boolean, default=False)  # Teacher validation
    teacher_feedback = Column(Text, nullable=True)  # Teacher comments
    rejection_reason = Column(String, nullable=True)  # Why teacher rejected

    # Versioning
    version = Column(Integer, default=1)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC")

    def __repr__(self):
        return f"<PDCAdaptation {self.profile_type} - {self.content_section}>"


class AdaptationCache(Base):
    """Cache for AI adaptations to reduce API calls and costs."""
    __tablename__ = "adaptation_cache"

    id = Column(Integer, primary_key=True, index=True)

    # Cache key based on content hash
    content_hash = Column(String, unique=True, nullable=False, index=True)  # MD5 hash
    profile_type = Column(String, nullable=False, index=True)
    content_section = Column(String, nullable=True, index=True)

    # Cached adaptation
    cached_adaptation = Column(JSON, nullable=False)

    # Cache expiration
    expires_at = Column(DateTime, nullable=False, index=True)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    hits = Column(Integer, default=0)  # Number of times used

    def __repr__(self):
        return f"<AdaptationCache {self.profile_type}>"
