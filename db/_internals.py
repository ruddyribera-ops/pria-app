"""
db/_internals.py — Private helpers used across DAOs
====================================================
These are internal utilities (prefixed with _) not part of the public API.
"""

import hashlib, bcrypt
from ._base import _conn, _ph

_BCRYPT_ROUNDS = 12


def _hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt. Returns a UTF-8 string."""
    return bcrypt.hashpw(
        password.encode(), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)
    ).decode()


def _verify_password(password: str, stored_hash: str) -> bool:
    """Check password against stored hash. Supports both bcrypt and legacy SHA256."""
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        return bcrypt.checkpw(password.encode(), stored_hash.encode())
    else:
        return stored_hash == hashlib.sha256(password.encode()).hexdigest()


def _is_legacy_hash(stored_hash: str) -> bool:
    return not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"))


def _hash_token(token: str) -> str:
    return hashlib.sha256(str(token or "").encode()).hexdigest()
