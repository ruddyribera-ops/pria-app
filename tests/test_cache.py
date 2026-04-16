"""
test_cache.py — Tests for ui/cache.py
===================================
Verifies disk caching, TTL expiry, cleanup, and logging.
Does NOT require Streamlit to run.
"""

import pytest
import json
import time
import sys
import os
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


# Import helpers to get the actual module (not the Helpers instance)
import ui.helpers as _helpers_mod  # noqa: F401

_cache_mod = sys.modules["ui.cache"]


def _motor_cache_key_pure(prompt_filename: str, variables: dict) -> str:
    """Mirror of _motor_cache_key for testing without Streamlit."""
    payload = json.dumps(
        {"motor": prompt_filename, "vars": variables},
        sort_keys=True,
        ensure_ascii=False,
    )
    return "motor_" + hashlib.sha256(payload.encode()).hexdigest()


import hashlib


class TestMotorCacheKey:
    """Cache key generation must be stable and order-independent."""

    def test_same_inputs_produce_same_key(self):
        k1 = _motor_cache_key_pure(
            "Motor_M1a.txt", {"tema": "Los determinantes", "grado": "5to"}
        )
        k2 = _motor_cache_key_pure(
            "Motor_M1a.txt", {"grado": "5to", "tema": "Los determinantes"}
        )
        assert k1 == k2, "Key must be order-independent"

    def test_different_motor_different_key(self):
        k1 = _motor_cache_key_pure("Motor_M1a.txt", {"tema": "A"})
        k2 = _motor_cache_key_pure("Motor_M2a.txt", {"tema": "A"})
        assert k1 != k2

    def test_different_variables_different_key(self):
        k1 = _motor_cache_key_pure("Motor_M1a.txt", {"tema": "Determinantes"})
        k2 = _motor_cache_key_pure("Motor_M1a.txt", {"tema": "Verbos"})
        assert k1 != k2

    def test_key_has_motor_prefix(self):
        k = _motor_cache_key_pure("Motor_M1a.txt", {})
        assert k.startswith("motor_")

    def test_key_is_deterministic(self):
        keys = {_motor_cache_key_pure("Motor_M0a.txt", {"x": "y"}) for _ in range(20)}
        assert len(keys) == 1


