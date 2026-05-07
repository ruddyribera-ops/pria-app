"""
PDC (Plan de Desarrollo Curricular) model for PRIA v7
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON
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

    # Metadata
    version = Column(Integer, default=1)
    is_published = Column(Integer, default=False)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    user = relationship("User", back_populates="pdcs")
    weekly_plans = relationship("WeeklyPlan", back_populates="pdc", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<PDC {self.subject} - {self.grade_level}>"

class WeeklyPlan(Base):
    __tablename__ = "weekly_plans"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False)

    # Week info
    week_number = Column(Integer, nullable=False)  # 1-16 for trimester
    start_date = Column(DateTime, nullable=False)
    end_date = Column(DateTime, nullable=False)

    # Content (stored as JSON)
    # Structure: {"days": [{"date": "...", "lessons": [...]}]}
    lessons = Column(JSON, default=[])
    units_covered = Column(JSON, default=[])

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC", back_populates="weekly_plans")

    def __repr__(self):
        return f"<WeeklyPlan Week {self.week_number}>"
