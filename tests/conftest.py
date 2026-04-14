"""Pytest configuration and shared fixtures."""

import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))


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
