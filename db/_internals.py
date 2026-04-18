"""
db/_internals.py — Private helpers used across DAOs
====================================================
These are internal utilities (prefixed with _) not part of the public API.
"""

"""
db/_internals.py — Private helpers used across DAOs
====================================================
These are internal utilities (prefixed with _) not part of the public API.
"""

import hashlib
import bcrypt
import base64 # Import base64
from ._base import _conn, _ph

_BCRYPT_ROUNDS = 12

def _hash_password(password: str) -> str:
    """
    Hash a plaintext password with bcrypt and return a Base64 encoded string.
    This is safe for storage in text-based database columns.
    """
    password_bytes = password.encode('utf-8')
    hashed_bytes = bcrypt.hashpw(password_bytes, bcrypt.gensalt(rounds=_BCRYPT_ROUNDS))
    # Encode the raw hash bytes to a Base64 string for safe DB storage
    return base64.b64encode(hashed_bytes).decode('utf-8')

def _verify_password(password: str, stored_b64_hash: str) -> bool:
    """
    Check password against a Base64 encoded hash from the database.
    """
    try:
        password_bytes = password.encode('utf-8')
        # Decode the Base64 string back to the raw hash bytes
        stored_hash_bytes = base64.b64decode(stored_b64_hash)
        
        # The stored hash must be a valid bcrypt hash
        if not stored_hash_bytes.startswith(b'$2b$'):
             return False
             
        return bcrypt.checkpw(password_bytes, stored_hash_bytes)
    except (ValueError, TypeError):
        # This handles cases where the stored hash is not valid Base64 or is otherwise corrupt
        return False

def _is_legacy_hash(stored_hash: str) -> bool:
    # This function is no longer relevant with the Base64 scheme, but we keep it
    # to avoid breaking other parts of the code that might call it.
    # A Base64 hash will not look like a legacy SHA256 hash.
    return not stored_hash.startswith(('JDJiJ', 'JDJhJ')) # Base64 for '$2b$' and '$2a$'

def _hash_token(token: str) -> str:
    return hashlib.sha256(str(token or "").encode()).hexdigest()

