"""
api/main.py — FastAPI Application Entry Point
==============================================
"""

from fastapi import FastAPI, Response, WebSocket
from fastapi.middleware.cors import CORSMiddleware

from api.monitoring import PrometheusMiddleware
from api.routers import (
    auth_router,
    sesiones_router,
    planes_router,
    gemini_router,
    admin_router,
)

app = FastAPI(
    title="PRIA API",
    description="PRIA Streamlit app REST API - Planning Neuro-Inclusive",
    version="5.8",
)

# Prometheus metrics middleware
app.add_middleware(PrometheusMiddleware)

# CORS middleware - allow Streamlit frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(sesiones_router)
app.include_router(planes_router)
app.include_router(gemini_router)
app.include_router(admin_router)


@app.get("/health")
def health():
    """Health check endpoint."""
    return {"status": "ok"}


@app.get("/ready")
def ready():
    """Readiness check endpoint."""
    return {"status": "ready", "version": "5.8"}


@app.get("/metrics")
def metrics():
    """Prometheus metrics endpoint."""
    from api.monitoring import generate_latest, CONTENT_TYPE_LATEST

    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


@app.websocket("/ws/jobs/{job_id}")
async def job_status_websocket(websocket: WebSocket, job_id: str, token: str):
    """
    WebSocket endpoint for real-time job status updates.

    Connect with: ws://host/ws/jobs/{job_id}?token={jwt_token}
    Receives JSON status updates until job completes or fails.
    """
    # Verify token
    try:
        from api.deps import get_current_user_from_token

        user = get_current_user_from_token(token)
    except Exception:
        await websocket.close(code=4001)
        return

    await websocket.accept()

    import os

    use_celery = os.environ.get("USE_CELERY", "false").lower() == "true"

    if use_celery:
        from workers.celery_app import celery_app

        while True:
            task = celery_app.AsyncResult(job_id)

            if task.state == "PENDING":
                await websocket.send_json({"status": "pending", "ready": False})
            elif task.state == "STARTED":
                await websocket.send_json({"status": "running", "ready": False})
            elif task.state == "SUCCESS":
                await websocket.send_json(
                    {"status": "done", "ready": True, **task.result}
                )
                break
            elif task.state == "FAILURE":
                await websocket.send_json(
                    {
                        "status": "failed",
                        "ready": True,
                        "error": str(task.info)[:500] if task.info else "Unknown error",
                    }
                )
                break
            else:
                await websocket.send_json(
                    {"status": task.state.lower(), "ready": False}
                )

            import asyncio

            await asyncio.sleep(1)  # Poll every second

    await websocket.close()
