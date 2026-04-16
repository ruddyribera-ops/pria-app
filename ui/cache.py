"""
ui/cache.py - Caching Logic
===========================
Disk-based caching for PDF analysis, motor outputs, and diagnostics.
"""

import os
import io
import json
import hashlib
import shutil
import time
import uuid
import tempfile
from pathlib import Path
from typing import Optional, Any


# ═══════════════════════════════════════════════════════════════════════════════
# PATHS
# ═══════════════════════════════════════════════════════════════════════════════


def _get_base_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Get secret from Streamlit secrets or environment."""
    import os as _os

    try:
        import streamlit as st

        v = st.secrets.get(key, None)
        if v is not None:
            return v
    except Exception:
        pass
    return _os.environ.get(key, default)


CACHE_DIR = Path(_secret("CACHE_DIR", os.path.join(_get_base_dir(), "cache_libros")))
LOG_DIR = Path(_secret("LOG_DIR", os.path.join(_get_base_dir(), "logs")))
SESSION_BASE_DIR = Path(tempfile.gettempdir()) / "pria_sessions"

for _d in (CACHE_DIR, LOG_DIR, SESSION_BASE_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR OUTPUT CACHE (7-day TTL)
# ═══════════════════════════════════════════════════════════════════════════════

_MOTOR_CACHE_TTL = 86400 * 7  # 7 days


def _motor_cache_key(prompt_filename: str, variables: dict) -> str:
    """Stable hash key for a motor call: prompt name + sorted variable contents."""
    payload = json.dumps(
        {"motor": prompt_filename, "vars": variables},
        sort_keys=True,
        ensure_ascii=False,
    )
    return "motor_" + hashlib.sha256(payload.encode()).hexdigest()


def _cargar_motor_cache(key: str) -> Optional[Any]:
    """Return cached motor result or None if missing/expired."""
    path = CACHE_DIR / f"{key}.json"
    if not path.exists():
        return None
    try:
        if time.time() - path.stat().st_mtime > _MOTOR_CACHE_TTL:
            path.unlink(missing_ok=True)
            return None
        with open(path, "r", encoding="utf-8") as fh:
            entry = json.load(fh)
        return entry.get("result")
    except Exception:
        return None


def _guardar_motor_cache(key: str, result: Any, motor: str) -> None:
    """Persist a motor result to disk cache."""
    path = CACHE_DIR / f"{key}.json"
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(
                {"motor": motor, "result": result, "ts": time.time()},
                fh,
                ensure_ascii=False,
                indent=2,
            )
    except Exception:
        pass


def limpiar_motor_cache() -> None:
    """Delete all motor_*.json cache files. Called from sidebar clear button."""
    try:
        for nombre in CACHE_DIR.iterdir():
            if nombre.name.startswith("motor_") and nombre.name.endswith(".json"):
                nombre.unlink(missing_ok=True)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# GENERAL DISK CACHE (PDF analysis, diagnostics)
# ═══════════════════════════════════════════════════════════════════════════════


def _bytes_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _cargar_cache_hash(h: str) -> Optional[dict]:
    """Load generic cache entry by hash key."""
    path = CACHE_DIR / f"{h}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def _guardar_cache_hash(h: str, data: dict) -> None:
    """Save generic cache entry by hash key."""
    path = CACHE_DIR / f"{h}.json"
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION TEMP FILES
# ═══════════════════════════════════════════════════════════════════════════════


def get_session_temp_dir() -> str:
    """Get or create a temp directory for the current session."""
    import streamlit as st

    if not st.session_state.get("session_id"):
        st.session_state.session_id = str(uuid.uuid4())
    session_dir = SESSION_BASE_DIR / st.session_state.session_id
    session_dir.mkdir(parents=True, exist_ok=True)
    return str(session_dir)


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION CLEANUP
# ═══════════════════════════════════════════════════════════════════════════════


def cleanup_old_sessions(max_age_seconds: int = 86400) -> None:
    """Delete session directories older than max_age_seconds."""
    try:
        ahora = time.time()
        for nombre in SESSION_BASE_DIR.iterdir():
            if nombre.is_dir() and ahora - nombre.stat().st_mtime > max_age_seconds:
                shutil.rmtree(nombre, ignore_errors=True)
    except Exception:
        pass


def cleanup_old_cache(max_age_seconds: int = 86400 * 30) -> None:
    """Delete cache files older than max_age_seconds (but not motor cache)."""
    try:
        ahora = time.time()
        for nombre in CACHE_DIR.iterdir():
            if nombre.is_file() and not nombre.name.startswith("motor_"):
                if ahora - nombre.stat().st_mtime > max_age_seconds:
                    nombre.unlink(missing_ok=True)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════════════════════════


def log_event(action: str, success: bool, error_msg: str = "") -> None:
    """Write an event to the pilot log."""
    import datetime
    import streamlit as st

    entry = {
        "ts": datetime.datetime.utcnow().isoformat(),
        "session": (st.session_state.get("session_id") or "")[:8],
        "action": action,
        "ok": success,
        "err": error_msg[:300] if error_msg else "",
    }
    try:
        log_path = LOG_DIR / "pilot.log"
        with open(log_path, "a", encoding="utf-8") as fh:
            fh.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR STATS (stub for now)
# ═══════════════════════════════════════════════════════════════════════════════


def get_motor_stats() -> dict:
    """Return motor usage statistics."""
    return {
        "total_motors": 0,
        "total_uses": 0,
        "success_rate": 0.0,
        "avg_duration": 0.0,
        "motors": [],
    }
