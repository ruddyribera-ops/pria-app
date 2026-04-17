"""
ui/gemini.py - Gemini AI Integration
===================================
Motor Alpha (PDF analysis), diagnostic reader, and generic Gemini generator.
"""

import os
import io
import json
import hashlib
import time
from pathlib import Path
from typing import Optional, Any

import streamlit as st
from google import genai

from ui.cache import (
    CACHE_DIR,
    _bytes_hash,
    _cargar_cache_hash,
    _guardar_cache_hash,
    get_session_temp_dir,
    log_event,
    _cargar_motor_cache,
    _guardar_motor_cache,
    _motor_cache_key,
)


# Prompt templates directory
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts_maestros")


GEMINI_MODEL = "gemini-2.5-flash"


def _secret(key: str, default: Optional[str] = None) -> Optional[str]:
    try:
        v = st.secrets.get(key, None)
        if v is not None:
            return v
    except Exception:
        pass
    return os.environ.get(key, default)


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


def _rotate_key() -> None:
    keys = _get_keys()
    if keys:
        st.session_state.key_index = (st.session_state.key_index + 1) % len(keys)


# ═══════════════════════════════════════════════════════════════════════════════
# DIAGNOSTIC READER
# ═══════════════════════════════════════════════════════════════════════════════


def leer_diagnosticos(archivos_subidos: list) -> tuple:
    # Defensive: PydanticUndefinedType is truthy-but-not-a-list — guard separately
    if not isinstance(archivos_subidos, list):
        return None, []
    if not archivos_subidos:
        return None, []
    textos_raw = []
    keys = _get_keys()
    for nombre_archivo, contenido_bytes in archivos_subidos:
        ext = nombre_archivo.lower().rsplit(".", 1)[-1]
        file_hash = _bytes_hash(contenido_bytes)
        cache_key = f"diag_{file_hash}"
        cached = _cargar_cache_hash(cache_key)
        if cached and "texto" in cached:
            textos_raw.append(f"[{nombre_archivo}]\n{cached['texto']}")
            continue
        if ext == "txt":
            try:
                c = contenido_bytes.decode("utf-8", errors="ignore").strip()
                if c:
                    textos_raw.append(f"[{nombre_archivo}]\n{c}")
                    _guardar_cache_hash(cache_key, {"texto": c})
            except Exception as e:
                textos_raw.append(f"[{nombre_archivo}] Error TXT: {e}")
        elif ext == "docx":
            try:
                import docx as _docx

                doc = _docx.Document(io.BytesIO(contenido_bytes))
                p = "\n".join(x.text for x in doc.paragraphs if x.text.strip())
                if p:
                    textos_raw.append(f"[{nombre_archivo}]\n{p}")
                    _guardar_cache_hash(cache_key, {"texto": p})
            except ImportError:
                textos_raw.append(f"[{nombre_archivo}] Instala python-docx.")
            except Exception as e:
                textos_raw.append(f"[{nombre_archivo}] Error DOCX: {e}")
        elif ext == "pdf" and keys:
            temp_path = os.path.join(
                get_session_temp_dir(), f"diag_{file_hash[:8]}_{nombre_archivo}"
            )
            with open(temp_path, "wb") as fh:
                fh.write(contenido_bytes)
            intentos_pdf = 0
            while intentos_pdf < len(keys):
                idx = st.session_state.key_index % len(keys)
                try:
                    client = genai.Client(api_key=keys[idx])
                    uploaded = client.files.upload(file=temp_path)
                    resp = client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=[
                            uploaded,
                            "Extrae todo el texto relevante de este documento de diagnóstico escolar. "
                            "Incluye nombre del estudiante (si aparece), diagnóstico principal, necesidades específicas "
                            "y recomendaciones pedagógicas. Responde SOLO con el texto extraído, sin comentarios adicionales.",
                        ],
                    )
                    client.files.delete(name=uploaded.name)
                    texto = resp.text.strip()
                    textos_raw.append(f"[{nombre_archivo}]\n{texto}")
                    _guardar_cache_hash(cache_key, {"texto": texto})
                    break
                except Exception as e:
                    err = str(e).upper()
                    if any(x in err for x in ["429", "QUOTA", "EXHAUSTED"]):
                        _rotate_key()
                        intentos_pdf += 1
                    else:
                        textos_raw.append(
                            f"[{nombre_archivo}] Error PDF: {str(e)[:200]}"
                        )
                        break
    if not textos_raw:
        return None, []
    texto_combinado = "\n\n".join(textos_raw)
    prompt_sintesis = (
        "Eres especialista en necesidades educativas especiales.\n"
        "Documentos de diagnóstico del aula:\n\n"
        f"{texto_combinado}\n\n"
        "Devuelve ÚNICAMENTE un objeto JSON con:\n"
        '  "perfil_texto": string compacto (ej. "TEA (2), TDAH (1)")\n'
        '  "tabla": lista de objetos con "Diagnóstico", "Estudiantes" (int), "Notas pedagógicas"\n'
        "Sin texto adicional ni markdown."
    )
    intentos_sint = 0
    while intentos_sint < len(keys):
        idx = st.session_state.key_index % len(keys)
        try:
            client = genai.Client(api_key=keys[idx])
            resp = client.models.generate_content(
                model=GEMINI_MODEL, contents=prompt_sintesis
            )
            clean = resp.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean)
            return data.get("perfil_texto", None), data.get("tabla", [])
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429", "QUOTA", "EXHAUSTED"]):
                _rotate_key()
                intentos_sint += 1
            else:
                break
    perfil_crudo = "; ".join(
        t.split("\n")[0].replace("[", "").replace("]", "") for t in textos_raw[:5]
    )
    return perfil_crudo, []


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR ALPHA — PDF Analysis
# ═══════════════════════════════════════════════════════════════════════════════


