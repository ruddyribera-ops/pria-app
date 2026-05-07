"""
Health check and status routes
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.database import get_db

router = APIRouter()

@router.get("/")
async def health_check(db: Session = Depends(get_db)):
    """Health check endpoint"""
    try:
        # Test database connection
        db.execute(text("SELECT 1"))
        return {
            "status": "healthy",
            "service": "PRIA v7 API",
            "version": "0.1.0",
            "database": "connected"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "service": "PRIA v7 API",
            "version": "0.1.0",
            "database": "disconnected",
            "error": str(e)
        }

@router.get("/live")
async def liveness_probe():
    """Kubernetes liveness probe"""
    return {"status": "alive"}

@router.get("/ready")
async def readiness_probe(db: Session = Depends(get_db)):
    """Kubernetes readiness probe"""
    try:
        db.execute(text("SELECT 1"))
        return {"status": "ready"}
    except Exception:
        return {"status": "not_ready"}
