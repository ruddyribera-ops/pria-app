"""
ui/cache_redis.py - Redis-Backed Cache
=====================================
Redis-based caching layer with disk fallback.
Provides all the same functions as ui/cache.py but backed by Redis
with automatic fallback to disk cache if Redis is unavailable.

Features:
- Motor output cache with TTL
- Generic hash-based cache
- Graceful degradation when Redis is unavailable
- Session temp directory management (still on filesystem)
"""

import os
import io
import json
import hashlib
import shutil
import time
import uuid
import tempfile
import logging
from pathlib import Path
from typing import Optional, Any

# Optional Redis import - will fallback gracefully if not available
try:
    import redis

    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False
    redis = None

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════════
# PATHS & CONFIG
# ═══════════════════════════════════════════════════════════════════════════════


def _get_base_dir() -> str:
    return os.path.dirname(os.path.abspath(__file__))


def _secret(key: str, default: Optional[str] = None) -> Optional[str]:
    """Get secret from Streamlit secrets or environment."""
    try:
        import streamlit as st

        v = st.secrets.get(key, None)
        if v is not None:
            return v
    except Exception:
        pass
    return os.environ.get(key, default)


CACHE_DIR = Path(_secret("CACHE_DIR", os.path.join(_get_base_dir(), "cache_libros")))
LOG_DIR = Path(_secret("LOG_DIR", os.path.join(_get_base_dir(), "logs")))
SESSION_BASE_DIR = Path(tempfile.gettempdir()) / "pria_sessions"
REDIS_URL = os.environ.get("REDIS_URL", "redis://localhost:6379")

for _d in (CACHE_DIR, LOG_DIR, SESSION_BASE_DIR):
    _d.mkdir(parents=True, exist_ok=True)


# ═══════════════════════════════════════════════════════════════════════════════
# REDIS CLIENT (lazy initialization)
# ═══════════════════════════════════════════════════════════════════════════════


class _RedisClient:
    """Lazy Redis client with connection pooling and error handling."""

    _instance: Optional["_RedisClient"] = None
    _client: Optional[Any] = None
    _connected: bool = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def get_client(self) -> Optional[Any]:
        """Get Redis client, returning None if unavailable."""
        if not REDIS_AVAILABLE:
            return None

        if self._client is None:
            try:
                self._client = redis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=2,
                    socket_timeout=2,
                )
                # Test connection
                self._client.ping()
                self._connected = True
                logger.info("Redis connected successfully")
            except Exception as e:
                logger.warning(f"Redis connection failed, falling back to disk: {e}")
                self._client = None
                self._connected = False

        return self._client

    @property
    def is_connected(self) -> bool:
        return self._connected and self._client is not None


_redis = _RedisClient()


def _get_redis():
    """Get Redis client, may return None if Redis unavailable."""
    return _redis.get_client()


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR OUTPUT CACHE (Redis-backed, 7-day TTL)
# ═══════════════════════════════════════════════════════════════════════════════

_MOTOR_CACHE_TTL = 86400 * 7  # 7 days
_MOTOR_KEY_PREFIX = "motor:"


def _motor_cache_key(prompt_filename: str, variables: dict) -> str:
    """Stable hash key for a motor call: prompt name + sorted variable contents."""
    payload = json.dumps(
        {"motor": prompt_filename, "vars": variables},
        sort_keys=True,
        ensure_ascii=False,
    )
    return "motor_" + hashlib.sha256(payload.encode()).hexdigest()


def _cargar_motor_cache(key: str) -> Optional[Any]:
    """Return cached motor result from Redis, fallback to disk."""
    r = _get_redis()
    if r is not None:
        try:
            data = r.get(f"{_MOTOR_KEY_PREFIX}{key}")
            if data:
                entry = json.loads(data)
                # Check TTL via Redis
                ttl = r.ttl(f"{_MOTOR_KEY_PREFIX}{key}")
                if ttl > 0:
                    return entry.get("result")
        except Exception as e:
            logger.warning(f"Redis motor cache read failed: {e}")

    # Fallback to disk cache
    return _disk_cargar_motor_cache(key)


