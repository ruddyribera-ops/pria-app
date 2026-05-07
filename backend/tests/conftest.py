"""
Pytest fixtures and configuration for PRIA v7 backend tests
Provides test database, FastAPI app, and auth fixtures
"""
import os
import pytest
import pytest_asyncio
from datetime import datetime, timedelta
from typing import AsyncGenerator

from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from httpx import AsyncClient

from app.main import app
from app.database import Base, get_db
from app.models.user import User, School
from app.models.pdc import PDC, WeeklyPlan, PDCAdaptation
from app.models.moment import Momento
from app.models.microobjetivo import MicroObjetivo
from app.models.calendar_escolar import CalendarioEscolar
from app.models.user_profile import UserProfile
from app.models.export_job import ExportJob
from app.auth.utils import hash_password, create_access_token


# Use in-memory SQLite for testing
TEST_SQLALCHEMY_DATABASE_URL = "sqlite+aiosqlite:///:memory:"


@pytest_asyncio.fixture
async def engine():
    """Create test async engine."""
    engine = create_async_engine(
        TEST_SQLALCHEMY_DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=None,
    )

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    yield engine

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await engine.dispose()


@pytest_asyncio.fixture
async def async_session_factory(engine):
    """Create async session factory."""
    return sessionmaker(
        engine,
        class_=AsyncSession,
        autocommit=False,
        autoflush=False,
        expire_on_commit=False,
    )


@pytest_asyncio.fixture
async def async_session(async_session_factory) -> AsyncGenerator[AsyncSession, None]:
    """Provide async session for tests."""
    async with async_session_factory() as session:
        yield session
        await session.rollback()


@pytest_asyncio.fixture
async def app_with_db(async_session_factory):
    """Create FastAPI app with test database."""
    async def override_get_db():
        async with async_session_factory() as session:
            yield session

    app.dependency_overrides[get_db] = override_get_db
    yield app
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def client(app_with_db):
    """Provide AsyncClient for testing."""
    async with AsyncClient(app=app_with_db, base_url="http://test") as client:
        yield client


@pytest_asyncio.fixture
async def school(async_session: AsyncSession) -> School:
    """Create test school."""
    school = School(
        name="Las Palmas School",
        short_name="LPSCH",
        city="Las Palmas",
        country="Bolivia",
        logo_url="https://example.com/logo.png"
    )
    async_session.add(school)
    await async_session.commit()
    await async_session.refresh(school)
    return school


@pytest_asyncio.fixture
async def user(async_session: AsyncSession, school: School) -> User:
    """Create test user."""
    user = User(
        email="test@example.com",
        full_name="Test User",
        password_hash=hash_password("password123"),
        school_id=school.id,
        is_active=True,
        is_admin=False
    )
    async_session.add(user)
    await async_session.commit()
    await async_session.refresh(user)
    return user


@pytest_asyncio.fixture
async def token(user: User) -> str:
    """Generate JWT token for test user."""
    return create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(hours=24)
    )


@pytest_asyncio.fixture
async def pdc(async_session: AsyncSession, user: User) -> PDC:
    """Create test PDC with MESCP rows."""
    pdc = PDC(
        user_id=user.id,
        school_id=user.school_id,
        title="Test PDC",
        subject="Matemáticas",
        grade_level="6",
        trimester=1,
        version=1,
        content={
            "objetivo_general": "Develop mathematical skills",
            "mescp_rows": [
                {
                    "objetivo": "Solve equations",
                    "contenidos": "Linear equations",
                    "estrategias": "Hands-on practice",
                    "criterios": "90% accuracy",
                    "productos": "Worksheet solutions",
                    "evidencias": "Student portfolio"
                }
            ]
        }
    )
    async_session.add(pdc)
    await async_session.commit()
    await async_session.refresh(pdc)
    return pdc


@pytest_asyncio.fixture
async def weekly_plan(async_session: AsyncSession, pdc: PDC) -> WeeklyPlan:
    """Create test weekly plan."""
    plan = WeeklyPlan(
        pdc_id=pdc.id,
        week_number=1,
        status="draft",
        content={
            "tema": "Week 1 Theme",
            "momentos": {
                "inicio": {"duration": 10, "content": "Warm-up"},
                "desarrollo": {"duration": 30, "content": "Main lesson"},
                "cierre": {"duration": 5, "content": "Wrap-up"}
            }
        }
    )
    async_session.add(plan)
    await async_session.commit()
    await async_session.refresh(plan)
    return plan


@pytest_asyncio.fixture
async def user_profile(async_session: AsyncSession, user: User) -> UserProfile:
    """Create test user accessibility profile."""
    profile = UserProfile(
        user_id=user.id,
        profile_name="default",
        font_family="default",
        font_size=16,
        text_color="#000000",
        background_color="#FFFFFF",
        line_spacing=1.5,
        contrast_level="normal"
    )
    async_session.add(profile)
    await async_session.commit()
    await async_session.refresh(profile)
    return profile


@pytest_asyncio.fixture
async def export_job(async_session: AsyncSession, user: User, pdc: PDC) -> ExportJob:
    """Create test export job."""
    job = ExportJob(
        user_id=user.id,
        pdc_id=pdc.id,
        format="docx",
        status="queued",
        file_url=None,
        error_message=None
    )
    async_session.add(job)
    await async_session.commit()
    await async_session.refresh(job)
    return job


@pytest.fixture
def headers(token: str):
    """Generate authorization headers."""
    return {"Authorization": f"Bearer {token}"}
