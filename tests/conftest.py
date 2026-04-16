"""Pytest configuration and shared fixtures."""

import pytest
import sys
import os
import tempfile
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


@pytest.fixture
def db(tmp_path, monkeypatch):
    """
    Provide db_pria module pointed at an isolated SQLite file.

    Each test gets a fresh, empty database so tests are fully independent.
    The module-level _DB_PATH and _USE_PG are patched to avoid touching
    the real database or any DATABASE_URL env var.
    """
    import db_pria

    test_db = str(tmp_path / "test_pria.db")
    monkeypatch.setattr(db_pria, "_DB_PATH", test_db)
    monkeypatch.setattr(db_pria, "_USE_PG", False)
    monkeypatch.delenv("DATABASE_URL", raising=False)

    db_pria.init_db()
    return db_pria


@pytest.fixture
def sample_user():
    """Sample user data for testing."""
    return {
        "id": 1,
        "email": "test@pria.es",
        "nombre": "Test Teacher",
        "rol": "teacher",
    }


@pytest.fixture
def sample_admin():
    """Sample admin user for testing."""
    return {"id": 1, "email": "admin@pria.es", "nombre": "Test Admin", "rol": "admin"}


@pytest.fixture
def mock_session_state():
    """Mock Streamlit session state."""
    try:
        import streamlit as st

        if "user" not in st.session_state:
            st.session_state.user = None
        return st.session_state
    except Exception:
        # Streamlit not available in test environment
        return {}
