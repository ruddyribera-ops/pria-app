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

    # School calendar
    SCHOOL_START_YEAR = 2026
    SCHOOL_START_MONTH = 2
    SCHOOL_START_DAY = 2
    SCHOOL_DAYS_YEAR = 66  # approximately 33 weeks * 5 days / 2

    # School hours
    NIVEL_PRIMARIA_RECESSOS = [("10:10", "10:30"), ("12:00", "12:15")]
    NIVEL_SECUNDARIA_RECESSOS = [("09:25", "10:10"), ("11:15", "12:00")]

    # Block types
    BLOQUE_TYPES = {
        "ingreso": "Horario de Ingreso",
        "clase": "Clase",
        "vigilancia_recreo": "Vigilancia Recreo",
        "atencion_ppff": "Atención a PPFF",
        "planificacion": "Planificación / API",
        "recreo_libre": "Recreo Libre",
    }

    # Days
    DAYS_ES = ["lunes", "martes", "miercoles", "jueves", "viernes"]
    DAYS_LABEL = {
        "lunes": "Lunes",
        "martes": "Martes",
        "miercoles": "Miércoles",
        "jueves": "Jueves",
        "viernes": "Viernes",
    }
    MESES_LABEL = {
        1: "enero",
        2: "febrero",
        3: "marzo",
        4: "abril",
        5: "mayo",
        6: "junio",
        7: "julio",
        8: "agosto",
        9: "septiembre",
        10: "octubre",
        11: "noviembre",
        12: "diciembre",
    }
