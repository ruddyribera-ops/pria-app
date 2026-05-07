"""
Database configuration for PRIA v7
PostgreSQL with SQLAlchemy
"""
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import NullPool

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://pria_dev:pria_dev_password_123@localhost:5432/pria_v7"
)

# Create engine
engine = create_engine(
    DATABASE_URL,
    poolclass=NullPool,  # Disable connection pooling for development
    echo=os.getenv("DEBUG", "False") == "True",
)

# Session factory
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)

# Base class for models
Base = declarative_base()

# Dependency for FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Create all tables
def init_db():
    """Create all database tables"""
    # Import models to register them with Base
    from app.models.user import User, School
    from app.models.pdc import PDC, WeeklyPlan

    Base.metadata.create_all(bind=engine)

if __name__ == "__main__":
    init_db()
    print("[OK] Database initialized successfully")
