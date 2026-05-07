"""
Adaptation model for neuroinclusive curriculum adaptations.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Adaptation(Base):
    """AI-generated neuroinclusive adaptations for PDC content."""
    __tablename__ = "adaptations"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False, index=True)

    # Profile and content details
    profile = Column(String, nullable=False)  # dyslexia, adhd, autism, dyscalculia
    content = Column(Text, nullable=False)  # Adapted content text

    # Approval status
    approved = Column(Boolean, default=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC", back_populates="adaptations")

    def __repr__(self):
        return f"<Adaptation {self.profile} - PDC {self.pdc_id}>"