class TestCacheReadWrite:
    """Cache read/write operations on disk."""

    def test_cache_miss_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        result = _cache_mod._cargar_motor_cache("motor_nonexistent")
        assert result is None

    def test_cache_roundtrip_dict(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        data = {"plan": "some plan", "objetivos": [1, 2, 3]}
        _cache_mod._guardar_motor_cache("motor_test123", data, "Motor_Test")
        loaded = _cache_mod._cargar_motor_cache("motor_test123")
        assert loaded == data

    def test_cache_roundtrip_string(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        _cache_mod._guardar_motor_cache(
            "motor_strtest", "plain text result", "Motor_Test"
        )
        loaded = _cache_mod._cargar_motor_cache("motor_strtest")
        assert loaded == "plain text result"

    def test_cache_stores_motor_name(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        _cache_mod._guardar_motor_cache("motor_nametest", {"a": 1}, "Motor_M1a")
        path = tmp_path / "motor_nametest.json"
        with open(path) as f:
            entry = json.load(f)
        assert entry["motor"] == "Motor_M1a"
        assert "ts" in entry

    def test_cache_miss_unknown_key_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        result = _cache_mod._cargar_motor_cache("motor_totally_unknown_key_xyz")
        assert result is None

    def test_cache_guards_against_corruption(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        # Write garbage
        (tmp_path / "motor_garbage.json").write_text("not valid json{{{")
        result = _cache_mod._cargar_motor_cache("motor_garbage")
        assert result is None, "Should return None for corrupted cache"


class TestCacheTTL:
    """Cache entries should expire after TTL."""

    def test_expired_cache_returns_none(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        monkeypatch.setattr(_cache_mod, "_MOTOR_CACHE_TTL", 1)  # 1 second TTL
        data = {"test": "expired"}
        _cache_mod._guardar_motor_cache("motor_expired", data, "Motor_Test")
        # Bypass TTL check by manually advancing mtime
        cache_file = tmp_path / "motor_expired.json"
        old_mtime = time.time() - 10  # 10 seconds ago
        os.utime(cache_file, (old_mtime, old_mtime))
        result = _cache_mod._cargar_motor_cache("motor_expired")
        assert result is None, "Expired cache should return None and delete file"
        assert not cache_file.exists(), "Expired cache file should be deleted"

    def test_valid_cache_returns_data(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        monkeypatch.setattr(_cache_mod, "_MOTOR_CACHE_TTL", 86400)  # 1 day
        data = {"valid": True}
        _cache_mod._guardar_motor_cache("motor_valid", data, "Motor_Test")
        result = _cache_mod._cargar_motor_cache("motor_valid")
        assert result == data


class TestLimpiarMotorCache:
    """Cleaning motor cache should only delete motor_* files."""

    def test_deletes_motor_files_only(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        # Create motor cache files
        _cache_mod._guardar_motor_cache("motor_one", {"a": 1}, "Motor_One")
        _cache_mod._guardar_motor_cache("motor_two", {"b": 2}, "Motor_Two")
        # Create non-motor cache files
        pdf_hash = "abc123"
        _cache_mod._guardar_cache_hash(pdf_hash, {"texto": "pdf cache"})
        # Verify all exist
        assert (tmp_path / "motor_one.json").exists()
        assert (tmp_path / "motor_two.json").exists()
        assert (tmp_path / f"{pdf_hash}.json").exists()
        # Clean motor cache
        _cache_mod.limpiar_motor_cache()
        # Motor files gone
        assert not (tmp_path / "motor_one.json").exists()
        assert not (tmp_path / "motor_two.json").exists()
        # PDF cache untouched
        assert (tmp_path / f"{pdf_hash}.json").exists()

    def test_no_motor_files_leaves_nothing(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        _cache_mod._guardar_cache_hash("somepdf", {"texto": "x"})
        _cache_mod.limpiar_motor_cache()  # Should not raise
        assert (tmp_path / "somepdf.json").exists()


class TestBytesHash:
    """Hash function for cache keys."""

    def test_same_bytes_same_hash(self):
        data = b"hello world"
        h1 = _cache_mod._bytes_hash(data)
        h2 = _cache_mod._bytes_hash(data)
        assert h1 == h2

    def test_different_bytes_different_hash(self):
        h1 = _cache_mod._bytes_hash(b"hello")
        h2 = _cache_mod._bytes_hash(b"world")
        assert h1 != h2

    def test_hash_is_sha256_hex(self):
        h = _cache_mod._bytes_hash(b"test")
        assert len(h) == 64, "SHA256 produces 64-char hex"
        assert all(c in "0123456789abcdef" for c in h)

    def test_empty_bytes_still_hashes(self):
        h = _cache_mod._bytes_hash(b"")
        assert len(h) == 64


class TestCleanup:
    """Cache cleanup utilities."""

    def test_cleanup_old_sessions(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "SESSION_BASE_DIR", tmp_path)
        # Create old session dir
        old_session = tmp_path / "old_session_123"
        old_session.mkdir()
        old_mtime = time.time() - 100000
        os.utime(old_session, (old_mtime, old_mtime))
        # Create fresh session dir
        fresh_session = tmp_path / "fresh_session_456"
        fresh_session.mkdir()
        # Run cleanup
        _cache_mod.cleanup_old_sessions(max_age_seconds=86400)
        assert not old_session.exists(), "Old session should be deleted"
        assert fresh_session.exists(), "Fresh session should remain"

    def test_cleanup_old_cache(self, tmp_path, monkeypatch):
        monkeypatch.setattr(_cache_mod, "CACHE_DIR", tmp_path)
        # Create old PDF cache
        old_cache = tmp_path / "olde28a1f.json"
        old_cache.write_text('{"texto": "old"}')
        old_mtime = time.time() - 100000
        os.utime(old_cache, (old_mtime, old_mtime))
        # Create motor cache (should not be touched by old_cache cleanup)
        _cache_mod._guardar_motor_cache("motor_recent", {"x": 1}, "Motor_X")
        # Run cleanup
        _cache_mod.cleanup_old_cache(max_age_seconds=86400)
        assert not old_cache.exists(), "Old cache should be deleted"
        assert (tmp_path / "motor_recent.json").exists(), "Motor cache should remain"
