#!/bin/bash
# PRIA startup script (Railway / local).
#
# Behavior:
#   - Always runs setup_secrets.py + seed_db.py (idempotent)
#   - Starts FastAPI only if USE_API=true (default: false; saves RAM)
#   - Starts Celery worker only if USE_CELERY=true AND CELERY_BROKER_URL is set
#   - Always starts Streamlit as the main (foreground) process
#
# Why: on Railway a single service exposes one $PORT. Streamlit owns it.
# FastAPI on :8000 is unreachable externally from a single-service deploy,
# so we don't boot it unless someone is actually consuming it internally
# (e.g., a second Railway service acting as the API gateway).
set -e

echo "=== Running setup_secrets.py ==="
python setup_secrets.py || echo "  [warn] setup_secrets.py failed; continuing"

echo "=== Running seed_db.py ==="
python seed_db.py || echo "  [warn] seed_db.py failed; continuing"

if [ "${USE_API:-false}" = "true" ]; then
    echo "=== Starting FastAPI on :8000 ==="
    uvicorn api.main:app --host 0.0.0.0 --port 8000 &
    echo "FastAPI PID: $!"
fi

if [ "${USE_CELERY:-false}" = "true" ] && [ -n "${CELERY_BROKER_URL:-}" ]; then
    echo "=== Starting Celery worker ==="
    celery -A workers.celery_app worker --loglevel=info &
    echo "Celery PID: $!"
elif [ "${USE_CELERY:-false}" = "true" ]; then
    echo "  [warn] USE_CELERY=true but CELERY_BROKER_URL unset — skipping worker"
fi

PORT="${PORT:-8080}"
echo "=== Starting Streamlit on :$PORT ==="
exec streamlit run app_ui.py \
    --server.port "$PORT" \
    --server.address 0.0.0.0 \
    --server.headless true
