"""
workers/tasks.py — Celery Tasks for Async Plan Generation
========================================================
Handles async generation of plans using Gemini with caching.
"""

from workers.celery_app import celery_app
from ui.gemini import generar_con_gemini
from ui.cache import _motor_cache_key, _guardar_motor_cache, _cargar_motor_cache


@celery_app.task(bind=True, max_retries=3)
def generar_plan_async(self, prompt_filename: str, variables: dict, user_email: str):
    """
    Generate a plan asynchronously.

    Steps:
    1. Check if already cached
    2. If cached, return cached result
    3. If not, generate with Gemini
    4. Retry up to 3 times on failure
    5. Cache the result
    6. Return the result
    """
    cache_key = _motor_cache_key(prompt_filename, variables)

    # Check cache first
    cached = _cargar_motor_cache(cache_key)
    if cached:
        return {
            "status": "done",
            "cached": True,
            "result": cached,
            "job_id": self.request.id,
        }

    # Try to generate
    try:
        result = generar_con_gemini(
            prompt_filename=prompt_filename,
            variables=variables,
            expect_json=False,
        )

        # Cache it
        _guardar_motor_cache(cache_key, result, prompt_filename)

        return {
            "status": "done",
            "cached": False,
            "result": result,
            "job_id": self.request.id,
        }

    except Exception as exc:
        # Retry with exponential backoff
        if self.request.retries < self.max_retries:
            import math

            wait_time = math.pow(2, self.request.retries) * 10  # 10, 20, 40 sec
            raise self.retry(exc=exc, countdown=wait_time)

        return {
            "status": "failed",
            "error": str(exc)[:500],
            "job_id": self.request.id,
        }
