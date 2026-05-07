"""
Product model for PDC deliverables and outcomes.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class Product(Base):
    """Learning products/deliverables for PDC content."""
    __tablename__ = "productos"

    id = Column(Integer, primary_key=True, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False, index=True)

    # Product type and details
    type = Column(String, nullable=False)  # project, presentation, artifact, portfolio, etc.
    description = Column(Text, nullable=False)

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    pdc = relationship("PDC", back_populates="productos")

    def __repr__(self):
        return f"<Product {self.type} - PDC {self.pdc_id}>"
