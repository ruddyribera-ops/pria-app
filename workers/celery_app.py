"""
workers/celery_app.py — Celery Application Configuration
=======================================================
Async job queue configuration for PRIA plan generation.
Uses Redis as broker and result backend.
"""

from celery import Celery
import os

REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379/0")

celery_app = Celery(
    "pria",
    broker=REDIS_URL,
    backend=REDIS_URL,
    include=["workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=300,  # 5 min max
    task_soft_time_limit=240,  # 4 min soft limit
    result_expires=3600,  # results expire in 1 hour
)
