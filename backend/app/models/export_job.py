"""
ExportJob model for tracking document export operations in PRIA v7
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base


class ExportJob(Base):
    __tablename__ = "export_jobs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    pdc_id = Column(Integer, ForeignKey("pdcs.id"), nullable=False)

    # Export format and status
    format = Column(String, nullable=False)  # "docx", "xlsx", "pdf", or "zip"
    status = Column(String, default="queued", index=True)  # "queued", "processing", "complete", "failed"
    progress = Column(Integer, default=0)  # 0-100

    # Output and errors
    file_url = Column(String, nullable=True)  # Local path or S3 URL
    error_message = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    completed_at = Column(DateTime, nullable=True)

    # Relationships
    user = relationship("User", back_populates="export_jobs")
    pdc = relationship("PDC", back_populates="export_jobs")

    def __repr__(self):
        return f"<ExportJob {self.id} - {self.format} - {self.status}>"


# Indexes for common queries
__table_args__ = (
    Index('idx_export_jobs_user_id', 'user_id'),
    Index('idx_export_jobs_status', 'status'),
    Index('idx_export_jobs_created_at', 'created_at'),
)
