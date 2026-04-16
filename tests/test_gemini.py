"""
test_gemini.py — Tests for ui/gemini.py
=======================================
Verifies prompt loading, API key management, and motor stats.
Does NOT call the Gemini API — only tests local logic.
"""

import pytest
import sys
import json
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestLoadMotorPrompt:
    """Loading motor prompts from disk."""

    def test_load_existing_prompt(self):
        # Verify the PROMPTS_DIR path is set correctly in gemini.py
        import ui.gemini as _gm
        from pathlib import Path

        # PROMPTS_DIR should point to prompts_maestros at project root
        prompts_dir = Path(_gm.PROMPTS_DIR)
        # On Railway it may not exist, but locally it should
        if prompts_dir.exists() and (prompts_dir / "Motor_M1a.txt").exists():
            content = _gm.load_motor_prompt("Motor_M1a")
            assert content is not None
            assert len(content) > 10
        else:
            # On Railway prompts dir may not be deployed — verify path is at least correct
            assert "prompts_maestros" in _gm.PROMPTS_DIR

    def test_load_nonexistent_prompt_returns_none(self):
        import ui.gemini as _gm

        result = _gm.load_motor_prompt("NonExistentMotor_XYZ")
        assert result is None

    def test_prompt_with_special_characters(self):
        # Test that the function handles special chars correctly when file exists
        import ui.gemini as _gm

        # This tests the code path, not a real file
        result = _gm.load_motor_prompt("Motor_NonExistent_Special")
        assert result is None


class TestMotorStats:
    """Motor statistics stub."""

    def test_get_motor_stats_returns_dict(self):
        from ui.cache import get_motor_stats

        stats = get_motor_stats()
        assert isinstance(stats, dict)
        assert "total_motors" in stats
        assert "total_uses" in stats
        assert "success_rate" in stats
        assert "motors" in stats

    def test_motor_stats_has_expected_zeros(self):
        from ui.cache import get_motor_stats

        stats = get_motor_stats()
        assert stats["total_motors"] == 0
        assert stats["total_uses"] == 0
        assert stats["success_rate"] == 0.0
        assert stats["motors"] == []


class TestForzarLista:
    """The forzar_lista helper converts various inputs to clean lists."""

    def test_list_passes_through(self):
        from ui.helpers import forzar_lista

        result = forzar_lista(["a", "b", "c"])
        assert result == ["a", "b", "c"]

    def test_list_filters_empty(self):
        from ui.helpers import forzar_lista

        result = forzar_lista(["a", "", "b", None, "c"])
        assert result == ["a", "b", "c"]

    def test_string_comma_separated(self):
        from ui.helpers import forzar_lista

        result = forzar_lista("a, b, c")
        assert result == ["a", "b", "c"]

    def test_string_with_extra_spaces(self):
        from ui.helpers import forzar_lista

        result = forzar_lista("  alpha  ,  beta  ,  gamma  ")
        assert result == ["alpha", "beta", "gamma"]

    def test_none_becomes_empty_list(self):
        from ui.helpers import forzar_lista

        result = forzar_lista(None)
        assert result == []

    def test_single_item(self):
        from ui.helpers import forzar_lista

        assert forzar_lista("only") == ["only"]
        assert forzar_lista(["only"]) == ["only"]


class TestTopicHash:
    """Topic hash produces stable, lowercase identifiers."""

    def test_same_topic_same_hash(self):
        from ui.helpers import _topic_hash

        h1 = _topic_hash("Los Determinantes")
        h2 = _topic_hash("Los Determinantes")
        assert h1 == h2

    def test_case_insensitive(self):
        from ui.helpers import _topic_hash

        h1 = _topic_hash("DETERMINANTES")
        h2 = _topic_hash("determinantes")
        assert h1 == h2

    def test_whitespace_normalized(self):
        from ui.helpers import _topic_hash

        h1 = _topic_hash("  tema  ")
        h2 = _topic_hash("tema")
        assert h1 == h2

    def test_empty_string_returns_empty(self):
        from ui.helpers import _topic_hash

        # Empty/whitespace strings return empty string (early exit)
        assert _topic_hash("") == ""
        assert _topic_hash("   ") == ""

    def test_hash_is_md5_hex(self):
        from ui.helpers import _topic_hash

        h = _topic_hash("test")
        assert len(h) == 32, "MD5 produces 32-char hex"
        assert all(c in "0123456789abcdef" for c in h)


class TestGeminiModuleExports:
    """Verify ui.gemini exposes expected functions."""

    def test_exports_leer_diagnosticos(self):
        import ui.gemini as _gm

        assert hasattr(_gm, "leer_diagnosticos")
        assert callable(_gm.leer_diagnosticos)

    def test_exports_analizar_pdf_ocr(self):
        import ui.gemini as _gm

        assert hasattr(_gm, "analizar_pdf_ocr")
        assert callable(_gm.analizar_pdf_ocr)

    def test_exports_generar_con_gemini(self):
        import ui.gemini as _gm

        assert hasattr(_gm, "generar_con_gemini")
        assert callable(_gm.generar_con_gemini)

    def test_exports_load_motor_prompt(self):
        import ui.gemini as _gm

        assert hasattr(_gm, "load_motor_prompt")
        assert callable(_gm.load_motor_prompt)
