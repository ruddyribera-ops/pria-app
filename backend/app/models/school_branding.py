"""
SchoolBranding model for managing school logo, colors, and branding configuration in PRIA v7
Singleton pattern: only one branding record per deployment
"""
from sqlalchemy import Column, Integer, String, Text, DateTime
from datetime import datetime
from app.database import Base


class SchoolBranding(Base):
    __tablename__ = "school_branding"

    id = Column(Integer, primary_key=True, index=True)

    # School metadata
    school_name = Column(String, default="Las Palmas", nullable=False)

    # Branding assets
    logo_url = Column(String, nullable=True)  # S3 URL or local path

    # Colors (hex format)
    header_color = Column(String, default="#D52B1E", nullable=False)  # Red (Las Palmas primary)
    footer_color = Column(String, default="#FDB927", nullable=False)  # Gold (Las Palmas secondary)
    accent_color = Column(String, default="#007934", nullable=False)  # Green (Las Palmas accent)

    # Typography
    primary_font = Column(String, default="Arial", nullable=False)  # "Arial", "Verdana", or "Georgia"
    footer_text = Column(Text, nullable=True)  # School address, contact info, etc.

    # Metadata
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self):
        return f"<SchoolBranding {self.school_name}>"
