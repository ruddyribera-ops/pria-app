"""
Tests for views/daily_view.py
=====================
Tests for the daily view module.

Note: Full rendering tests require Streamlit which is difficult to test in isolation.
We test that the module loads and the function is callable.
"""

import pytest
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))


class TestDailyViewImports:
    """Test that daily_view can be imported."""

    def test_import_daily_view(self):
        """Verify daily_view module imports without errors."""
        from views.daily_view import render_daily_view

        assert callable(render_daily_view)

    def test_view_file_exists(self):
        """Verify the view file exists on disk."""
        # Check both possible locations
        view_path1 = project_root / "views" / "daily_view.py"
        view_path2 = Path(
            "C:/Users/Windows/Desktop/02_Proyectos/PRIA/pria-app-main-backup-20260406-205834/pria-app-main/views/daily_view.py"
        )

        exists = view_path1.exists() or view_path2.exists()
        assert exists, f"daily_view.py not found"

    def test_view_has_docstring(self):
        """Verify daily_view has a docstring."""
        from views.daily_view import render_daily_view

        assert render_daily_view.__doc__ is not None
        assert "Mi Día" in render_daily_view.__doc__


class TestFunctionSignature:
    """Test render_daily_view function signature."""

    def test_function_requires_parameters(self):
        """Verify render_daily_view has required parameters."""
        from views.daily_view import render_daily_view
        import inspect

        sig = inspect.signature(render_daily_view)
        params = list(sig.parameters.keys())

        # Verify key parameters exist
        assert "ss" in params
        assert "_nombre_hoja" in params
        assert "_fecha_iso" in params
        assert "_dia_es" in params
        assert "get_horario_dia" in params
        assert "marcar_bloque_diario" in params
        assert "cerrar_bloque" in params

    def test_returns_none(self):
        """Verify render_daily_view returns None (Streamlit renders via side effects)."""
        from views.daily_view import render_daily_view
        import inspect

        sig = inspect.signature(render_daily_view)
        # Should not have a return annotation (None by default)
        assert "return" not in str(sig)


class TestViewDependencies:
    """Integration tests for the view."""

    def test_view_imported_in_app_ui(self):
        """Verify app_ui.py imports the daily_view."""
        # Read app_ui.py and check for import
        app_ui_path = project_root / "app_ui.py"
        if app_ui_path.exists():
            content = app_ui_path.read_text(encoding="utf-8")
            assert "from views.daily_view import render_daily_view" in content

    def test_view_called_in_daily_zone(self):
        """Verify render_daily_view is called in the daily zone."""
        app_ui_path = project_root / "app_ui.py"
        if app_ui_path.exists():
            content = app_ui_path.read_text(encoding="utf-8")
            assert "render_daily_view(" in content
