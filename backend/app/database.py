"""
Database configuration for PRIA v7
PostgreSQL with SQLAlchemy (async)
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool, AsyncAdaptedQueuePool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+asyncpg://pria_dev:pria_dev_password_123@localhost:5432/pria_v7"
)

# Async engine
engine = create_async_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling for development
    echo=os.getenv("DEBUG", "False") == "True",
)

# Async session factory
AsyncSessionLocal = sessionmaker(
    engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI (async)
async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Alias for explicit async dependency
async def get_async_db() -> AsyncSession:
    """Async database session dependency for FastAPI."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

def init_db():
    """Create all database tables (sync version for CLI use)"""
    import importlib

    # Import models to register them with Base
    from app.models.user import User, School
    from app.models.pdc import PDC, WeeklyPlan, PDCAdaptation, AdaptationCache
    from app.models.adaptaciones import Adaptation
    from app.models.inteligencias import MultipleIntelligence
    from app.models.productos import Product
    from app.models.momento import Momento
    from app.models.microobjetivo import MicroObjetivo
    from app.models.calendario_escolar import CalendarioEscolar
    from app.models.user_profile import UserProfile
    from app.models.student_profile import StudentProfile
    from app.models.export_job import ExportJob
    from app.models.school_branding import SchoolBranding

    # Create sync engine for init
    sync_url = DATABASE_URL.replace("postgresql+asyncpg://", "postgresql://")
    sync_engine = create_engine(sync_url, poolclass=NullPool)
    Base.metadata.create_all(bind=sync_engine)
    sync_engine.dispose()

if __name__ == "__main__":
    init_db()
    print("[OK] Database initialized successfully")
