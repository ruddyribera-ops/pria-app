"""
Unit tests for exportar.py — coverage push.
Focus on pure helper functions first.
"""

import pytest
from unittest.mock import patch
from datetime import datetime

from exportar import (
    _fecha_es,
    _extract_scene,
    _es_autopresentacion,
    _generar_sopa_letras,
    _md_to_html,
    _limpiar_eval,
    _parsear_secciones_eval,
    _strip_hdr_eval,
    generar_pptx_diapositivas,
    generar_docx_sintesis,
    generar_html_evaluaciones,
    generar_html_ficha,
)

# ─── Test Helpers ───────────────────────────────────────────────────────────────


@pytest.fixture
def mock_datetime():
    mock_dt = datetime(2026, 5, 7)
    with patch("exportar.datetime") as mock_date:
        mock_date.now.return_value = mock_dt
        yield mock_date


# ─── Tests for Pure Functions ───────────────────────────────────────────────────


def test_fecha_es(mock_datetime):
    assert _fecha_es() == "07 de mayo de 2026"


@pytest.mark.parametrize(
    "prompt, expected",
    [
        # PARTE 1 stripped (Square format.), PARTE 3 stays (no "Consistent illustration")
        (
            "PARTE 1: Style. Square format. PARTE 2: A cat sitting. PARTE 3: Technical details.",
            "PARTE 2: A cat sitting. PARTE 3: Technical details.",
        ),
        # No PARTE 1 marker, no change; trailing period stripped by lstrip(".")
        ("square format. A dog barking. Consistent illustration.", "A dog barking"),
        # No markers → fallback prompt[:80]
        (
            "No markers here, just a simple prompt",
            "No markers here, just a simple prompt"[:80],
        ),
        ("", ""),
        # PARTE 1 stripped, PARTE 3 stays (but "Square format." not found in this variant)
        (
            "  PARTE 1: Style. Square format.   The scene.   PARTE 3: Details.  ",
            "The scene.   PARTE 3: Details.",
        ),
    ],
)
def test_extract_scene(prompt, expected):
    assert _extract_scene(prompt) == expected


@pytest.mark.parametrize(
    "linea, expected",
    [
        ("Hola, soy el motor m1 y he diseñado este material.", True),
        ("A continuación te presento la ficha.", True),
        ("Este es un texto normal sobre la fotosíntesis.", False),
        ("bienvenidos, futuros exploradores del saber", True),
        ("", False),
    ],
)
def test_es_autopresentacion(linea, expected):
    assert _es_autopresentacion(linea) == expected


def test_generar_sopa_letras_properties():
    palabras = ["PYTHON", "TEST", "COVERAGE"]
    size = 15
    grid = _generar_sopa_letras(palabras, size)

    # Correct dimensions
    assert len(grid) == size
    assert all(len(row) == size for row in grid)

    # All cells filled
    assert all(grid[r][c] for r in range(size) for c in range(size))

    # All words present (horizontal or vertical)
    grid_str_h = ["".join(row) for row in grid]
    grid_str_v = ["".join(grid[r][c] for r in range(size)) for c in range(size)]
    for word in palabras:
        found = any(word in s or word[::-1] in s for s in grid_str_h + grid_str_v)
        assert found, f"Word '{word}' not found in grid"


def test_generar_sopa_letras_empty():
    grid = _generar_sopa_letras([], size=10)
    assert len(grid) == 10
    assert all(len(row) == 10 for row in grid)
    assert all(grid[r][c] for r in range(10) for c in range(10))


@pytest.mark.parametrize(
    "markdown, expected_contains",
    [
        ("# Titulo\n\n**Hola** mundo.", "<h1>Titulo</h1>"),
        ("- Item 1\n- Item 2", "<ul>"),
        ("Texto normal.", "<p>Texto normal.</p>"),
        ("## Subtitulo", "<h2>Subtitulo</h2>"),
    ],
)
def test_md_to_html(markdown, expected_contains):
    html = _md_to_html(markdown)
    assert expected_contains in html


@pytest.mark.parametrize(
    "text, expected",
    [
        # AI intro stripped, rest remains
        (
            "Hola! soy el motor M2 y esto es una prueba.\nLa prueba sigue aquí.",
            "La prueba sigue aquí.",
        ),
        ("---", ""),
        ("### Titulo\nContenido", "### Titulo\nContenido"),
        # "basado en la planificación estratégica" doesn't match any _INTRO_IA_EVAL fragment
        # so only lines that are markdown rules are stripped
        ("Texto normal sin intro.", "Texto normal sin intro."),
    ],
)
def test_limpiar_eval(text, expected):
    assert _limpiar_eval(text).strip() == expected


def test_parsear_secciones_eval():
    texto = (
        "Intro text.\n"
        "## Misión 1: El Artista\n"
        "Dibuja algo.\n"
        "### Misión 2: Escritura Corta\n"
        "Escribe algo.\n"
        "### Cómo te sentiste?\n"
        "Feedback."
    )
    secciones = _parsear_secciones_eval(texto)
    assert "Intro text." in secciones["intro"]
    assert "Dibuja algo." in secciones["m1"]
    assert "Escribe algo." in secciones["m2"]
    assert "Feedback." in secciones["antes"]
    assert secciones["m3"] == ""


def test_strip_hdr_eval():
    texto = "## Misión 1: El Artista\nContenido de la misión."
    assert _strip_hdr_eval(texto) == "Contenido de la misión."


# ─── Smoke Tests for Main Generators ────────────────────────────────────────────


def test_generar_pptx_diapositivas_smoke():
    data = [{"titulo": "Test", "texto_pantalla": "Contenido"}]
    result = generar_pptx_diapositivas(data, "Tema Test", "Unidad Test")
    assert isinstance(result, bytes)
    assert len(result) > 1000


def test_generar_docx_sintesis_smoke():
    data = {"unidad_sintetizada": {"titulo": "Test", "temas_desarrollados": []}}
    result = generar_docx_sintesis(data, "Diagnóstico de prueba.")
    assert isinstance(result, bytes)
    assert len(result) > 1000


def test_generar_html_evaluaciones_smoke():
    result = generar_html_evaluaciones(
        "### Misión 1\nPregunta 1", "Clave de respuestas", "Tema Test"
    )
    assert isinstance(result, str)
    assert "</html>" in result


def test_generar_html_ficha_smoke():
    data = {
        "ficha_trabajo": {
            "historia_gancho": "Había una vez...",
            "misiones": {"oraculo": [{"pregunta": "Test?", "opciones": ["A", "B"]}]},
        }
    }
    result = generar_html_ficha(data, "Tema Test")
    assert isinstance(result, str)
    assert "</html>" in result
