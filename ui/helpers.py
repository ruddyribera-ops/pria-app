"""
ui/helpers.py - Helper Functions Re-exports
==========================================
Thin module that re-exports from specialized sub-modules.
For imports, use the specific modules directly when possible.

Re-exports:
- CSS from ui.css
- Session state utilities
- Helper functions
- Gemini functions from ui.gemini
- Cache functions from ui.cache
- Schedule/PDC helpers
"""

import os
import io
import json
import hashlib
import shutil
import time
import uuid
import tempfile
from datetime import datetime as _dt
from pathlib import Path
from typing import Callable, Any

import streamlit as st
import openpyxl
from google import genai

# ── Paths ──────────────────────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts_maestros")


def _secret(key: str, default=None):
    try:
        v = st.secrets.get(key, None)
        if v is not None:
            return v
    except Exception:
        pass
    return os.environ.get(key, default)


CACHE_DIR = Path(_secret("CACHE_DIR", os.path.join(BASE_DIR, "cache_libros")))
LOG_DIR = Path(_secret("LOG_DIR", os.path.join(BASE_DIR, "logs")))
SESSION_BASE_DIR = Path(tempfile.gettempdir()) / "pria_sessions"

for _d in (CACHE_DIR, LOG_DIR, SESSION_BASE_DIR):
    _d.mkdir(parents=True, exist_ok=True)

GEMINI_MODEL = "gemini-2.5-flash"


# ── CSS (re-export) ────────────────────────────────────────────────────────────

from ui.css import CSS


# ── Session State ─────────────────────────────────────────────────────────────

SESSION_DEFAULTS = {
    "session_id": None,
    "autenticado": False,
    "grado_nivel": "5to primaria",
    "key_index": 0,
    "last_error": None,
    "last_generar_fn": None,
    "last_generar_vars": None,
    "last_generar_json": False,
    "uploaded_tb_bytes": None,
    "uploaded_tb_name": None,
    "uploaded_tb_hash": None,
    "tb_extracted": None,
    "uploaded_sb_bytes": None,
    "uploaded_sb_name": None,
    "uploaded_sb_hash": None,
    "sb_extracted": None,
    "uploaded_diag_files": [],
    "diagnosticos_texto": None,
    "diagnosticos_tabla": [],
    "res_m0a": None,
    "res_m0b": None,
    "res_m0c": None,
    "tema_activo": "",
    "tema_hash": "",
    "leccion_index": 0,
    "conceptos_activos": [],
    "palabras_clave_activas": [],
    "contenido_tema_activo": "",
    "res_m1a": None,
    "res_m1a_prev": None,
    "res_m1b": None,
    "res_m1c": None,
    "res_m2a": None,
    "res_m2b": None,
    "mostrar_adaptaciones_prev": False,
    "_pptx_cache": None,
    "teacher_name": "",
    "school_name": "",
}


def init_session_state():
    """Initialize session state with defaults if not present."""
    for key, val in SESSION_DEFAULTS.items():
        if key not in st.session_state:
            st.session_state[key] = val


# ── Helpers ───────────────────────────────────────────────────────────────────


def forzar_lista(valor) -> list:
    if isinstance(valor, list):
        return [str(v) for v in valor if v]
    if isinstance(valor, str):
        return [v.strip() for v in valor.split(",") if v.strip()]
    return []


def _bytes_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _get_keys() -> list:
    import json as _json

    raw = _secret("GEMINI_API_KEYS", "[]")
    if isinstance(raw, list):
        return [str(k).strip() for k in raw if str(k).strip()]
    try:
        parsed = _json.loads(raw)
        if isinstance(parsed, list):
            keys = [str(k).strip() for k in parsed if str(k).strip()]
        elif isinstance(parsed, str):
            keys = [parsed.strip()] if parsed.strip() else []
        else:
            keys = []
        if keys:
            return keys
    except Exception:
        pass
    single = str(_secret("GEMINI_API_KEY", "") or "").strip()
    if single:
        return [single]
    raw_s = str(raw or "").strip()
    return [raw_s] if raw_s and raw_s != "[]" else []


def _rotate_key():
    keys = _get_keys()
    if keys:
        st.session_state.key_index = (st.session_state.key_index + 1) % len(keys)


def _topic_hash(tema: str) -> str:
    stripped = tema.strip()
    if not stripped:
        return ""
    return hashlib.md5(stripped.lower().encode()).hexdigest()


