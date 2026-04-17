"""
api/config.py — API-specific configuration
==========================================
"""

import os
from functools import lru_cache


@lru_cache
def get_settings() -> dict:
    return {
        "SECRET_KEY": os.environ.get("JWT_SECRET", "changeme-in-prod"),
        "ALGORITHM": "HS256",
        "ACCESS_TOKEN_EXPIRE_MINUTES": 60 * 24,  # 24 hours
        "REFRESH_TOKEN_EXPIRE_DAYS": 7,
    }
