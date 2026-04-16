"""Tests for db_pria password functions (bcrypt with SHA256 migration)."""

import pytest
import sys
import hashlib
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

import db as db


class TestBcryptHashing:
    """Test the new bcrypt-based password hashing."""

    def test_hash_password_returns_bcrypt_string(self):
        """New hashes should start with bcrypt prefix."""
        hashed = db._hash_password("mypassword")
        assert isinstance(hashed, str)
        assert hashed.startswith("$2b$")

    def test_hash_password_unique_per_call(self):
        """bcrypt uses random salt — same password produces different hashes."""
        h1 = db._hash_password("samepassword")
        h2 = db._hash_password("samepassword")
        assert h1 != h2

    def test_verify_password_correct_bcrypt(self):
        """Should return True for correct password against bcrypt hash."""
        hashed = db._hash_password("correct_password")
        assert db._verify_password("correct_password", hashed) is True

    def test_verify_password_wrong_bcrypt(self):
        """Should return False for wrong password against bcrypt hash."""
        hashed = db._hash_password("correct_password")
        assert db._verify_password("wrong_password", hashed) is False


class TestSHA256Migration:
    """Test backward-compatible verification of legacy SHA256 hashes."""

    def _legacy_hash(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()

    def test_verify_accepts_legacy_sha256(self):
        """Should accept valid SHA256 hash (legacy user logging in)."""
        legacy_hash = self._legacy_hash("mypassword")
        assert db._verify_password("mypassword", legacy_hash) is True

    def test_verify_rejects_wrong_password_sha256(self):
        """Should reject wrong password even against a SHA256 hash."""
        legacy_hash = self._legacy_hash("mypassword")
        assert db._verify_password("wrongpassword", legacy_hash) is False

    def test_is_legacy_hash_detects_sha256(self):
        """SHA256 hex digest should be flagged as legacy."""
        legacy_hash = self._legacy_hash("anything")
        assert db._is_legacy_hash(legacy_hash) is True

    def test_is_legacy_hash_detects_bcrypt(self):
        """bcrypt hash should NOT be flagged as legacy."""
        bcrypt_hash = db._hash_password("anything")
        assert db._is_legacy_hash(bcrypt_hash) is False


class TestSecurityProperties:
    """Verify security guarantees of the new hashing scheme."""

    def test_bcrypt_work_factor(self):
        """bcrypt hash should encode the configured work factor."""
        hashed = db._hash_password("password")
        # Format: $2b$<rounds>$...
        parts = hashed.split("$")
        rounds = int(parts[2])
        assert rounds == db._BCRYPT_ROUNDS

    def test_different_passwords_produce_different_hashes(self):
        """Different passwords must never produce the same hash."""
        h1 = db._hash_password("password1")
        h2 = db._hash_password("password2")
        assert h1 != h2

    def test_empty_password_handled(self):
        """Empty password should hash and verify without crashing."""
        hashed = db._hash_password("")
        assert db._verify_password("", hashed) is True
        assert db._verify_password("notempty", hashed) is False


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
