"""
test_motor_cache.py — Tests for Gemini motor response caching.

Verifies cache key stability, hit/miss logic, TTL expiry,
and the limpiar_motor_cache() utility — without touching the real API.
"""

import pytest
import json
import sys
import time
import os
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

# ui.__init__ does `from ui.helpers import helpers` which shadows the MODULE
# ui.helpers with the Helpers instance. Retrieve the real module via sys.modules.
import ui  # noqa: F401 — triggers __init__ which loads ui.helpers into sys.modules
import ui.helpers as _ui_helpers_alias  # noqa: F401 — ensures sys.modules entry exists


# ── Helpers pulled directly so tests don't need Streamlit ─────────────────────

import hashlib as _hashlib


def _motor_cache_key_pure(prompt_filename: str, variables: dict) -> str:
    """Mirror of helpers._motor_cache_key for testing without Streamlit."""
    payload = json.dumps(
        {"motor": prompt_filename, "vars": variables}, sort_keys=True, ensure_ascii=False
    )
    return "motor_" + _hashlib.sha256(payload.encode()).hexdigest()


# ── Tests ──────────────────────────────────────────────────────────────────────


class TestMotorCacheKey:
    def test_same_inputs_produce_same_key(self):
        k1 = _motor_cache_key_pure("Motor_M1a.txt", {"tema": "Los determinantes", "grado": "5to"})
        k2 = _motor_cache_key_pure("Motor_M1a.txt", {"grado": "5to", "tema": "Los determinantes"})
        assert k1 == k2, "Key must be order-independent (sorted keys)"

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
        """Same call many times → same key every time."""
        keys = {_motor_cache_key_pure("Motor_M0a.txt", {"x": "y"}) for _ in range(20)}
        assert len(keys) == 1


def _h():
    """Return the actual ui.helpers MODULE (not the shadowed Helpers instance)."""
    return sys.modules["ui.helpers"]


class TestMotorCacheReadWrite:
    def test_cache_miss_returns_none(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        result = h._cargar_motor_cache("motor_nonexistent")
        assert result is None

    def test_cache_roundtrip_dict(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        data = {"plan": "some plan", "objetivos": [1, 2, 3]}
        h._guardar_motor_cache("motor_abc123", data, "Motor_M1a.txt")
        loaded = h._cargar_motor_cache("motor_abc123")
        assert loaded == data

    def test_cache_roundtrip_string(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        text = "Este es el plan de clase generado por PRIA."
        h._guardar_motor_cache("motor_xyz", text, "Motor_PDC.txt")
        loaded = h._cargar_motor_cache("motor_xyz")
        assert loaded == text

    def test_cache_file_has_motor_prefix(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        h._guardar_motor_cache("motor_test123", {"k": "v"}, "Motor_M2a.txt")
        files = list(tmp_path.glob("motor_*.json"))
        assert len(files) == 1
        assert files[0].name == "motor_test123.json"


class TestMotorCacheTTL:
    def test_expired_cache_returns_none(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        monkeypatch.setattr(h, "_MOTOR_CACHE_TTL", 0)  # instant expiry

        h._guardar_motor_cache("motor_expired", {"data": "old"}, "Motor_M1a.txt")
        time.sleep(0.01)  # ensure mtime < now - TTL=0
        result = h._cargar_motor_cache("motor_expired")
        assert result is None

    def test_expired_file_is_deleted(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        monkeypatch.setattr(h, "_MOTOR_CACHE_TTL", 0)

        h._guardar_motor_cache("motor_old", {"x": 1}, "Motor_M1a.txt")
        time.sleep(0.01)
        h._cargar_motor_cache("motor_old")
        assert not (tmp_path / "motor_old.json").exists()

    def test_fresh_cache_is_returned(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        monkeypatch.setattr(h, "_MOTOR_CACHE_TTL", 86400)  # 1 day

        h._guardar_motor_cache("motor_fresh", {"data": "current"}, "Motor_M1a.txt")
        result = h._cargar_motor_cache("motor_fresh")
        assert result == {"data": "current"}


class TestLimpiarMotorCache:
    def test_clears_only_motor_files(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))

        # Create motor cache files
        (tmp_path / "motor_aaa.json").write_text('{"r":1}')
        (tmp_path / "motor_bbb.json").write_text('{"r":2}')
        # Create a PDF cache file (should NOT be deleted)
        (tmp_path / "diag_ccc.json").write_text('{"texto":"x"}')

        h.limpiar_motor_cache()

        remaining = [f.name for f in tmp_path.iterdir()]
        assert "motor_aaa.json" not in remaining
        assert "motor_bbb.json" not in remaining
        assert "diag_ccc.json" in remaining

    def test_clear_on_empty_cache_does_not_raise(self, tmp_path, monkeypatch):
        h = _h()
        monkeypatch.setattr(h, "CACHE_DIR", str(tmp_path))
        h.limpiar_motor_cache()  # should not raise


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