# ── Cache (from ui.cache) ─────────────────────────────────────────────────────

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
    _MOTOR_CACHE_TTL,
)

# Run cache cleanup on import
cleanup_old_sessions()
cleanup_old_cache()


# ── Gemini (from ui.gemini) ──────────────────────────────────────────────────

from ui.gemini import (
    leer_diagnosticos,
    analizar_pdf_ocr,
    load_motor_prompt,
    generar_con_gemini,
)


# ── Schedule Reader ───────────────────────────────────────────────────────────


def leer_horario_xlsx(xlsx_bytes: bytes, teacher_name: str) -> tuple:
    wb = openpyxl.load_workbook(io.BytesIO(xlsx_bytes), data_only=True)
    target_sheet = None
    for sname in wb.sheetnames:
        if teacher_name.upper() in sname.upper():
            target_sheet = wb[sname]
            break
    if target_sheet is None:
        return None, None
    data = []
    for row in target_sheet.iter_rows(values_only=True):
        data.append([str(c).strip() if c is not None else "" for c in row])
    days = ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"]
    header_row_idx = -1
    for i, row in enumerate(data):
        if "LUNES" in row:
            header_row_idx = i
            break
    if header_row_idx == -1:
        return [], []
    headers = data[header_row_idx]
    lunes_idx = headers.index("LUNES")
    time_headers = [h for h in headers[:lunes_idx] if h and h != "None"] or ["HORARIO"]
    day_indices = {d: (headers.index(d) if d in headers else -1) for d in days}
    schedule_map = {}
    skip_words = ["VIGILANCIA", "SNACK", "INGRESO", "NONE"]
    for row in data[header_row_idx + 1 :]:
        row_times = []
        is_valid = False
        for c in range(lunes_idx):
            val = str(row[c] if c < len(row) else "").strip()
            row_times.append(val)
            if "-" in val and any(ch.isdigit() for ch in val):
                is_valid = True
        if not is_valid:
            continue
        key = tuple(row_times)
        if key not in schedule_map:
            schedule_map[key] = {"times": row_times, **{d: [] for d in days}}
        for day, col_idx in day_indices.items():
            if col_idx != -1 and col_idx < len(row):
                val = str(row[col_idx] or "").strip()
                if val and not any(w in val.upper() for w in skip_words):
                    schedule_map[key][day].append(val)
    schedule = []
    for entry in schedule_map.values():
        schedule.append(
            {
                "times": entry["times"],
                "LUNES": " / ".join(entry["LUNES"]) or "Libre",
                "MARTES": " / ".join(entry["MARTES"]) or "Libre",
                "MIERCOLES": " / ".join(entry["MIERCOLES"]) or "Libre",
                "JUEVES": " / ".join(entry["JUEVES"]) or "Libre",
                "VIERNES": " / ".join(entry["VIERNES"]) or "Libre",
            }
        )
    return schedule, time_headers


# ── PDC Generator ─────────────────────────────────────────────────────────────


def _leer_docx_texto(docx_bytes: bytes) -> str:
    from docx import Document as DocxDocument

    doc = DocxDocument(io.BytesIO(docx_bytes))
    return "\n".join(p.text for p in doc.paragraphs if p.text.strip())


def generar_pdc_trimestral(
    teacher_name: str,
    level: str,
    subject: str,
    pdc_texto: str,
    semanas_calendario: int = 12,
) -> str | None:
    max_units = (
        4 if "matemática" in subject.lower() or "matematica" in subject.lower() else 3
    )
    return generar_con_gemini(
        prompt_filename="Motor_PDC_Trimestral.txt",
        variables={
            "teacher_name": teacher_name,
            "level": level,
            "subject": subject,
            "max_units": str(max_units),
            "semanas_calendario": str(semanas_calendario),
            "pdc_texto": pdc_texto[:3000],
        },
        expect_json=False,
    )


# ── Convenience class ────────────────────────────────────────────────────────


class Helpers:
    """Convenience class grouping helper functions."""

    forzar_lista = staticmethod(forzar_lista)
    bytes_hash = staticmethod(_bytes_hash)
    get_keys = staticmethod(_get_keys)
    rotate_key = staticmethod(_rotate_key)
    topic_hash = staticmethod(_topic_hash)
    log_event = staticmethod(log_event)
    session_temp_dir = staticmethod(get_session_temp_dir)
    cargar_cache = staticmethod(_cargar_cache_hash)
    guardar_cache = staticmethod(_guardar_cache_hash)


helpers = Helpers()
