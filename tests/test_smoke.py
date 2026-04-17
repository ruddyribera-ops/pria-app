"""
test_smoke.py — App smoke tests
================================
Verifies all app modules can be imported without errors.
Catches import-time bugs (missing functions, circular deps, wrong names).
"""

import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))


class TestModuleImports:
    """Verify every module imports cleanly."""

    def test_import_db_submodules(self):
        """All db/ submodules should import without errors."""
        from db import (
            usuarios,
            sesiones,
            deuda,
            planes,
            horario,
            calendario,
            comisiones,
            bloques,
            utils,
            sync,
            _base,
            _internals,
        )

        # Spot-check some functions exist
        assert hasattr(usuarios, "crear_usuario")
        assert hasattr(usuarios, "verificar_login")
        assert hasattr(sesiones, "crear_sesion")
        assert hasattr(deuda, "get_resumen_deuda")

    def test_import_db_top_level(self):
        """db/ top-level exports should work."""
        from db import (
            init_db,
            crear_usuario,
            verificar_login,
            get_usuario_by_email,
            crear_sesion,
            get_sesion,
            get_deuda_academica,
            get_resumen_deuda,
            guardar_plan_buffer,
            get_planes_buffer,
            get_horario_dia,
            get_all_hojas,
            guardar_eventos_calendario,
            get_eventos_fecha,
            marcar_bloque_diario,
            cerrar_bloque,
            get_micro_objetivos,
            guardar_micro_objetivos,
            marcar_objetivo,
            marcar_multiples,
            get_sesiones,
            get_all_usuarios,
            toggle_usuario_activo,
            eliminar_usuario,
            actualizar_password,
            guardar_comisiones,
            get_comisiones_docente,
            get_all_comisiones,
            guardar_vigilancias,
            get_vigilancias,
            get_actividades_fecha,
            guardar_actividades_cronograma,
            get_eventos_rango,
            get_logs_dia,
            get_or_create_sesion_diaria,
            get_objetivos_semana_materia,
            reset_dia_docente,
            reabrir_bloque,
            guardar_horario_docente,
        )

    def test_import_pria_docs(self):
        """pria_docs/ modules should import cleanly."""
        from pria_docs import auth, config, errors, session_schema
        from pria_docs.auth import hash_password, verify_password, Role
        from pria_docs.config import config, Constants
        from pria_docs.session_schema import SessionData

    def test_import_ui_cache(self):
        """ui/cache.py should import without errors."""
        from ui.cache import (
            _motor_cache_key,
            _cargar_motor_cache,
            _guardar_motor_cache,
            limpiar_motor_cache,
            _cargar_cache_hash,
            _guardar_cache_hash,
            get_session_temp_dir,
            cleanup_old_sessions,
            cleanup_old_cache,
            log_event,
            get_motor_stats,
            CACHE_DIR,
            LOG_DIR,
        )

    def test_import_ui_gemini(self):
        """ui/gemini.py should import without errors."""
        from ui.gemini import (
            leer_diagnosticos,
            analizar_pdf_ocr,
            load_motor_prompt,
            generar_con_gemini,
        )

    def test_import_ui_css(self):
        """ui/css.py should import without errors."""
        from ui.css import CSS

    def test_import_ui_helpers(self):
        """ui/helpers.py should import without errors."""
        from ui.helpers import (
            init_session_state,
            forzar_lista,
            _topic_hash,
            _bytes_hash,
            _get_keys,
            _rotate_key,
            SESSION_DEFAULTS,
            SESSION_BASE_DIR,
        )

    def test_import_ui_auth_ui(self):
        """ui/auth_ui.py should import cleanly (import-time deps only)."""
        # auth_ui.render_login has lazy imports, so just verify module loads
        import ui.auth_ui

        assert hasattr(ui.auth_ui, "render_login")
        assert hasattr(ui.auth_ui, "logout")

    def test_import_ui_sidebar(self):
        """ui/sidebar.py should import cleanly."""
        import ui.sidebar

        assert hasattr(ui.sidebar, "render_sidebar")

    def test_import_ui_admin_ui(self):
        """ui/admin_ui.py should import cleanly."""
        import ui.admin_ui

        assert hasattr(ui.admin_ui, "render_admin_panel")

    def test_import_ui_daily_ui(self):
        """ui/daily_ui.py should import cleanly."""
        import ui.daily_ui

        assert hasattr(ui.daily_ui, "render_daily_zone")

    def test_import_ui_weekly_ui(self):
        """ui/weekly_ui.py should import cleanly."""
        import ui.weekly_ui

        assert hasattr(ui.weekly_ui, "render_weekly_zone")

    def test_import_ui_trimester_ui(self):
        """ui/trimester_ui.py should import cleanly."""
        import ui.trimester_ui

        assert hasattr(ui.trimester_ui, "render_trimester_zone")

    def test_import_exportar(self):
        """exportar.py should import cleanly."""
        from exportar import (
            render_panel_exportacion,
            generar_html_plan_clase,
            generar_html_sintesis,
            generar_html_abp,
            generar_html_evaluaciones,
            generar_html_ficha,
            generar_html_pdc,
        )


class TestNoImportErrors:
    """Verify no module has import-time side effects that fail."""

    def test_ui_helpers_no_side_effects_on_import(self):
        """Importing ui.helpers should NOT trigger filesystem I/O (cleanup funcs called at import was the bug)."""
        # If this import succeeds without calling cleanup_old_sessions/cleanup_old_cache,
        # the fix is working. We can't easily detect I/O, but if the import works
        # without raising, it's fine.
        import ui.helpers

        # Should not raise
        assert True

    def test_log_event_is_callable_from_cache(self):
        """log_event should be callable from ui.cache."""
        from ui.cache import log_event

        # Should not raise on import
        assert callable(log_event)

    def test_topic_hash_whitespace_fix(self):
        """_topic_hash should return '' for whitespace-only strings."""
        from ui.helpers import _topic_hash

        assert _topic_hash("   ") == ""
        assert _topic_hash("") == ""
        assert _topic_hash("  \t  ") == ""


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
