"""Tests for PRIA error handling module."""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pria.errors import (
    PRIAError,
    DatabaseError,
    AuthenticationError,
    ValidationError,
    AIError,
)


class TestPRIAErrors:
    """Test custom exception classes."""

    def test_pria_error_basic(self):
        """PRIAError should store message."""
        err = PRIAError("test error")
        assert err.message == "test error"
        assert err.user_message is not None

    def test_pria_error_custom_user_message(self):
        """Should allow custom user message."""
        err = PRIAError("internal", "user facing message")
        assert err.message == "internal"
        assert err.user_message == "user facing message"

    def test_database_error(self):
        """DatabaseError should inherit from PRIAError."""
        err = DatabaseError("DB error")
        assert isinstance(err, PRIAError)

    def test_authentication_error(self):
        """AuthenticationError should inherit from PRIAError."""
        err = AuthenticationError("Auth failed")
        assert isinstance(err, PRIAError)

    def test_validation_error(self):
        """ValidationError should inherit from PRIAError."""
        err = ValidationError("Invalid input")
        assert isinstance(err, PRIAError)

    def test_ai_error(self):
        """AIError should inherit from PRIAError."""
        err = AIError("API failed")
        assert isinstance(err, PRIAError)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