def analizar_pdf_ocr(pdf_bytes: bytes, filename: str) -> dict:
    VACIO = {
        "unidad_real": "Sin datos",
        "temas": [],
        "contenido_temas": {},
        "paginas_temas": {},
    }
    h = _bytes_hash(pdf_bytes)
    datos_cache = _cargar_cache_hash(h)
    if datos_cache:
        return datos_cache
    ruta_pdf = os.path.join(get_session_temp_dir(), filename)
    with open(ruta_pdf, "wb") as fh:
        fh.write(pdf_bytes)
    ruta_prompt = os.path.join(PROMPTS_DIR, "Motor_Alpha-2.txt")
    if not os.path.exists(ruta_prompt):
        return {**VACIO, "unidad_real": "Falta Motor_Alpha-2.txt"}
    with open(ruta_prompt, "r", encoding="utf-8") as fh:
        prompt_base = fh.read()
    prompt_completo = (
        prompt_base
        + """
═══════════════════════════════════════════════════════
INSTRUCCIÓN ADICIONAL — CONTENIDO CURRICULAR Y PÁGINAS
═══════════════════════════════════════════════════════
Además del índice, examina el cuerpo de cada tema y extrae:
1. "contenido_temas": dict donde cada clave es el nombre exacto del tema
   y el valor es el texto LITERAL del libro para ese tema (mínimo 80 palabras por tema).
2. "paginas_temas": dict donde cada clave es el nombre exacto del tema
   y el valor es el rango de páginas como aparece en el índice.
"""
    )
    keys = _get_keys()
    if not keys:
        return {**VACIO, "unidad_real": "Falta GEMINI_API_KEYS"}
    intentos = 0
    while intentos < len(keys):
        idx = st.session_state.key_index % len(keys)
        client = genai.Client(api_key=keys[idx])
        try:
            uploaded = client.files.upload(file=ruta_pdf)
            response = client.models.generate_content(
                model=GEMINI_MODEL, contents=[uploaded, prompt_completo]
            )
            client.files.delete(name=uploaded.name)
            clean = response.text.replace("```json", "").replace("```", "").strip()
            data = json.loads(clean)
            if "contenido_temas" not in data:
                data["contenido_temas"] = {}
            if "paginas_temas" not in data:
                data["paginas_temas"] = {}
            _guardar_cache_hash(h, data)
            return data
        except json.JSONDecodeError:
            return {**VACIO, "unidad_real": "Error de parsing JSON"}
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429", "RESOURCE_EXHAUSTED", "QUOTA"]):
                st.session_state.key_index = (idx + 1) % len(keys)
                intentos += 1
            else:
                return {**VACIO, "unidad_real": f"Error Gemini: {str(e)[:150]}"}
    return {**VACIO, "unidad_real": "Todas las llaves agotadas"}


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR PROMPT LOADER
# ═══════════════════════════════════════════════════════════════════════════════


