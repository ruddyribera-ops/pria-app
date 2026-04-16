"""
test_session_state.py — Tests for session state initialization
===========================================================
Verifies SESSION_DEFAULTS has correct keys and helpers work.
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestSessionDefaults:
    """SESSION_DEFAULTS defines all expected session state keys."""

    def test_has_required_auth_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        assert "autenticado" in SESSION_DEFAULTS
        assert "usuario_email" not in SESSION_DEFAULTS  # Set by auth, not defaults
        assert "usuario_rol" not in SESSION_DEFAULTS

    def test_has_required_gemini_state_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        assert "key_index" in SESSION_DEFAULTS
        assert "last_error" in SESSION_DEFAULTS
        assert "last_generar_fn" in SESSION_DEFAULTS
        assert "last_generar_vars" in SESSION_DEFAULTS
        assert "last_generar_json" in SESSION_DEFAULTS

    def test_has_required_material_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        assert "uploaded_tb_bytes" in SESSION_DEFAULTS
        assert "uploaded_tb_name" in SESSION_DEFAULTS
        assert "uploaded_tb_hash" in SESSION_DEFAULTS
        assert "tb_extracted" in SESSION_DEFAULTS
        assert "uploaded_sb_bytes" in SESSION_DEFAULTS
        assert "sb_extracted" in SESSION_DEFAULTS

    def test_has_required_diagnostic_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        assert "uploaded_diag_files" in SESSION_DEFAULTS
        assert "diagnosticos_texto" in SESSION_DEFAULTS
        assert "diagnosticos_tabla" in SESSION_DEFAULTS

    def test_has_required_plan_result_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        # M0 = unidad/ABP
        assert "res_m0a" in SESSION_DEFAULTS
        assert "res_m0b" in SESSION_DEFAULTS
        assert "res_m0c" in SESSION_DEFAULTS
        # M1 = plan clase / diapositivas / ficha
        assert "res_m1a" in SESSION_DEFAULTS
        assert "res_m1a_prev" in SESSION_DEFAULTS
        assert "res_m1b" in SESSION_DEFAULTS
        assert "res_m1c" in SESSION_DEFAULTS
        # M2 = quiz / tutor
        assert "res_m2a" in SESSION_DEFAULTS
        assert "res_m2b" in SESSION_DEFAULTS

    def test_has_required_ui_state_keys(self):
        from ui.helpers import SESSION_DEFAULTS

        assert "tema_activo" in SESSION_DEFAULTS
        assert "tema_hash" in SESSION_DEFAULTS
        assert "leccion_index" in SESSION_DEFAULTS
        assert "conceptos_activos" in SESSION_DEFAULTS
        assert "palabras_clave_activas" in SESSION_DEFAULTS
        assert "contenido_tema_activo" in SESSION_DEFAULTS
        assert "mostrar_adaptaciones_prev" in SESSION_DEFAULTS
        assert "grado_nivel" in SESSION_DEFAULTS

    def test_all_defaults_are_non_none(self):
        from ui.helpers import SESSION_DEFAULTS

        # All defaults should be None or empty containers, not undefined
        for key, val in SESSION_DEFAULTS.items():
            assert val is None or isinstance(
                val, (str, int, float, bool, list, dict)
            ), f"Key '{key}' has invalid default: {val!r}"

    def test_res_keys_default_to_none(self):
        from ui.helpers import SESSION_DEFAULTS

        result_keys = [k for k in SESSION_DEFAULTS if k.startswith("res_")]
        for k in result_keys:
            assert SESSION_DEFAULTS[k] is None, f"{k} should default to None"

    def test_count(self):
        from ui.helpers import SESSION_DEFAULTS

        # When we add a new key, update this count and the test name
        assert len(SESSION_DEFAULTS) == 38, (
            f"Expected 38 session state keys, got {len(SESSION_DEFAULTS)}"
        )


class TestHelpersModuleStructure:
    """Verify helpers.py re-exports from sub-modules."""

    def test_exports_css(self):
        from ui.helpers import CSS

        assert CSS

    def test_exports_init_session_state(self):
        from ui.helpers import init_session_state

        assert callable(init_session_state)

    def test_exports_Session_DEFAULTS(self):
        from ui.helpers import SESSION_DEFAULTS

        assert isinstance(SESSION_DEFAULTS, dict)

    def test_exports_leer_diagnosticos(self):
        from ui.helpers import leer_diagnosticos

        assert callable(leer_diagnosticos)

    def test_exports_analizar_pdf_ocr(self):
        from ui.helpers import analizar_pdf_ocr

        assert callable(analizar_pdf_ocr)

    def test_exports_generar_con_gemini(self):
        from ui.helpers import generar_con_gemini

        assert callable(generar_con_gemini)

    def test_exports_leer_horario_xlsx(self):
        from ui.helpers import leer_horario_xlsx

        assert callable(leer_horario_xlsx)

    def test_exports_generar_pdc_trimestral(self):
        from ui.helpers import generar_pdc_trimestral

        assert callable(generar_pdc_trimestral)

    def test_exports_log_event(self):
        from ui.helpers import log_event

        assert callable(log_event)

    def test_exports_limpiar_motor_cache(self):
        from ui.helpers import limpiar_motor_cache

        assert callable(limpiar_motor_cache)
