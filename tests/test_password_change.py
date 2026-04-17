"""
tests/test_password_change.py — Password change enforcement tests
=================================================================
Tests for Task 2: force password change on first login.
Covers must_change_password flag, cambiar_password, and verificar_login integration.
"""

import pytest
import sys, os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))
os.chdir(Path(__file__).parent.parent)


@pytest.fixture
def tmp_pg(monkeypatch):
    """Use a temporary SQLite DB for this test module."""
    import tempfile, db._base

    fd, path = tempfile.mkstemp(suffix=".db")
    os.close(fd)
    monkeypatch.setenv("DATABASE_URL", "")  # force SQLite
    monkeypatch.setattr(db._base, "_DB_PATH", path)
    monkeypatch.setattr(db._base, "_USE_PG", False)
    # Re-init so the temp path is used
    db._base.init_db()
    yield path
    os.unlink(path)


class TestMustChangePassword:
    """Tests for must_change_password flag."""

    def test_new_user_has_must_change_flag(self, tmp_pg):
        """New user created via crear_usuario has must_change_password=True."""
        from db import crear_usuario, get_usuario_by_email

        result = crear_usuario(
            email="test_mcp_new@test.com",
            password="TestPassword123",
            nombre="Test MCP User",
            nombre_hoja="TEST HOJA",
            rol="docente",
            must_change_password=True,
        )
        assert result is True

        user = get_usuario_by_email("test_mcp_new@test.com")
        assert user is not None
        assert user.get("must_change_password") == 1

    def test_new_user_default_must_change_true(self, tmp_pg):
        """New user defaults to must_change_password=True if not specified."""
        from db import crear_usuario, get_usuario_by_email

        crear_usuario(
            email="test_mcp_default@test.com",
            password="TestPassword123",
            nombre="Test Default",
            nombre_hoja="TEST HOJA",
            rol="docente",
        )

        user = get_usuario_by_email("test_mcp_default@test.com")
        assert user is not None
        assert user.get("must_change_password") == 1

    def test_cambiar_password_flips_flag(self, tmp_pg):
        """cambiar_password sets must_change_password=0 after change."""
        from db import (
            crear_usuario,
            cambiar_password,
            get_usuario_by_id,
            get_usuario_by_email,
        )

        crear_usuario(
            email="test_flip@test.com",
            password="OldPassword123",
            nombre="Test Flip",
            nombre_hoja="TEST HOJA",
            rol="docente",
        )

        user = get_usuario_by_email("test_flip@test.com")
        assert user.get("must_change_password") == 1

        result = cambiar_password(int(user["id"]), "NewPassword456")
        assert result is True

        updated = get_usuario_by_id(int(user["id"]))
        assert updated.get("must_change_password") == 0

    def test_cambiar_password_rejects_same_password(self, tmp_pg):
        """cambiar_password raises ValueError if new password == old password."""
        from db import crear_usuario, cambiar_password, get_usuario_by_email

        crear_usuario(
            email="test_same@test.com",
            password="SamePassword123",
            nombre="Test Same",
            nombre_hoja="TEST HOJA",
            rol="docente",
        )

        user = get_usuario_by_email("test_same@test.com")

        with pytest.raises(ValueError, match="different"):
            cambiar_password(int(user["id"]), "SamePassword123")

    def test_verificar_login_returns_must_change_flag(self, tmp_pg):
        """verificar_login returns must_change_password in user dict."""
        from db import crear_usuario, verificar_login

        crear_usuario(
            email="test_login_flag@test.com",
            password="LoginPassword123",
            nombre="Test Login Flag",
            nombre_hoja="TEST HOJA",
            rol="docente",
        )

        user = verificar_login("test_login_flag@test.com", "LoginPassword123")
        assert user is not None
        assert "must_change_password" in user
        assert user.get("must_change_password") == 1

    def test_cambiar_password_then_login_flag_is_zero(self, tmp_pg):
        """After password change, flag is 0 and subsequent login returns 0."""
        from db import (
            crear_usuario,
            cambiar_password,
            verificar_login,
            get_usuario_by_email,
        )

        crear_usuario(
            email="test_after@test.com",
            password="Original123",
            nombre="Test After",
            nombre_hoja="TEST HOJA",
            rol="docente",
        )

        user = get_usuario_by_email("test_after@test.com")
        assert user.get("must_change_password") == 1

        cambiar_password(int(user["id"]), "Changed456")

        user2 = verificar_login("test_after@test.com", "Changed456")
        assert user2 is not None
        assert user2.get("must_change_password") == 0
