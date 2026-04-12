"""
conftest.py — Shared pytest fixtures for db_pria tests.
Handles the dual-backend (SQLite/PostgreSQL) detection by forcing SQLite
in all tests via monkeypatching, ensuring repeatable isolated test runs.
"""

import os
import sys
import pytest
import tempfile
import importlib


@pytest.fixture
def temp_db(monkeypatch, tmp_path):
    """Points db_pria to a temporary SQLite file for the test session."""
    db_file = str(tmp_path / "test_pria.db")
    monkeypatch.setenv("DATABASE_URL", "")
    _clear_db_pria_cache()
    import db_pria

    importlib.reload(db_pria)
    db_pria._DB_PATH = db_file
    db_pria._USE_PG = False
    db_pria.init_db()
    yield db_pria
    _clear_db_pria_cache()


@pytest.fixture
def db(temp_db):
    """Fresh initialized DB, ready for each test."""
    yield temp_db


@pytest.fixture
def seed_user(db):
    """Creates and returns a standard test user."""
    db.crear_usuario(
        "test@laspalmas.edu.bo",
        "TestPass123!",
        "Profesor Test",
        "TEST",
        "docente",
    )
    user = db.get_usuario_by_email("test@laspalmas.edu.bo")
    return user


def _clear_db_pria_cache():
    """Remove all db_pria modules from sys.modules so they re-import fresh."""
    to_remove = [k for k in sys.modules if k == "db_pria" or k.startswith("db_pria.")]
    for k in to_remove:
        del sys.modules[k]
