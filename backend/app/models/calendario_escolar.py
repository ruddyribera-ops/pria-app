"""
CalendarioEscolar model for PRIA v7 Planning Module
School calendar with vacations, holidays, and events for Las Palmas 2026
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, Date, ForeignKey
from datetime import date
from app.database import Base


class CalendarioEscolar(Base):
    """School calendar events and vacation periods."""
    __tablename__ = "calendario_escolar"

    id = Column(Integer, primary_key=True, index=True)
    escuela_id = Column(Integer, nullable=False, index=True)  # Soft FK for future multi-school support

    # Event details
    fecha = Column(Date, nullable=False, index=True)
    nombre_evento = Column(String, nullable=False)  # e.g., "VACACIONES DE INVIERNO", "Día del Maestro"
    descripcion = Column(Text, nullable=True)
    tipo = Column(String, nullable=False)  # "vacation", "holiday", "event"

    # Metadata
    created_at = Column(DateTime, nullable=False, default=lambda: DateTime.utcnow)

    def __repr__(self):
        return f"<CalendarioEscolar {self.fecha} - {self.nombre_evento}>"