def load_motor_prompt(motor_name: str) -> Optional[str]:
    ruta = os.path.join(PROMPTS_DIR, f"{motor_name}.txt")
    if os.path.exists(ruta):
        with open(ruta, "r", encoding="utf-8") as f:
            return f.read()
    return None


# ═══════════════════════════════════════════════════════════════════════════════
# GENERIC GEMINI GENERATOR (with caching)
# ═══════════════════════════════════════════════════════════════════════════════


def generar_con_gemini(
    prompt_filename: str,
    variables: dict,
    expect_json: bool = False,
    required_fields: Optional[list] = None,
    use_cache: bool = True,
) -> Optional[Any]:
    st.session_state.last_generar_fn = prompt_filename
    st.session_state.last_generar_vars = variables
    st.session_state.last_generar_json = expect_json
    motor_name = prompt_filename.replace(".txt", "")
    template = load_motor_prompt(motor_name)
    if not template:
        msg = f"Error cargando prompt: {prompt_filename}"
        st.error(f"❌ {msg}")
        log_event(f"generar:{prompt_filename}", False, msg)
        return None
    if "grado_nivel" not in variables:
        variables = {
            **variables,
            "grado_nivel": st.session_state.get("grado_nivel", "5to primaria"),
        }

    # Cache check
    cache_key = _motor_cache_key(prompt_filename, variables)
    if use_cache:
        cached = _cargar_motor_cache(cache_key)
        if cached is not None:
            log_event(f"cache_hit:{prompt_filename}", True)
            return cached

    prompt_final = template
    for key, value in variables.items():
        prompt_final = prompt_final.replace("{" + key + "}", str(value))
    keys = _get_keys()
    intentos = 0
    while intentos < len(keys):
        idx = st.session_state.key_index % len(keys)
        client = genai.Client(api_key=keys[idx])
        try:
            log_event(f"generar:{prompt_filename}", True)
            response = client.models.generate_content(
                model=GEMINI_MODEL, contents=prompt_final
            )
            if expect_json:
                clean = response.text.replace("```json", "").replace("```", "").strip()
                try:
                    data = json.loads(clean)
                except json.JSONDecodeError as e:
                    raw_snippet = response.text[:600]
                    st.session_state.last_error = response.text
                    log_event(f"json_error:{prompt_filename}", False, str(e))
                    st.error(
                        f"❌ **JSON inválido** en `{prompt_filename}` — {e}\n\n**Respuesta (primeros 600 chars):**\n```\n{raw_snippet}\n```"
                    )
                    return None
                if required_fields:
                    faltantes = [f for f in required_fields if f not in data]
                    if faltantes:
                        st.warning(
                            f"⚠️ `{prompt_filename}` sin campos: `{', '.join(faltantes)}`"
                        )
                st.session_state.last_error = None
                if use_cache:
                    _guardar_motor_cache(cache_key, data, prompt_filename)
                return data
            st.session_state.last_error = None
            if use_cache:
                _guardar_motor_cache(cache_key, response.text, prompt_filename)
            return response.text
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429", "RESOURCE_EXHAUSTED", "QUOTA"]):
                st.session_state.key_index = (idx + 1) % len(keys)
                intentos += 1
            else:
                log_event(f"generar:{prompt_filename}", False, str(e))
                st.error(f"❌ Error en **{prompt_filename}**: {str(e)[:300]}")
                return None
    msg = "Todas las llaves API han agotado su cuota."
    log_event(f"generar:{prompt_filename}", False, msg)
    st.error(f"⚠️ {msg}")
    return None
