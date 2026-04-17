"""
api/routers/gemini.py — Gemini Generation Endpoints
===================================================
Supports both synchronous (default) and async (Celery) generation modes.
When USE_CELERY=true, jobs are enqueued and polled via /status/{job_id}.
"""

import os
from fastapi import APIRouter, Depends

from api.deps import get_current_teacher
from ui.cache import _motor_cache_key, _cargar_motor_cache, _guardar_motor_cache

router = APIRouter(prefix="/gemini", tags=["gemini"])


def _get_prompts_dir() -> str:
    """Get the prompts directory path."""
    # Navigate from api/ to project root, then to prompts_maestros
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    return os.path.join(base_dir, "prompts_maestros")


@router.post("/generar")
def generar(
    prompt_filename: str,
    variables: dict,
    expect_json: bool = False,
    current_user: dict = Depends(get_current_teacher),
):
    """
    Enqueue a plan generation job. Returns immediately with a job_id when
    USE_CELERY=true. Otherwise generates synchronously (blocking).

    Poll /gemini/status/{job_id} to get the result when async.
    """
    use_celery = os.environ.get("USE_CELERY", "false").lower() == "true"

    if use_celery:
        # Enqueue job via Celery
        from workers.tasks import generar_plan_async

        task = generar_plan_async.delay(
            prompt_filename=prompt_filename,
            variables=variables,
            user_email=current_user.get("email", ""),
        )
        return {
            "status": "enqueued",
            "job_id": task.id,
            "poll_url": f"/gemini/status/{task.id}",
        }
    else:
        # Fall back to synchronous generation (current behavior)
        return _generar_sync(prompt_filename, variables, expect_json)


def _generar_sync(
    prompt_filename: str, variables: dict, expect_json: bool = False
) -> dict:
    """Synchronous generation with caching (original behavior)."""
    try:
        from ui.gemini import generar_con_gemini
    except ImportError:
        return {"error": "Gemini module not available", "cached": False}

    # Check cache first
    cache_key = _motor_cache_key(prompt_filename, variables)
    cached = _cargar_motor_cache(cache_key)
    if cached is not None:
        return {"cached": True, "result": cached}

    # Generate
    result = generar_con_gemini(
        prompt_filename=prompt_filename,
        variables=variables,
        expect_json=expect_json,
    )

    # Cache it if generation succeeded
    if result is not None:
        _guardar_motor_cache(cache_key, result, prompt_filename)

    return {"cached": False, "result": result}


@router.get("/status/{job_id}")
def get_job_status(
    job_id: str,
    current_user: dict = Depends(get_current_teacher),
):
    """
    Poll for job status. Works with both Celery async and sync modes.

    - Celery mode: checks AsyncResult from Redis
    - Sync mode: returns done (jobs complete immediately)
    """
    use_celery = os.environ.get("USE_CELERY", "false").lower() == "true"

    if use_celery:
        from workers.celery_app import celery_app

        task = celery_app.AsyncResult(job_id)

        if task.state == "PENDING":
            return {"status": "pending", "ready": False}
        elif task.state == "STARTED":
            return {"status": "running", "ready": False}
        elif task.state == "SUCCESS":
            result = task.result
            return {"status": "done", "ready": True, **result}
        elif task.state == "FAILURE":
            return {
                "status": "failed",
                "ready": True,
                "error": str(task.info)[:500] if task.info else "Unknown error",
            }
        else:
            return {"status": task.state.lower(), "ready": False}
    else:
        # No async — jobs are synchronous, should already be done
        return {"status": "done", "ready": True}


@router.get("/motores")
def listar_motores(current_user: dict = Depends(get_current_teacher)):
    """List available prompt files (motores)."""
    prompts_dir = _get_prompts_dir()
    if os.path.exists(prompts_dir):
        files = [f for f in os.listdir(prompts_dir) if f.endswith(".txt")]
    else:
        files = []
    return {"motores": files}


@router.get("/cache/stats")
def cache_stats(current_user: dict = Depends(get_current_teacher)):
    """Get motor cache statistics."""
    try:
        from ui.cache import get_motor_stats

        return get_motor_stats()
    except ImportError:
        return {"error": "Cache module not available"}
