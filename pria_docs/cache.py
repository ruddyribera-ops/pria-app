"""Caching utilities for PRIA database queries."""

import streamlit as st
from functools import wraps
from typing import Callable, Any, Hashable
import hashlib
import json


def cache_query(ttl: int = 300, key_prefix: str = "q"):
    """
    Cache database query results with TTL.

    Args:
        ttl: Time to live in seconds (default 5 minutes)
        key_prefix: Prefix for cache key
    """

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            # Generate cache key from function name and args
            cache_key = _make_cache_key(func.__name__, args, kwargs, key_prefix)

            # Check if cached result exists and is fresh
            if cache_key in st.session_state:
                cached = st.session_state[cache_key]
                if cached.get("expires", 0) > st.session_state.get("run_id", 0):
                    return cached.get("result")

            # Execute function and cache result
            result = func(*args, **kwargs)
            st.session_state[cache_key] = {
                "result": result,
                "expires": st.session_state.get("run_id", 0) + ttl,
            }
            return result

        return wrapper

    return decorator


def cache_data(ttl: int = 300):
    """Cache generic data with TTL."""

    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            cache_key = f"cache_{func.__name__}_{_hash_args(args, kwargs)}"

            if cache_key in st.session_state:
                cached = st.session_state[cache_key]
                if cached.get("expires", 0) > st.session_state.get("run_id", 0):
                    return cached.get("result")

            result = func(*args, **kwargs)
            st.session_state[cache_key] = {
                "result": result,
                "expires": st.session_state.get("run_id", 0) + ttl,
            }
            return result

        return wrapper

    return decorator


def invalidate_cache(key_prefix: str = None):
    """Invalidate cache entries."""
    if key_prefix:
        # Remove entries matching prefix
        keys_to_remove = [
            k for k in st.session_state.keys() if k.startswith(key_prefix)
        ]
        for key in keys_to_remove:
            del st.session_state[key]
    else:
        # Clear all cache entries
        keys_to_remove = [
            k for k in st.session_state.keys() if k.startswith(("q", "cache_"))
        ]
        for key in keys_to_remove:
            del st.session_state[key]


def _make_cache_key(func_name: str, args: tuple, kwargs: dict, prefix: str) -> str:
    """Generate cache key from function name and arguments."""
    return f"{prefix}_{func_name}_{_hash_args(args, kwargs)}"


def _hash_args(args: tuple, kwargs: dict) -> str:
    """Create hash from arguments."""
    serializable = [str(a) for a in args] + [str(k) for k in kwargs.items()]
    combined = "|".join(serializable)
    return hashlib.md5(combined.encode()).hexdigest()[:12]


# ─────────────────────────────────────────────────────────────────────────────
# Streamlit-specific cache decorators (using native caching)
# ─────────────────────────────────────────────────────────────────────────────

from streamlit.runtime.scriptrunner import cache_utils


@cache_utils.cache_memoized
def cached_get_sesiones(user_id: int = None):
    """Cached: Get sesiones (memoized per user session)."""
    # This uses Streamlit's native memoization
    from db_pria import get_sesiones as _get_sesiones

    return _get_sesiones(user_id)


@cache_utils.cache_memoized
def cached_get_usuarios():
    """Cached: Get all usuarios."""
    from db_pria import get_all_usuarios as _get_usuarios

    return _get_usuarios()
