"""
workers/__init__.py — PRIA Celery Workers Package
================================================
"""

from .celery_app import celery_app
from .tasks import generar_plan_async

__all__ = ["celery_app", "generar_plan_async"]
