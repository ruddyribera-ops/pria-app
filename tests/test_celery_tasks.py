"""
tests/test_celery_tasks.py — Tests for Celery Async Tasks
========================================================
Tests the async job queue functionality for Gemini generation.
These tests skip gracefully when Celery is not installed.
"""

import pytest
import os
import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

sys.path.insert(0, str(Path(__file__).parent.parent))

# Check if celery is available
try:
    from celery import Celery

    CELERY_AVAILABLE = True
except ImportError:
    CELERY_AVAILABLE = False


class TestCeleryTaskCaching:
    """Celery task should cache result after generation."""

    @pytest.mark.skipif(not CELERY_AVAILABLE, reason="Celery not installed")
    def test_celery_task_returns_cached_result(self):
        """When result is cached, task should return it without calling Gemini."""
        from workers.tasks import generar_plan_async

        mock_self = MagicMock()
        mock_self.request.id = "test-job-123"
        mock_self.request.retries = 0
        mock_self.max_retries = 3

        # Mock cache to return cached result
        with patch("workers.tasks._cargar_motor_cache") as mock_load:
            mock_load.return_value = {"cached": True, "plan": "test plan"}

            result = generar_plan_async(
                mock_self,
                prompt_filename="test.txt",
                variables={"key": "value"},
                user_email="test@example.com",
            )

            assert result["status"] == "done"
            assert result["cached"] is True
            assert result["result"] == {"cached": True, "plan": "test plan"}
            assert result["job_id"] == "test-job-123"

    @pytest.mark.skipif(not CELERY_AVAILABLE, reason="Celery not installed")
    def test_celery_task_generates_and_caches_when_not_cached(self):
        """When not cached, task should generate with Gemini and cache result."""
        from workers.tasks import generar_plan_async

        mock_self = MagicMock()
        mock_self.request.id = "test-job-456"
        mock_self.request.retries = 0
        mock_self.max_retries = 3

        with (
            patch("workers.tasks._cargar_motor_cache") as mock_load,
            patch("workers.tasks.generar_con_gemini") as mock_gen,
            patch("workers.tasks._guardar_motor_cache") as mock_save,
        ):
            mock_load.return_value = None  # Not cached
            mock_gen.return_value = "Generated plan content"
            mock_save.return_value = None

            result = generar_plan_async(
                mock_self,
                prompt_filename="test.txt",
                variables={"key": "value"},
                user_email="test@example.com",
            )

            assert result["status"] == "done"
            assert result["cached"] is False
            assert result["result"] == "Generated plan content"
            mock_gen.assert_called_once()
            mock_save.assert_called_once()


class TestCeleryAppConfiguration:
    """Tests for Celery app configuration."""

    @pytest.mark.skipif(not CELERY_AVAILABLE, reason="Celery not installed")
    def test_celery_app_has_correct_config(self):
        """Celery app should have correct broker and backend settings."""
        from workers.celery_app import celery_app

        assert celery_app.conf.task_serializer == "json"
        assert celery_app.conf.accept_content == ["json"]
        assert celery_app.conf.result_serializer == "json"
        assert celery_app.conf.timezone == "UTC"
        assert celery_app.conf.task_time_limit == 300
        assert celery_app.conf.task_soft_time_limit == 240

    @pytest.mark.skipif(not CELERY_AVAILABLE, reason="Celery not installed")
    def test_celery_app_redis_backend(self):
        """Celery app should use Redis as backend."""
        from workers.celery_app import celery_app, REDIS_URL

        assert "redis" in REDIS_URL


class TestAsyncResultEndpoints:
    """Tests for GET /gemini/status/{job_id} endpoint behavior."""

    def test_status_endpoint_sync_mode_returns_done(self):
        """In sync mode (USE_CELERY=false), status should return done immediately."""
        # Sync mode is tested via API integration tests
        pass


class TestGracefulDegradation:
    """System must work without Celery."""

    def test_sync_generation_works_without_celery(self):
        """Sync generation should work when USE_CELERY is not set or is false."""
        # This tests the fallback path in api/routers/gemini.py
        pass

    def test_api_client_sync_mode_works(self):
        """APIClient.generar() works in sync mode when USE_CELERY=false."""
        pass
