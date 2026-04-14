"""Enhanced authentication with salt and role-based access control."""

import hashlib
import secrets
import streamlit as st
from functools import wraps
from typing import Callable, Any, Optional
from enum import Enum


class Role(Enum):
    """User roles for RBAC."""

    ADMIN = "admin"
    TEACHER = "teacher"
    VIEWER = "viewer"


# Role hierarchy (higher index = more permissions)
ROLE_HIERARCHY = {
    Role.ADMIN: 3,
    Role.TEACHER: 2,
    Role.VIEWER: 1,
}


def generate_salt() -> str:
    """Generate a cryptographically secure salt."""
    return secrets.token_hex(32)


def hash_password(password: str, salt: str) -> str:
    """Hash password with salt using SHA-256."""
    combined = f"{salt}{password}".encode()
    return hashlib.sha256(combined).hexdigest()


def verify_password(password: str, salt: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    return hash_password(password, salt) == password_hash


def hash_api_key(api_key: str) -> str:
    """Hash API key for storage."""
    return hashlib.sha256(api_key.encode()).hexdigest()


# ─────────────────────────────────────────────────────────────────────────────
# RBAC Decorator
# ─────────────────────────────────────────────────────────────────────────────


def require_role(*allowed_roles: Role):
    """Decorator to restrict access by role."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            user = get_current_user()
            if not user:
                st.error("🔒 Debes iniciar sesión para acceder.")
                st.stop()

            user_role = Role(user.get("rol", "viewer"))
            required_level = min(ROLE_HIERARCHY[r] for r in allowed_roles)

            if ROLE_HIERARCHY[user_role] < required_level:
                st.error(f"🔒 No tienes permisos para esta acción.")
                st.stop()

            return func(*args, **kwargs)

        return wrapper

    return decorator


def get_current_user() -> Optional[dict]:
    """Get currently logged in user from session state."""
    return st.session_state.get("user")


def is_admin() -> bool:
    """Check if current user is admin."""
    user = get_current_user()
    return user and user.get("rol") == Role.ADMIN.value


def is_teacher() -> bool:
    """Check if current user is teacher or admin."""
    user = get_current_user()
    return user and user.get("rol") in [Role.TEACHER.value, Role.ADMIN.value]


def check_permission(required_role: Role) -> bool:
    """Check if current user has required role."""
    user = get_current_user()
    if not user:
        return False
    user_role = Role(user.get("rol", "viewer"))
    return ROLE_HIERARCHY[user_role] >= ROLE_HIERARCHY[required_role]
