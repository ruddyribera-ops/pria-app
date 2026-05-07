"""
MicroObjetivo model for PRIA v7 Planning Module
Represents SMART micro-objectives derived from lesson moments
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class MicroObjetivo(Base):
    """Represents a micro-objective within a weekly plan or momento."""
    __tablename__ = "micro_objetivos"

    id = Column(Integer, primary_key=True, index=True)
    weekly_plan_id = Column(Integer, ForeignKey("weekly_plans.id"), nullable=False, index=True)
    momento_id = Column(Integer, ForeignKey("momentos.id"), nullable=True, index=True)

    # Objective content and properties
    texto = Column(Text, nullable=False)  # SMART objective text
    verificable = Column(Boolean, default=True)  # Is it measurable/verifiable?
    completado = Column(Boolean, default=False)  # Has it been completed?
    prioridad = Column(String, default="normal")  # "baja", "normal", "alta"

    # Dependency tracking (self-referential for prerequisite chains)
    depende_de = Column(Integer, ForeignKey("micro_objetivos.id"), nullable=True)  # Parent objective ID

    # Tracking
    origin_week = Column(Integer, nullable=True)  # Which week it originated from (for carry-over)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    weekly_plan = relationship("WeeklyPlan", back_populates="micro_objetivos")
    momento = relationship("Momento", back_populates="micro_objetivos")

    # Self-referential relationship for dependencies
    micro_objetivos_dependencias = relationship(
        "MicroObjetivo",
        remote_side=[id],
        foreign_keys=[depende_de],
        backref="dependencias_de_mi"
    )

    def __repr__(self):
        status = "✓" if self.completado else "○"
        return f"<MicroObjetivo {status} {self.prioridad} - {self.texto[:50]}...>"
