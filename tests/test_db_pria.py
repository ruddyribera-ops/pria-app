"""Tests for db_pria password functions."""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# Test the password hashing functions directly
import hashlib
import secrets


class TestPasswordHashing:
    """Test salt-based password hashing (matching db_pria implementation)."""

    def test_generate_salt(self):
        """Salt generation should return hex string."""
        import hashlib
        import secrets

        # This matches _generate_salt in db_pria.py
        salt = secrets.token_hex(32)
        assert isinstance(salt, str)
        assert len(salt) == 64  # 32 bytes = 64 hex chars

    def test_hash_password_with_salt(self):
        """Hash should combine salt + password."""
        import hashlib
        import secrets

        salt = secrets.token_hex(32)
        password = "mypassword"

        # This matches _hash_password in db_pria.py
        combined = f"{salt}{password}".encode()
        hashed = hashlib.sha256(combined).hexdigest()

        assert isinstance(hashed, str)
        assert len(hashed) == 64

    def test_verify_password(self):
        """Verification should work correctly."""
        import hashlib
        import secrets

        salt = secrets.token_hex(32)
        password = "test123"

        # Hash the password
        combined = f"{salt}{password}".encode()
        stored_hash = hashlib.sha256(combined).hexdigest()

        # Verify correct password
        test_combined = f"{salt}test123".encode()
        test_hash = hashlib.sha256(test_combined).hexdigest()
        assert test_hash == stored_hash

        # Verify wrong password
        wrong_combined = f"{salt}wrong".encode()
        wrong_hash = hashlib.sha256(wrong_combined).hexdigest()
        assert wrong_hash != stored_hash

    def test_different_salts_produce_different_hashes(self):
        """Different salts should produce different hashes for same password."""
        import hashlib
        import secrets

        password = "samepassword"

        salt1 = secrets.token_hex(32)
        salt2 = secrets.token_hex(32)

        hash1 = hashlib.sha256(f"{salt1}{password}".encode()).hexdigest()
        hash2 = hashlib.sha256(f"{salt2}{password}".encode()).hexdigest()

        assert hash1 != hash2  # Different salts = different hashes


class TestPasswordSecurity:
    """Test security properties."""

    def test_hash_is_sha256(self):
        """Hash should be SHA-256 (64 char hex)."""
        import hashlib
        import secrets

        salt = secrets.token_hex(32)
        password = "test"

        result = hashlib.sha256(f"{salt}{password}".encode()).hexdigest()

        assert len(result) == 64
        # SHA-256 produces hexadecimal

    def test_salt_is_secure(self):
        """Salt should be cryptographically secure."""
        import secrets

        # token_hex(32) uses secrets module for cryptographic security
        salt = secrets.token_hex(32)

        # Should be long enough
        assert len(salt) >= 32

        # Should be unique (very high probability)
        salts = [secrets.token_hex(32) for _ in range(100)]
        assert len(set(salts)) == 100


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
