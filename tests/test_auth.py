"""Tests for PRIA authentication module."""

import pytest
import sys
from pathlib import Path

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from pria.auth import (
    generate_salt,
    hash_password,
    verify_password,
    Role,
    check_permission,
)


class TestPasswordHashing:
    """Test password hashing functions."""

    def test_generate_salt_returns_string(self):
        """Salt should be a non-empty string."""
        salt = generate_salt()
        assert isinstance(salt, str)
        assert len(salt) > 0

    def test_generate_salt_is_unique(self):
        """Each salt should be unique."""
        salts = [generate_salt() for _ in range(10)]
        assert len(set(salts)) == 10

    def test_hash_password_returns_hex(self):
        """Hash should be a hexadecimal string."""
        salt = generate_salt()
        hashed = hash_password("test123", salt)
        assert isinstance(hashed, str)
        assert len(hashed) == 64  # SHA-256 hex = 64 chars

    def test_verify_password_correct(self):
        """Should return True for correct password."""
        salt = generate_salt()
        hashed = hash_password("mypassword", salt)
        assert verify_password("mypassword", salt, hashed) is True

    def test_verify_password_incorrect(self):
        """Should return False for incorrect password."""
        salt = generate_salt()
        hashed = hash_password("mypassword", salt)
        assert verify_password("wrongpassword", salt, hashed) is False


class TestRoleHierarchy:
    """Test role-based access control."""

    def test_admin_has_highest权限(self):
        """Admin should have highest permission level."""
        from pria.auth import ROLE_HIERARCHY

        assert ROLE_HIERARCHY[Role.ADMIN] > ROLE_HIERARCHY[Role.TEACHER]
        assert ROLE_HIERARCHY[Role.ADMIN] > ROLE_HIERARCHY[Role.VIEWER]

    def test_teacher_permissions(self):
        """Teacher should have more permissions than viewer."""
        from pria.auth import ROLE_HIERARCHY

        assert ROLE_HIERARCHY[Role.TEACHER] > ROLE_HIERARCHY[Role.VIEWER]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
