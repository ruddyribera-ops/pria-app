"""
Unit tests for parser_archivos.py — pure helper functions.
"""

import pytest
from parser_archivos import (
    _parse_time_range,
    _classify_block,
    _classify_evento,
)


# ─── _parse_time_range tests ────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "input_val, expected",
    [
        ("07:55 - 08:40", ("07:55", "08:40")),
        ("07:55-08:40", ("07:55", "08:40")),
        ("07:55–08:40", ("07:55", "08:40")),
        ("07:55 – 08:40", ("07:55", "08:40")),
        ("9:05", ("09:05", None)),
        ("14:30 - 15:15", ("14:30", "15:15")),
        ("", (None, None)),
        (None, (None, None)),
        ("sin hora", (None, None)),
        ("texto libre", (None, None)),
        # Edge: en dash (not hyphen-minus)
        ("07:55\u2013 08:40", ("07:55", "08:40")),
        # Single-digit hour
        ("7:55 - 8:40", ("07:55", "08:40")),
        # Only start time
        ("07:55", ("07:55", None)),
    ],
)
def test_parse_time_range(input_val, expected):
    result = _parse_time_range(input_val)
    assert result == expected


# ─── _classify_block tests ──────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "valor, expected_type",
    [
        # Empty / None
        ("", ("vacio", None, None, None)),
        ("none", ("vacio", None, None, None)),
        ("NONE", ("vacio", None, None, None)),
        # Ingreso
        ("HORARIO DE INGRESO", ("ingreso", None, None, None)),
        ("horario de ingreso", ("ingreso", None, None, None)),
        # Vigilancia recreo
        (
            "VIGILANCIA RECREO PRIM HASTA 1",
            ("vigilancia_recreo", None, None, "Área Primaria"),
        ),
        ("VIGILANCIA RECREO SEC", ("vigilancia_recreo", None, None, "Área Secundaria")),
        ("GUARDIA RECREO", ("vigilancia_recreo", None, None, "Patio")),
        # Atencion PPFF
        ("AT. PPFF", ("atencion_ppff", None, None, None)),
        ("ATENCIÓN PPFF", ("atencion_ppff", None, None, None)),
        ("ATENCION PPFF", ("atencion_ppff", None, None, None)),
        # Planificacion
        ("PLANIFICACIÓN", ("planificacion", None, None, None)),
        ("PLANIFICACION", ("planificacion", None, None, None)),
        ("API PLANIF", ("planificacion", None, None, None)),
        # Receso
        ("RECESO", ("recreo_libre", None, None, None)),
        # Acompañamiento
        ("ACOMPAÑAMIENTO INGLES", ("clase", "Acompañamiento Ingles", None, None)),
        (
            "ACOMPANAMIENTO MATEMATICA",
            ("clase", "Acompañamiento Matematica", None, None),
        ),
        # Clase normal con materia y nivel
        ("TECNOLOGIA 2S", ("clase", "Tecnologia", "2S", None)),
        ("HABILIDADES 5P", ("clase", "Habilidades", "5P", None)),
        ("LENGUAJE", ("clase", "Lenguaje", None, None)),
        ("5S", ("clase", "5S", "5S", None)),
        ("4P", ("clase", "4P", "4P", None)),
    ],
)
def test_classify_block(valor, expected_type):
    result = _classify_block(valor)
    assert result == expected_type


# ─── _classify_evento tests ────────────────────────────────────────────────────


@pytest.mark.parametrize(
    "nombre, expected",
    [
        ("FERIADO NACIONAL", "feriado"),
        ("Acto Cívico Escolar", "acto_civico"),
        ("ACTO CIVICO", "acto_civico"),
        ("CONMEMORATIVO DÍA DEL MAESTRO", "acto_civico"),
        ("DESARROLLO CURRICULAR", "curricular"),
        ("AVANCE DE CONTENIDOS", "curricular"),
        ("Reunión de Padres", "institucional"),
        ("EXAMEN PARCIAL", "institucional"),
        ("", "institucional"),
    ],
)
def test_classify_evento(nombre, expected):
    assert _classify_evento(nombre) == expected
