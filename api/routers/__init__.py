"""
api/routers/__init__.py — API Routers Package
==============================================
"""

from .auth import router as auth_router
from .sesiones import router as sesiones_router
from .planes import router as planes_router
from .gemini import router as gemini_router
from .admin import router as admin_router

__all__ = [
    "auth_router",
    "sesiones_router",
    "planes_router",
    "gemini_router",
    "admin_router",
]
