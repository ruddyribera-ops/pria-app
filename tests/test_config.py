"""Tests for PRIA config module."""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from pria.config import AppConfig, Constants


class TestAppConfig:
    """Test application configuration."""

    def test_default_values(self):
        """Config should have sensible defaults."""
        config = AppConfig()
        assert config.app_name == "PRIA"
        assert config.app_version == "5.4"
        assert config.debug is False

    def test_database_defaults(self):
        """Database should default to SQLite."""
        config = AppConfig()
        assert config.database_url is None
        assert config.db_path == "pria_estado.db"

    def test_ai_defaults(self):
        """AI should have reasonable defaults."""
        config = AppConfig()
        assert config.gemini_model == "gemini-1.5-pro"
        assert config.gemini_max_tokens == 8192

    def test_security_defaults(self):
        """Security should have secure defaults."""
        config = AppConfig()
        assert config.session_timeout == 3600
        assert config.max_login_attempts == 5

    def test_timeouts(self):
        """Timeouts should be properly set."""
        assert Constants.API_TIMEOUT == 120
        assert Constants.CACHE_TTL == 300

    def test_limits(self):
        """Limits should be properly set."""
        assert Constants.MAX_SESIONES == 100
        assert Constants.MAX_OBJETIVOS == 50
        assert Constants.MAX_PLAN_LENGTH == 5000

    def test_pagination(self):
        """Pagination should have sensible defaults."""
        assert Constants.DEFAULT_PAGE_SIZE == 20
        assert Constants.MAX_PAGE_SIZE == 100


class TestConstants:
    """Test constant values."""

    def test_file_size_limit(self):
        """Max file size should be 10MB."""
        assert Constants.MAX_FILE_SIZE == 10 * 1024 * 1024

    def test_ui_constants(self):
        """UI constants should be set."""
        assert Constants.SIDEBAR_WIDTH == 300
        assert Constants.THEME == "dark"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
