"""
Student accessibility profile model for PRIA v7
Stores student accessibility needs and diagnoses for teacher reports
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON, Index
from datetime import datetime
from app.database import Base


class StudentProfile(Base):
    """Student accessibility profile for neuroinclusive support."""

    __tablename__ = "student_profiles"

    id = Column(Integer, primary_key=True, index=True)
    school_id = Column(Integer, nullable=False, index=True)  # Soft FK, not enforced
    student_name = Column(String, nullable=False)

    # Diagnosis: dislexia|adhd|tea|dyscalculia|none
    diagnostico = Column(String, default="none", nullable=False)

    # Learning strengths (JSON array of strings)
    # Example: ["visual_learner", "kinesthetic", "pattern_recognition"]
    learning_strengths = Column(JSON, default=[], nullable=False)

    # Accommodations needed (JSON array of strings)
    # Example: ["large_font", "extra_time", "visual_aids", "oral_assessment"]
    accommodations = Column(JSON, default=[], nullable=False)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Indexes for efficient querying
    __table_args__ = (
        Index("ix_student_profiles_school_id", "school_id"),
        Index("ix_student_profiles_diagnostico", "diagnostico"),
    )

    def __repr__(self):
        return f"<StudentProfile {self.student_name} ({self.diagnostico})>"
