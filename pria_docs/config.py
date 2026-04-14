"""Configuration management for PRIA."""

import os
from pathlib import Path
from typing import Optional
from dataclasses import dataclass


@dataclass
class AppConfig:
    """Application configuration."""

    # App settings
    app_name: str = "PRIA"
    app_version: str = "5.4"
    debug: bool = False

    # Database
    database_url: Optional[str] = None
    db_path: str = "pria_estado.db"

    # AI / Gemini
    gemini_model: str = "gemini-1.5-pro"
    gemini_max_tokens: int = 8192
    gemini_temperature: float = 0.7

    # Security
    session_timeout: int = 3600  # seconds
    max_login_attempts: int = 5

    # Paths
    base_dir: Path = Path(__file__).parent
    log_dir: Path = Path("logs")
    output_dir: Path = Path("outputs")
    prompts_dir: Path = Path("prompts_maestros")

    # Features
    enable_ai: bool = True
    enable_export_docx: bool = True
    enable_export_pptx: bool = True

    @classmethod
    def from_env(cls) -> "AppConfig":
        """Load configuration from environment variables."""
        config = cls()

        # Database
        config.database_url = os.environ.get("DATABASE_URL")

        # AI
        config.gemini_model = os.environ.get("GEMINI_MODEL", config.gemini_model)
        config.gemini_max_tokens = int(os.environ.get("GEMINI_MAX_TOKENS", "8192"))

        # Debug
        config.debug = os.environ.get("DEBUG", "").lower() == "true"

        return config

    def get_db_path(self) -> Path:
        """Get database file path."""
        if self.database_url:
            # PostgreSQL - URL provided
            return Path(self.database_url)
        return self.base_dir.parent / self.db_path


# Global configuration instance
config = AppConfig.from_env()


# Constants (magic numbers extracted)
class Constants:
    """Application constants."""

    # Timeouts
    API_TIMEOUT = 120  # seconds
    CACHE_TTL = 300  # seconds (5 min)

    # Limits
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
    MAX_SESIONES = 100
    MAX_OBJETIVOS = 50
    MAX_PLAN_LENGTH = 5000

    # Pagination
    DEFAULT_PAGE_SIZE = 20
    MAX_PAGE_SIZE = 100

    # UI
    SIDEBAR_WIDTH = 300
    THEME = "dark"
