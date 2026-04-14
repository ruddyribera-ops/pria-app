"""Global error handling and logging system for PRIA."""

import logging
import traceback
import streamlit as st
from functools import wraps
from datetime import datetime
from pathlib import Path
from typing import Callable, Any

# Configure logging
LOG_DIR = Path("logs")
LOG_DIR.mkdir(exist_ok=True)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    handlers=[logging.FileHandler(LOG_DIR / "pria.log"), logging.StreamHandler()],
)
logger = logging.getLogger("pria")


class PRIAError(Exception):
    """Base exception for PRIA application."""

    def __init__(self, message: str, user_message: str = None):
        self.message = message
        self.user_message = (
            user_message or "Ha ocurrido un error. Por favor, intente de nuevo."
        )
        super().__init__(self.message)


class DatabaseError(PRIAError):
    """Database-related errors."""

    pass


class AuthenticationError(PRIAError):
    """Authentication/authorization errors."""

    pass


class ValidationError(PRIAError):
    """Input validation errors."""

    pass


class AIError(PRIAError):
    """AI/Gemini API errors."""

    pass


def handle_error(exc: Exception) -> None:
    """Display user-friendly error message."""
    log_msg = f"{type(exc).__name__}: {str(exc)}"
    logger.error(log_msg)
    logger.debug(traceback.format_exc())

    if isinstance(exc, PRIAError):
        st.error(f"❌ {exc.user_message}")
    else:
        st.error("❌ Ha ocurrido un error inesperado.")


def error_handled(func: Callable) -> Callable:
    """Decorator to catch and handle errors in functions."""

    @wraps(func)
    def wrapper(*args, **kwargs) -> Any:
        try:
            return func(*args, **kwargs)
        except PRIAError as e:
            handle_error(e)
            return None
        except Exception as e:
            logger.exception(f"Unhandled error in {func.__name__}")
            handle_error(e)
            return None

    return wrapper


def log_user_action(action: str, details: dict = None) -> None:
    """Log user actions for audit trail."""
    entry = {
        "timestamp": datetime.now().isoformat(),
        "action": action,
        "details": details or {},
    }
    logger.info(f"USER_ACTION: {action} | {details}")
