"""
User accessibility profile model for PRIA v7
Stores user accessibility preferences and neuroinclusive settings
"""
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Float
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class UserProfile(Base):
    """User accessibility and neuroinclusive profile preferences."""

    __tablename__ = "user_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False, index=True)

    # Accessibility profile selection: default|dislexia|adhd|tea|dyscalculia
    accessibility_profile = Column(String, default="default", nullable=False)

    # Font size override (10-20 pt), nullable means use default
    font_size_override = Column(Float, nullable=True)

    # Color scheme preference: light|dark|high_contrast
    color_scheme = Column(String, default="light", nullable=False)

    # Reduce motion/animations preference
    reduced_motion = Column(Boolean, default=False, nullable=False)

    # Preferred language (ISO 639-1 code)
    preferred_language = Column(String, default="es", nullable=False)

    # Audit fields
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    user = relationship("User", back_populates="accessibility_profile")

    def __repr__(self):
        return f"<UserProfile user_id={self.user_id} profile={self.accessibility_profile}>"
