"""
Momento model for PRIA v7 Planning Module
Represents the three phases of a lesson: Inicio, Desarrollo, Cierre
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, JSON, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Momento(Base):
    """Represents a learning moment within a weekly plan."""
    __tablename__ = "momentos"

    id = Column(Integer, primary_key=True, index=True)
    weekly_plan_id = Column(Integer, ForeignKey("weekly_plans.id"), nullable=False, index=True)

    # Momento type and metadata
    order = Column(Integer, nullable=False)  # 1=Inicio, 2=Desarrollo, 3=Cierre
    nombre = Column(String, nullable=False)  # "Inicio", "Desarrollo", or "Cierre"
    duration_minutes = Column(Integer, default=15)  # Default times: 15, 20, 10

    # Content
    content_text = Column(Text, nullable=True)  # Main lesson content
    recursos = Column(JSON, default=[])  # List of resources: ["proyector", "libros", ...]
    evaluacion = Column(Text, nullable=True)  # Assessment/evaluation for this moment

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    weekly_plan = relationship("WeeklyPlan", back_populates="momentos")
    micro_objetivos = relationship("MicroObjetivo", back_populates="momento", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Momento {self.nombre} ({self.duration_minutes}min)>"
