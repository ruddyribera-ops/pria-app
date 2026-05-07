"""
Multiple Intelligences model for PDC content.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class MultipleIntelligence(Base):
    """Multiple intelligence types for PDC content."""
    __tablename__ = "inteligencias"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False, index=True)

    # Intelligence type (Gardner's 9 intelligences)
    type = Column(String, nullable=False)  # linguistic, logical, spatial, bodily, musical, interpersonal, intrapersonal, naturalistic, existential

    # Description of how this intelligence is addressed
    description = Column(Text, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC", back_populates="inteligencias")

    def __repr__(self):
        return f"<MultipleIntelligence {self.type} - PDC {self.pdc_id}>"