def _disk_cargar_motor_cache(key: str) -> Optional[Any]:
    """Fallback disk-based motor cache reader."""
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
    """Persist motor result to Redis (primary) with disk fallback."""
    entry = json.dumps(
        {"motor": motor, "result": result, "ts": time.time()},
        ensure_ascii=False,
        indent=2,
    )

    r = _get_redis()
    saved_to_redis = False

    if r is not None:
        try:
            r.setex(f"{_MOTOR_KEY_PREFIX}{key}", _MOTOR_CACHE_TTL, entry)
            saved_to_redis = True
        except Exception as e:
            logger.warning(f"Redis motor cache write failed: {e}")

    # Always also save to disk as backup
    _disk_guardar_motor_cache(key, result, motor)


def _disk_guardar_motor_cache(key: str, result: Any, motor: str) -> None:
    """Fallback disk-based motor cache writer."""
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
    """Delete all motor cache entries from Redis and disk."""
    r = _get_redis()

    if r is not None:
        try:
            # Delete motor keys from Redis
            cursor = 0
            while True:
                cursor, keys = r.scan(cursor, match=f"{_MOTOR_KEY_PREFIX}*", count=100)
                if keys:
                    r.delete(*keys)
                if cursor == 0:
                    break
        except Exception as e:
            logger.warning(f"Redis motor cache cleanup failed: {e}")

    # Also clean disk cache
    try:
        for nombre in CACHE_DIR.iterdir():
            if nombre.name.startswith("motor_") and nombre.name.endswith(".json"):
                nombre.unlink(missing_ok=True)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# GENERAL DISK CACHE (PDF analysis, diagnostics) - Redis-backed with hash keys
# ═══════════════════════════════════════════════════════════════════════════════


def _bytes_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


_CACHE_KEY_PREFIX = "cache:"


def _cargar_cache_hash(h: str) -> Optional[dict]:
    """Load generic cache entry by hash key from Redis, fallback to disk."""
    r = _get_redis()

    if r is not None:
        try:
            data = r.get(f"{_CACHE_KEY_PREFIX}{h}")
            if data:
                return json.loads(data)
        except Exception as e:
            logger.warning(f"Redis cache hash read failed: {e}")

    # Fallback to disk
    return _disk_cargar_cache_hash(h)


def _disk_cargar_cache_hash(h: str) -> Optional[dict]:
    """Fallback disk-based cache hash reader."""
    path = CACHE_DIR / f"{h}.json"
    if not path.exists():
        return None
    try:
        with open(path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None


def _guardar_cache_hash(h: str, data: dict) -> None:
    """Save generic cache entry by hash key to Redis (primary) with disk fallback."""
    r = _get_redis()

    if r is not None:
        try:
            r.setex(
                f"{_CACHE_KEY_PREFIX}{h}",
                _MOTOR_CACHE_TTL,
                json.dumps(data, ensure_ascii=False),
            )
        except Exception as e:
            logger.warning(f"Redis cache hash write failed: {e}")

    # Always also save to disk
    _disk_guardar_cache_hash(h, data)


def _disk_guardar_cache_hash(h: str, data: dict) -> None:
    """Fallback disk-based cache hash writer."""
    path = CACHE_DIR / f"{h}.json"
    try:
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception:
        pass


# ═══════════════════════════════════════════════════════════════════════════════
# SESSION TEMP FILES (still on filesystem)
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
# LOGGING (still file-based for reliability)
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
# MOTOR STATS (Redis hash for counters)
# ═══════════════════════════════════════════════════════════════════════════════

_MOTOR_STATS_KEY = "pria:motor_stats"


def get_motor_stats() -> dict:
    """Return motor usage statistics from Redis or in-memory fallback."""
    r = _get_redis()

    if r is not None:
        try:
            stats = r.hgetall(_MOTOR_STATS_KEY)
            if stats:
                return {
                    "total_motors": int(stats.get("total_motors", 0)),
                    "total_uses": int(stats.get("total_uses", 0)),
                    "success_rate": float(stats.get("success_rate", 0.0)),
                    "avg_duration": float(stats.get("avg_duration", 0.0)),
                    "motors": [],
                }
        except Exception as e:
            logger.warning(f"Redis motor stats read failed: {e}")

    # Return empty stats if Redis unavailable
    return {
        "total_motors": 0,
        "total_uses": 0,
        "success_rate": 0.0,
        "avg_duration": 0.0,
        "motors": [],
    }


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN CACHE MODULE FALLBACK
# ═══════════════════════════════════════════════════════════════════════════════
# This module can be used as a drop-in replacement for ui/cache.py
# All functions maintain the same signatures.
