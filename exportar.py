"""
exportar.py — Backward-Compatibility Re-export Wrapper
======================================================
This module exists for backward compatibility.
All actual export logic has been moved to the exporters/ package.

Public API (re-exported from exporters):
- generar_pptx_diapositivas
- generar_docx_sintesis, generar_docx_abp, generar_docx_plan_clase,
  generar_docx_ficha, generar_docx_evaluaciones
- generar_html_sintesis, generar_html_abp, generar_html_plan_clase,
  generar_html_ficha, generar_html_evaluaciones, generar_html_pdc
- WORKSHEET_THEMES

UI code:
- render_panel_exportacion (in ui/export_panel.py)
"""

# Re-export all pure export functions from exporters package
from exporters.pptx import generar_pptx_diapositivas
from exporters.docx import (
    generar_docx_sintesis,
    generar_docx_abp,
    generar_docx_plan_clase,
    generar_docx_ficha,
    generar_docx_evaluaciones,
)
from exporters.html import (
    generar_html_sintesis,
    generar_html_abp,
    generar_html_plan_clase,
    generar_html_ficha,
    generar_html_evaluaciones,
    generar_html_pdc,
    WORKSHEET_THEMES,
)


# For backward compatibility, also expose render_panel_exportacion
# which now lives in ui/export_panel.py
def render_panel_exportacion(ss, diagnosticos: str):
    """Render the export panel UI.

    This function is a thin wrapper that imports from ui.export_panel.
    Kept here for backward compatibility with existing imports.
    """
    from ui.export_panel import render_panel_exportacion as _render

    return _render(ss, diagnosticos)


__all__ = [
    # PPTX
    "generar_pptx_diapositivas",
    # DOCX
    "generar_docx_sintesis",
    "generar_docx_abp",
    "generar_docx_plan_clase",
    "generar_docx_ficha",
    "generar_docx_evaluaciones",
    # HTML
    "generar_html_sintesis",
    "generar_html_abp",
    "generar_html_plan_clase",
    "generar_html_ficha",
    "generar_html_evaluaciones",
    "generar_html_pdc",
    "WORKSHEET_THEMES",
    # UI
    "render_panel_exportacion",
]
