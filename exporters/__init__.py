"""
exporters/__init__.py - Exporters Package
=========================================
Re-exports all public functions from exporter submodules for backward compatibility.

Public API:
- generar_pptx_diapositivas (pptx)
- generar_docx_sintesis, generar_docx_abp, generar_docx_plan_clase,
  generar_docx_ficha, generar_docx_evaluaciones (docx)
- generar_html_sintesis, generar_html_abp, generar_html_plan_clase,
  generar_html_ficha, generar_html_evaluaciones, generar_html_pdc (html)
- WORKSHEET_THEMES (html)
"""

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
]
