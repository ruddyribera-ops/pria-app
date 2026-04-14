import streamlit as st
import os
import json
import hashlib
from google import genai
from exportar import render_panel_exportacion

# ─────────────────────────────────────────────────────────────────────────────
# CONFIGURACIÓN DE PANTALLA
# ─────────────────────────────────────────────────────────────────────────────
st.set_page_config(
    page_title="PRIA v5.4 — Método Palma-Ribera",
    layout="wide",
    page_icon="🦉"
)

# ─────────────────────────────────────────────────────────────────────────────
# CSS — BLANCO + VERDE PALMA  (FIX: texto blanco ilegible)
# Cobertura exhaustiva de todos los elementos de Streamlit
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
/* ── Fondo global ─────────────────────────────────────── */
.stApp, .main, section[data-testid="stSidebar"] {
    background-color: #FFFFFF !important;
}

/* ── Texto universal: verde oscuro sobre blanco ────────── */
body, p, span, li, div, td, th, caption,
label, small, em, strong, blockquote,
.stMarkdown, .stText, .stCaption,
div[data-testid="stMarkdownContainer"],
div[data-testid="stMarkdownContainer"] *,
div[data-testid="stWidgetLabel"] p,
div[data-testid="stWidgetLabel"] span,
div[class*="streamlit"] { 
    color: #1B5E20 !important;
}

/* ── Títulos ───────────────────────────────────────────── */
h1, h2, h3, h4, h5, h6 {
    color: #1B5E20 !important; font-weight: 900 !important;
}

/* ── Expanders ─────────────────────────────────────────── */
details summary p,
details summary span,
div[data-testid="stExpander"] summary p {
    color: #1B5E20 !important; font-weight: 700 !important;
}
div[data-testid="stExpander"] div[data-testid="stMarkdownContainer"] * {
    color: #1B5E20 !important;
}

/* ── Radio buttons ─────────────────────────────────────── */
.stRadio label, .stRadio label p,
.stRadio div[role="radiogroup"] label,
.stRadio div[role="radiogroup"] label p {
    color: #1B5E20 !important; font-weight: 700 !important;
}

/* ── Checkboxes ────────────────────────────────────────── */
.stCheckbox label, .stCheckbox label p {
    color: #1B5E20 !important; font-weight: 700 !important;
}

/* ── Dropdowns / selects ───────────────────────────────── */
div[data-baseweb="select"] > div,
div[data-baseweb="select"] span {
    background-color: rgba(200,230,201,0.65) !important;
    color: #1B5E20 !important;
    border: 2px solid #1B5E20 !important;
    border-radius: 6px !important;
}
ul[data-baseweb="menu"] { background-color: #FFFFFF !important; }
ul[data-baseweb="menu"] li, ul[data-baseweb="menu"] li span {
    color: #1B5E20 !important; font-weight: 700 !important;
}

/* ── Inputs y textareas ────────────────────────────────── */
input[type="text"], input[type="number"], textarea {
    background-color: rgba(200,230,201,0.65) !important;
    color: #1B5E20 !important;
    border: 2px solid #1B5E20 !important;
    border-radius: 6px !important;
}

/* ── Disabled inputs (páginas no editables) ────────────── */
input:disabled, textarea:disabled {
    background-color: rgba(200,230,201,0.35) !important;
    color: #1B5E20 !important;
    -webkit-text-fill-color: #1B5E20 !important;
    border: 2px dashed #4CAF50 !important;
    opacity: 1 !important;
}

/* ── Alertas / banners (info, success, warning, error) ─── */
div[data-testid="stAlert"] *,
div[class*="stAlert"] * {
    color: #1B5E20 !important;
}

/* ── Dataframe ─────────────────────────────────────────── */
.stDataFrame, .stDataFrame * {
    color: #1B5E20 !important;
}

/* ── Tabs ──────────────────────────────────────────────── */
button[data-baseweb="tab"],
button[data-baseweb="tab"] p,
button[data-baseweb="tab"] span {
    color: #1B5E20 !important; font-weight: 800 !important;
}

/* ── Tabla diagnósticos compacta ───────────────────────── */
.diag-table {
    width:100%; border-collapse:collapse; margin:8px 0 16px 0;
}
.diag-table td {
    border:2px solid #1B5E20; padding:8px 12px; text-align:center;
    background-color:#F1F8E9; color:#1B5E20 !important;
    font-weight:900; font-size:0.88rem; line-height:1.4;
}

/* ── Botones ───────────────────────────────────────────── */
.stButton > button {
    background-color: #1B5E20 !important; color: #FFFFFF !important;
    font-weight: 800 !important; border-radius: 6px !important;
    height: 3.2rem !important;
}

/* ── Sidebar ───────────────────────────────────────────── */
section[data-testid="stSidebar"] * {
    color: #1B5E20 !important;
}
</style>
""", unsafe_allow_html=True)

# ─────────────────────────────────────────────────────────────────────────────
# RUTAS DEL SISTEMA
# ─────────────────────────────────────────────────────────────────────────────
BASE_DIR    = r"C:\Users\Windows\Desktop\PRIA v3"
TB_DIR      = os.path.join(BASE_DIR, "biblioteca", "TextBooks_TB")
SB_DIR      = os.path.join(BASE_DIR, "biblioteca", "StudentBooks_SB")
DIAG_DIR    = os.path.join(BASE_DIR, "diagnosticos")
PROMPTS_DIR = os.path.join(BASE_DIR, "prompts_maestros")
# FIX: carpeta de caché en disco para no re-analizar PDFs
CACHE_DIR   = os.path.join(BASE_DIR, "cache_libros")
os.makedirs(CACHE_DIR, exist_ok=True)

GEMINI_MODEL = "gemini-3.1-pro-preview"

# ─────────────────────────────────────────────────────────────────────────────
# INICIALIZACIÓN DE SESIÓN
# ─────────────────────────────────────────────────────────────────────────────
_defaults: dict = {
    "key_index":              0,
    "diagnosticos_texto":     None,
    "diagnosticos_tabla":     [],
    "res_m0a":                None,
    "res_m0b":                None,
    "res_m0c":                None,
    "tema_activo":            "",
    "tema_hash":              "",
    "leccion_index":          0,
    "conceptos_activos":      [],
    "palabras_clave_activas": [],
    "contenido_tema_activo":  "",
    "res_m1a":                None,
    "res_m1a_prev":           None,
    "res_m1b":                None,
    "res_m1c":                None,
    "res_m2a":                None,
    "res_m2b":                None,
    # FIX: control de vista de adaptaciones previas
    "mostrar_adaptaciones_prev": False,
}
for _k, _v in _defaults.items():
    if _k not in st.session_state:
        st.session_state[_k] = _v

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS
# ─────────────────────────────────────────────────────────────────────────────
def limpiar_nombre_archivo(nombre: str) -> str:
    return nombre.replace(".pdf","").replace("_TB","").replace("_SB","").replace("_"," ").strip()

def forzar_lista(valor) -> list:
    if isinstance(valor, list):  return [str(v) for v in valor if v]
    if isinstance(valor, str):   return [v.strip() for v in valor.split(",") if v.strip()]
    return []

def _get_keys() -> list:
    return st.secrets.get("GEMINI_API_KEYS", [])

def _rotate_key():
    keys = _get_keys()
    if keys:
        st.session_state.key_index = (st.session_state.key_index + 1) % len(keys)

def _topic_hash(tema: str) -> str:
    return hashlib.md5(tema.strip().lower().encode()).hexdigest()

def _pdf_cache_path(ruta_pdf: str) -> str:
    """Devuelve la ruta al archivo JSON de caché para un PDF dado."""
    nombre_base = os.path.splitext(os.path.basename(ruta_pdf))[0]
    return os.path.join(CACHE_DIR, f"{nombre_base}.json")

def _cargar_cache_pdf(ruta_pdf: str) -> dict | None:
    """Carga datos desde caché si existen y el PDF no fue modificado después."""
    cache_path = _pdf_cache_path(ruta_pdf)
    if not os.path.exists(cache_path):
        return None
    # Invalidar caché si el PDF es más reciente que el JSON
    if os.path.getmtime(ruta_pdf) > os.path.getmtime(cache_path):
        return None
    try:
        with open(cache_path, "r", encoding="utf-8") as fh:
            return json.load(fh)
    except Exception:
        return None

def _guardar_cache_pdf(ruta_pdf: str, data: dict):
    """Guarda los datos extraídos en un JSON de caché en disco."""
    cache_path = _pdf_cache_path(ruta_pdf)
    try:
        with open(cache_path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
    except Exception:
        pass  # Caché fallida no es crítica


# ─────────────────────────────────────────────────────────────────────────────
# LECTURA AUTOMÁTICA DE DIAGNÓSTICOS (PDF / DOCX / TXT)
# ─────────────────────────────────────────────────────────────────────────────
@st.cache_data(show_spinner="🩺 Leyendo expedientes de diagnósticos…")
def leer_diagnosticos(diag_dir: str) -> tuple:
    FALLBACK_TEXTO = "TEA (1), TDAH (2), Dislexia (1), Alta Capacidad (1)"
    FALLBACK_TABLA = [
        {"Diagnóstico":"TEA",            "Estudiantes":1, "Notas pedagógicas":"Anticipación visual, lenguaje literal."},
        {"Diagnóstico":"TDAH",           "Estudiantes":2, "Notas pedagógicas":"Pausas activas, tareas fraccionadas."},
        {"Diagnóstico":"Dislexia",       "Estudiantes":1, "Notas pedagógicas":"Fuente sin serifa, audio alternativo."},
        {"Diagnóstico":"Alta Capacidad", "Estudiantes":1, "Notas pedagógicas":"Proyectos de extensión y liderazgo."},
    ]
    if not os.path.exists(diag_dir):
        return FALLBACK_TEXTO, FALLBACK_TABLA

    archivos = [f for f in os.listdir(diag_dir)
                if f.lower().endswith((".pdf",".docx",".txt"))]
    if not archivos:
        return FALLBACK_TEXTO, FALLBACK_TABLA

    textos_raw = []
    keys = _get_keys()

    for nombre_archivo in archivos:
        ruta = os.path.join(diag_dir, nombre_archivo)
        ext  = nombre_archivo.lower().rsplit(".",1)[-1]

        if ext == "txt":
            try:
                with open(ruta,"r",encoding="utf-8",errors="ignore") as fh:
                    c = fh.read().strip()
                if c: textos_raw.append(f"[{nombre_archivo}]\n{c}")
            except Exception as e:
                textos_raw.append(f"[{nombre_archivo}] Error TXT: {e}")

        elif ext == "docx":
            try:
                import docx as _docx
                doc = _docx.Document(ruta)
                p = "\n".join(x.text for x in doc.paragraphs if x.text.strip())
                if p: textos_raw.append(f"[{nombre_archivo}]\n{p}")
            except ImportError:
                textos_raw.append(f"[{nombre_archivo}] Instala python-docx.")
            except Exception as e:
                textos_raw.append(f"[{nombre_archivo}] Error DOCX: {e}")

        elif ext == "pdf" and keys:
            intentos_pdf = 0
            while intentos_pdf < len(keys):
                idx = st.session_state.key_index % len(keys)
                try:
                    client   = genai.Client(api_key=keys[idx])
                    uploaded = client.files.upload(file=ruta)
                    resp = client.models.generate_content(
                        model=GEMINI_MODEL,
                        contents=[uploaded,
                            "Extrae todo el texto relevante de este documento de diagnóstico escolar. "
                            "Incluye nombre del estudiante (si aparece), diagnóstico principal, "
                            "necesidades específicas y recomendaciones pedagógicas. "
                            "Responde SOLO con el texto extraído, sin comentarios adicionales."]
                    )
                    client.files.delete(name=uploaded.name)
                    textos_raw.append(f"[{nombre_archivo}]\n{resp.text.strip()}")
                    break
                except Exception as e:
                    err = str(e).upper()
                    if any(x in err for x in ["429","QUOTA","EXHAUSTED"]):
                        _rotate_key(); intentos_pdf += 1
                    else:
                        textos_raw.append(f"[{nombre_archivo}] Error PDF: {str(e)[:200]}"); break

    if not textos_raw:
        return FALLBACK_TEXTO, FALLBACK_TABLA

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
            resp   = client.models.generate_content(model=GEMINI_MODEL, contents=prompt_sintesis)
            clean  = resp.text.replace("```json","").replace("```","").strip()
            data   = json.loads(clean)
            return data.get("perfil_texto",FALLBACK_TEXTO), data.get("tabla",FALLBACK_TABLA)
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429","QUOTA","EXHAUSTED"]):
                _rotate_key(); intentos_sint += 1
            else:
                break

    perfil_crudo = "; ".join(t.split("\n")[0].replace("[","").replace("]","") for t in textos_raw[:5])
    return perfil_crudo, [{"Diagnóstico":"Ver archivos","Estudiantes":"?","Notas pedagógicas":"Error al sintetizar"}]


# ─────────────────────────────────────────────────────────────────────────────
# MOTOR ALPHA — extrae índice + CONTENIDO REAL + PÁGINAS por tema
# FIX: guarda resultado en disco (cache_libros/) para no re-analizar el PDF
# ─────────────────────────────────────────────────────────────────────────────
def analizar_pdf_ocr(ruta_pdf: str) -> dict:
    """
    Extrae de un PDF escaneado:
      - unidad_real   : nombre de la unidad
      - temas         : lista de títulos de temas
      - contenido_temas: dict {tema: texto_curricular_completo}
      - paginas_temas  : dict {tema: "pp. X-Y"}  ← NUEVO
    Guarda y carga desde caché en disco para evitar re-análisis.
    """
    VACIO = {"unidad_real":"Sin datos","temas":[],"contenido_temas":{},"paginas_temas":{}}

    if not os.path.exists(ruta_pdf):
        return {**VACIO, "unidad_real":"Archivo no encontrado"}

    # ── Intentar cargar desde caché en disco ─────────────────────────────────
    datos_cache = _cargar_cache_pdf(ruta_pdf)
    if datos_cache:
        return datos_cache  # Hit de caché: sin llamada a Gemini

    ruta_prompt = os.path.join(PROMPTS_DIR, "Motor_Alpha-2.txt")
    if not os.path.exists(ruta_prompt):
        return {**VACIO, "unidad_real":"Falta Motor_Alpha-2.txt"}

    with open(ruta_prompt, "r", encoding="utf-8") as fh:
        prompt_base = fh.read()

    prompt_completo = prompt_base + """

═══════════════════════════════════════════════════════
INSTRUCCIÓN ADICIONAL — CONTENIDO CURRICULAR Y PÁGINAS
═══════════════════════════════════════════════════════
Además del índice, examina el cuerpo de cada tema y extrae:

1. "contenido_temas": dict donde cada clave es el nombre exacto del tema
   y el valor es el texto LITERAL del libro para ese tema (definiciones,
   explicaciones, ejemplos, reglas). Mínimo 80 palabras por tema.
   Si una página es ilegible, escribe "(página ilegible)".

2. "paginas_temas": dict donde cada clave es el nombre exacto del tema
   y el valor es el rango de páginas como aparece en el índice del libro,
   por ejemplo: "pp. 12-15" o "pág. 34".

Incluye ambas claves en el JSON de salida.
Los nombres de los temas deben coincidir EXACTAMENTE con los de "temas".
"""

    keys = _get_keys()
    if not keys:
        return {**VACIO, "unidad_real":"Falta GEMINI_API_KEYS"}

    intentos = 0
    while intentos < len(keys):
        idx    = st.session_state.key_index % len(keys)
        client = genai.Client(api_key=keys[idx])
        try:
            uploaded = client.files.upload(file=ruta_pdf)
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=[uploaded, prompt_completo]
            )
            client.files.delete(name=uploaded.name)
            clean = response.text.replace("```json","").replace("```","").strip()
            data  = json.loads(clean)
            if "contenido_temas" not in data: data["contenido_temas"] = {}
            if "paginas_temas"   not in data: data["paginas_temas"]   = {}
            # ── Guardar en caché de disco ─────────────────────────────────────
            _guardar_cache_pdf(ruta_pdf, data)
            return data
        except json.JSONDecodeError:
            return {**VACIO, "unidad_real":"Error de parsing JSON"}
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429","RESOURCE_EXHAUSTED","QUOTA"]):
                st.session_state.key_index = (idx+1) % len(keys)
                intentos += 1
            else:
                return {**VACIO, "unidad_real":f"Error Gemini: {str(e)[:150]}"}

    return {**VACIO, "unidad_real":"Todas las llaves agotadas"}


# ─────────────────────────────────────────────────────────────────────────────
# MOTOR GEMINI GENÉRICO
# ─────────────────────────────────────────────────────────────────────────────
def generar_con_gemini(prompt_filename: str, variables: dict, expect_json: bool = False):
    ruta = os.path.join(PROMPTS_DIR, prompt_filename)
    if not os.path.exists(ruta):
        st.error(f"❌ Prompt no encontrado: **{prompt_filename}**")
        return None

    with open(ruta,"r",encoding="utf-8") as fh:
        template = fh.read()

    prompt_final = template
    for key, value in variables.items():
        prompt_final = prompt_final.replace("{"+key+"}", str(value))

    keys     = _get_keys()
    intentos = 0
    while intentos < len(keys):
        idx    = st.session_state.key_index % len(keys)
        client = genai.Client(api_key=keys[idx])
        try:
            response = client.models.generate_content(model=GEMINI_MODEL, contents=prompt_final)
            if expect_json:
                clean = response.text.replace("```json","").replace("```","").strip()
                return json.loads(clean)
            return response.text
        except json.JSONDecodeError as e:
            st.error(f"❌ JSON inválido de **{prompt_filename}**: {e}")
            return None
        except Exception as e:
            err = str(e).upper()
            if any(x in err for x in ["429","RESOURCE_EXHAUSTED","QUOTA"]):
                st.session_state.key_index = (idx+1) % len(keys)
                intentos += 1
            else:
                st.error(f"❌ Error en **{prompt_filename}**: {str(e)[:300]}")
                return None

    st.error("⚠️ Todas las llaves API han agotado su cuota.")
    return None


# ═════════════════════════════════════════════════════════════════════════════
# INTERFAZ PRINCIPAL
# ═════════════════════════════════════════════════════════════════════════════
st.title("🦉 PRIA v5.4 — Planificación Neuro-Inclusiva")
st.caption("Método Palma-Ribera · DUA · Inteligencias Múltiples · Motor Gemini")

# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN 1 — SELECCIÓN DE MATERIALES
# ─────────────────────────────────────────────────────────────────────────────
with st.container(border=True):
    st.markdown("### 📥 1. Selección de Materiales")

    archivos_tb = sorted([f for f in os.listdir(TB_DIR) if f.endswith(".pdf")]) if os.path.exists(TB_DIR) else []
    archivos_sb = sorted([f for f in os.listdir(SB_DIR) if f.endswith(".pdf")]) if os.path.exists(SB_DIR) else []

    c1, c2 = st.columns([3,1])
    with c1:
        if not archivos_tb:
            st.error("⚠️ Carpeta TextBooks vacía o no encontrada.")
            datos_libro = {"unidad_real":"Sin archivos","temas":["N/A"],"contenido_temas":{},"paginas_temas":{}}
        else:
            archivo_seleccionado = st.selectbox(
                "📗 Libro de Texto (TextBook):",
                archivos_tb,
                format_func=limpiar_nombre_archivo
            )
            ruta_tb     = os.path.join(TB_DIR, archivo_seleccionado)
            # Spinner solo aparece si no hay caché
            cache_existe = _cargar_cache_pdf(ruta_tb) is not None
            if not cache_existe:
                with st.spinner("👁️ Motor Alpha leyendo el PDF del libro… (solo ocurre una vez)"):
                    datos_libro = analizar_pdf_ocr(ruta_tb)
            else:
                datos_libro = analizar_pdf_ocr(ruta_tb)
    with c2:
        cache_label = "📦 desde caché" if cache_existe else "🔍 nuevo análisis"
        st.success(f"📚 **Unidad Detectada:**\n\n{datos_libro.get('unidad_real','Analizando…')}\n\n*{cache_label}*")

    usar_sb    = st.radio("📘 ¿Esta lección usa Student Book?", ["No","Sí"], horizontal=True, key="radio_sb")
    pags_sb    = "N/A"
    datos_sb   = {}
    if usar_sb == "Sí":
        c_sb1, _ = st.columns([3,1])
        with c_sb1:
            if archivos_sb:
                archivo_sb_sel = st.selectbox(
                    "📙 Student Book:", archivos_sb,
                    format_func=limpiar_nombre_archivo, key="sel_sb"
                )
                ruta_sb  = os.path.join(SB_DIR, archivo_sb_sel)
                cache_sb = _cargar_cache_pdf(ruta_sb)
                if not cache_sb:
                    with st.spinner("👁️ Motor Alpha leyendo el Student Book…"):
                        datos_sb = analizar_pdf_ocr(ruta_sb)
                else:
                    datos_sb = cache_sb
            else:
                st.warning("⚠️ Carpeta StudentBooks vacía.")

temas_reales    = forzar_lista(datos_libro.get("temas", ["No se encontraron temas"]))
contenido_temas = datos_libro.get("contenido_temas", {})
paginas_temas   = datos_libro.get("paginas_temas",   {})   # FIX: páginas extraídas del índice

# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN 2 — PERFIL NEURO-INCLUSIVO (auto desde carpeta diagnosticos/)
# ─────────────────────────────────────────────────────────────────────────────
st.markdown("### 🩺 2. Perfil Neuro-Inclusivo del Aula")

if st.session_state.diagnosticos_texto is None:
    with st.spinner("🔍 Leyendo expedientes de diagnósticos…"):
        p_texto, p_tabla = leer_diagnosticos(DIAG_DIR)
        st.session_state.diagnosticos_texto = p_texto
        st.session_state.diagnosticos_tabla = p_tabla

DIAGNOSTICOS = st.session_state.diagnosticos_texto

if st.session_state.diagnosticos_tabla:
    st.dataframe(st.session_state.diagnosticos_tabla, use_container_width=True, hide_index=True)
else:
    st.info(DIAGNOSTICOS)

col_rel, _ = st.columns([1,4])
with col_rel:
    if st.button("🔄 Releer diagnósticos"):
        leer_diagnosticos.clear()
        st.session_state.diagnosticos_texto = None
        st.session_state.diagnosticos_tabla = []
        st.rerun()

# ─────────────────────────────────────────────────────────────────────────────
# TABS — NOMBRES LIMPIOS
# ─────────────────────────────────────────────────────────────────────────────
tab_unidad, tab_clase, tab_eval = st.tabs([
    "🏗️ Plan de Unidad y ABP",
    "🚀 Plan de Clase y Fichas",
    "📝 Evaluaciones",
])


# ═════════════════════════════════════════════════════════════════════════════
# TAB 1 — PLAN DE UNIDAD Y ABP
# ═════════════════════════════════════════════════════════════════════════════
with tab_unidad:
    st.markdown("Genera la síntesis curricular completa de la unidad y el Proyecto ABP.")
    st.info("💡 Trabaja sobre la **unidad completa**. No se selecciona un tema específico aquí.", icon="ℹ️")

    c_cfg1, c_cfg2 = st.columns(2)
    with c_cfg1:
        # FIX: campo vacío por defecto
        recursos_aula   = st.text_input("🖥️ Recursos disponibles en aula:", value="", placeholder="Ej: proyector, tablets, materiales de arte…")
        permitir_online = st.radio("🌐 ¿Investigación online en el ABP?", ["Sí","No"], horizontal=True, key="online_m0")
    with c_cfg2:
        # FIX: campo vacío por defecto
        user_sug_m0 = st.text_area("💬 Sugerencias del docente:", value="", placeholder="Escribe aquí cualquier indicación especial…", height=80, key="sug_m0")

    if st.button("🛠️ Generar Síntesis Curricular", use_container_width=True):
        with st.spinner("Sintetizando unidad y conceptos clave…"):
            vars_m0a = {
                "unidad_real":     datos_libro.get("unidad_real",""),
                "temas":           str(temas_reales),
                "contenido_temas": json.dumps(contenido_temas, ensure_ascii=False),
                "diagnosticos":    DIAGNOSTICOS,
            }
            resultado = generar_con_gemini("Motor_M0a.txt", vars_m0a, expect_json=True)
            st.session_state.res_m0a = resultado
            st.session_state.res_m0b = None
            st.session_state.res_m0c = None

    # ── Render M0a ──────────────────────────────────────────────────────────
    if st.session_state.res_m0a and "unidad_sintetizada" in st.session_state.res_m0a:
        unidad = st.session_state.res_m0a["unidad_sintetizada"]
        st.success("✅ ¡Síntesis curricular generada!")
        st.markdown(f"## 📘 {unidad.get('titulo','Sin Título')}")
        st.divider()

        c_izq, c_der = st.columns([1.6,1], gap="large")
        with c_izq:
            st.markdown("### 📑 Temas de la Unidad")
            for tema in unidad.get("temas_desarrollados",[]):
                nombre_t = tema.get("nombre","Tema")
                with st.expander(f"**📍 {nombre_t}**", expanded=False):
                    cc, ci = st.columns(2)
                    with cc:
                        st.markdown("**🔑 Conceptos Clave:**")
                        for item in forzar_lista(tema.get("conceptos_clave") or tema.get("conceptos") or []):
                            st.markdown(f"- {item}")
                    with ci:
                        st.markdown("**🧠 Inteligencias Múltiples:**")
                        for item in forzar_lista(tema.get("inteligencias_sugeridas") or tema.get("inteligencias") or []):
                            st.markdown(f"- {item}")
                    texto_real = contenido_temas.get(nombre_t,"")
                    if texto_real:
                        st.markdown("**📖 Contenido del libro (extracto):**")
                        st.caption(texto_real[:500] + ("…" if len(texto_real)>500 else ""))
        with c_der:
            st.markdown("### 👨‍🏫 Notas DUA del Docente")
            st.info(unidad.get("notas_docente","—"))
            st.markdown("### 🚀 Proyecto ABP *(resumen)*")
            st.success(unidad.get("proyecto_pbl","⚠️ La IA no generó el proyecto."))

        st.divider()

        if st.button("➡️ Diseñar Proyecto ABP Completo", use_container_width=True, type="primary"):
            with st.spinner("M0b diseñando el Proyecto ABP…"):
                vars_m0b = {
                    "unidad_json":                   json.dumps(unidad, ensure_ascii=False),
                    "diagnosticos":                  DIAGNOSTICOS,
                    "recursos_aula":                 recursos_aula or "No especificado",
                    "permitir_investigacion_online": permitir_online,
                    "user_suggestions":              user_sug_m0 or "Ninguna",
                }
                st.session_state.res_m0b = generar_con_gemini("Motor_M0b.txt", vars_m0b, expect_json=False)

            if st.session_state.res_m0b:
                with st.spinner("M0c creando rúbricas y fichas…"):
                    vars_m0c = {
                        "proyecto_pbl":    st.session_state.res_m0b,
                        "unidad_json":     json.dumps(unidad, ensure_ascii=False),
                        "diagnosticos":    DIAGNOSTICOS,
                        "user_suggestions": user_sug_m0 or "Ninguna",
                    }
                    st.session_state.res_m0c = generar_con_gemini("Motor_M0c.txt", vars_m0c, expect_json=False)

    if st.session_state.res_m0b:
        st.divider()
        st.markdown("### 📋 Proyecto ABP Detallado")
        st.markdown(st.session_state.res_m0b)

    if st.session_state.res_m0c:
        st.divider()
        st.markdown("### 📊 Rúbrica y Fichas de Proceso")
        st.markdown(st.session_state.res_m0c)


# ═════════════════════════════════════════════════════════════════════════════
# TAB 2 — PLAN DE CLASE Y FICHAS
# ═════════════════════════════════════════════════════════════════════════════
with tab_clase:
    st.markdown("Crea el plan de clase de 45 min, las diapositivas y la ficha gamificada.")

    with st.container(border=True):
        st.markdown("#### 🎯 Configuración de la Lección")

        tema_final = st.selectbox("📍 Tema de la Clase:", temas_reales, key="sel_tema_m1")

        # Detectar cambio de tema → limpiar M1
        tema_hash_nuevo = _topic_hash(tema_final)
        if tema_hash_nuevo != st.session_state.tema_hash:
            st.session_state.res_m1a_prev         = st.session_state.res_m1a
            st.session_state.res_m1a              = None
            st.session_state.res_m1b              = None
            st.session_state.res_m1c              = None
            st.session_state.tema_hash            = tema_hash_nuevo
            st.session_state.tema_activo          = tema_final
            st.session_state.mostrar_adaptaciones_prev = False

        # FIX: páginas extraídas automáticamente del índice, no editables
        pags_tb_auto  = paginas_temas.get(tema_final, "—")
        pags_sb_temas = datos_sb.get("paginas_temas", {}) if datos_sb else {}
        pags_sb_auto  = pags_sb_temas.get(tema_final, "—") if usar_sb == "Sí" else "N/A"

        c_pags1, c_pags2 = st.columns(2)
        with c_pags1:
            st.markdown("**📄 Páginas TextBook:**")
            st.markdown(
                f"<div style='background:rgba(200,230,201,0.35);border:2px dashed #4CAF50;"
                f"border-radius:6px;padding:8px 14px;color:#1B5E20;font-weight:800;'>"
                f"📖 {pags_tb_auto}</div>",
                unsafe_allow_html=True
            )
        with c_pags2:
            st.markdown("**📄 Páginas Student Book:**")
            st.markdown(
                f"<div style='background:rgba(200,230,201,0.35);border:2px dashed #4CAF50;"
                f"border-radius:6px;padding:8px 14px;color:#1B5E20;font-weight:800;'>"
                f"📖 {pags_sb_auto}</div>",
                unsafe_allow_html=True
            )

        c_m1a, c_m1b_col = st.columns(2)
        with c_m1a:
            objetivo_gen = st.text_input("🎯 Objetivo General (opcional):", value="", placeholder="Déjalo vacío para que la IA lo defina…", key="obj_m1")
        with c_m1b_col:
            personaje_genero = st.radio(
                "🧒 Género del personaje visual:",
                ["masculino","femenino","ambos"],
                horizontal=True, key="genero_m1"
            )
        # FIX: sugerencias vacías por defecto
        user_sug_m1 = st.text_area(
            "💬 Sugerencias del docente:",
            value="",
            placeholder="Escribe aquí cualquier indicación especial para esta lección…",
            height=68, key="sug_m1"
        )

    # ── FIX: botón para ver adaptaciones anteriores antes de generar nuevo ──
    if st.session_state.res_m1a_prev:
        col_prev, col_gen = st.columns([1,2])
        with col_prev:
            label_prev = "🙈 Ocultar adaptaciones anteriores" if st.session_state.mostrar_adaptaciones_prev else "👁️ Ver adaptaciones anteriores"
            if st.button(label_prev, use_container_width=True):
                st.session_state.mostrar_adaptaciones_prev = not st.session_state.mostrar_adaptaciones_prev

        if st.session_state.mostrar_adaptaciones_prev:
            with st.container(border=True):
                st.markdown("#### 📋 Adaptaciones de la lección anterior")
                prev = st.session_state.res_m1a_prev
                adapt_prev = prev.get("tabla_adaptaciones_clase",[])
                if adapt_prev:
                    st.dataframe(adapt_prev, use_container_width=True, hide_index=True)
                dua_prev = prev.get("dua_neuroinclusion",[])
                if dua_prev:
                    st.markdown("**Directrices DUA anteriores:**")
                    for d in forzar_lista(dua_prev):
                        st.markdown(f"- {d}")
                st.caption("Revisa estas adaptaciones. Si ya son suficientes, no necesitas generar un nuevo plan. Si deseas mejorarlas, escribe tus sugerencias arriba y presiona Generar.")

        with col_gen:
            btn_generar = st.button("✨ Generar Nuevo Plan de Clase", use_container_width=True)
    else:
        btn_generar = st.button("✨ Generar Plan de Clase", use_container_width=True)

    if btn_generar:
        conceptos_clave   = []
        inteligencias_sug = []
        palabras_clave    = []

        if st.session_state.res_m0a and "unidad_sintetizada" in st.session_state.res_m0a:
            for t in st.session_state.res_m0a["unidad_sintetizada"].get("temas_desarrollados",[]):
                if t.get("nombre","") == tema_final:
                    conceptos_clave   = forzar_lista(t.get("conceptos_clave") or t.get("conceptos") or [])
                    inteligencias_sug = forzar_lista(t.get("inteligencias_sugeridas") or t.get("inteligencias") or [])
                    palabras_clave    = conceptos_clave
                    break

        contenido_real_tema = contenido_temas.get(tema_final,"")
        st.session_state.tema_activo            = tema_final
        st.session_state.conceptos_activos      = conceptos_clave
        st.session_state.palabras_clave_activas = palabras_clave
        st.session_state.contenido_tema_activo  = contenido_real_tema

        contexto_prev = ""
        if st.session_state.res_m1a_prev:
            contexto_prev = (
                "CONTEXTO DE MEJORA: Ya existe un plan para otra lección de esta unidad. "
                "Estudia las adaptaciones previas y MEJÓRALAS o VARÍA sin repetirlas exactamente.\n"
                "Adaptaciones previas:\n"
                + json.dumps({
                    k: st.session_state.res_m1a_prev.get(k)
                    for k in ["mapa_cognitivo","dua_neuroinclusion","tabla_adaptaciones_clase"]
                    if k in st.session_state.res_m1a_prev
                  }, ensure_ascii=False)[:800]
            )

        with st.spinner("Diseñando la estrategia de clase…"):
            vars_m1a = {
                "tema_clase":              tema_final,
                "conceptos_clave":         str(conceptos_clave) or "Derivar del contenido del libro",
                "palabras_clave":          str(palabras_clave)  or tema_final,
                "inteligencias_sugeridas": str(inteligencias_sug) or "Lingüística, Visual-espacial",
                "contenido_curricular":    contenido_real_tema[:1500] or "No disponible",
                "diagnosticos":            DIAGNOSTICOS,
                "objetivo_general":        objetivo_gen or "No especificado",
                "PAG_TB":                  pags_tb_auto,
                "PAG_SB":                  pags_sb_auto,
                "user_suggestions":        user_sug_m1 or "Ninguna",
                "contexto_leccion_previa": contexto_prev,
            }
            st.session_state.res_m1a  = generar_con_gemini("Motor_M1a.txt", vars_m1a, expect_json=True)
            st.session_state.res_m1b  = None
            st.session_state.res_m1c  = None
            st.session_state.leccion_index += 1
            st.session_state.mostrar_adaptaciones_prev = False

    # ── Render M1a ──────────────────────────────────────────────────────────
    if st.session_state.res_m1a:
        res     = st.session_state.res_m1a
        lec_num = st.session_state.leccion_index
        st.success(f"✅ Plan de clase #{lec_num} — **{st.session_state.tema_activo}**")

        c_izq, c_der = st.columns([1.6,1], gap="large")
        with c_izq:
            st.markdown("### 🎯 Verbos Operativos (Bloom)")
            for v in forzar_lista(res.get("mapa_cognitivo",{}).get("verbos",[])):
                st.checkbox(v, value=True, key=f"bloom_{lec_num}_{v}")

            st.markdown("### 🧩 Inteligencias Múltiples")
            im_data = res.get("inteligencias_multiples",[])
            if im_data:
                st.dataframe(im_data, use_container_width=True, hide_index=True)

            st.markdown("### ⏱️ Secuencia Didáctica *(45 min)*")
            for bloque in res.get("secuencia_didactica",{}).get("bloques",[]):
                nb  = bloque.get("nombre","Bloque")
                dur = bloque.get("duracion","?")
                with st.expander(f"**⏩ {nb}** — {dur} min"):
                    st.write(bloque.get("objetivo",""))
                    if "nota" in bloque:
                        st.info(f"💡 {bloque['nota']}")

        with c_der:
            st.markdown("### 🛡️ Directrices DUA")
            for d in forzar_lista(res.get("dua_neuroinclusion",[])):
                st.markdown(f"- {d}")

            st.markdown("### ♿ Adaptaciones por Diagnóstico")
            adapt = res.get("tabla_adaptaciones_clase",[])
            if adapt:
                st.dataframe(adapt, use_container_width=True, hide_index=True)

            st.markdown("### 👥 Perfil del Aula")
            st.info(res.get("perfil_aula_resumido","—"))

        st.divider()

        if st.button("🎨 Generar Diapositivas y Ficha Gamificada", use_container_width=True, type="primary"):
            pkw = str(st.session_state.palabras_clave_activas) if st.session_state.palabras_clave_activas else tema_final

            with st.spinner("M1b creando diapositivas…"):
                vars_m1b = {
                    "plan_estrategico_json": json.dumps(res, ensure_ascii=False),
                    "diagnosticos":          DIAGNOSTICOS,
                    "PAG_TB":                paginas_temas.get(tema_final,"—"),
                    "PAG_SB":                pags_sb_auto,
                    "palabras_clave":        pkw,
                    "personaje_genero":      personaje_genero,
                    "user_suggestions":      user_sug_m1 or "Ninguna",
                }
                st.session_state.res_m1b = generar_con_gemini("Motor_M1b.txt", vars_m1b, expect_json=True)

            with st.spinner("M1c creando ficha gamificada…"):
                vars_m1c = {
                    "plan_estrategico_json": json.dumps(res, ensure_ascii=False),
                    "diagnosticos":          DIAGNOSTICOS,
                    "conceptos_clave":       str(st.session_state.conceptos_activos),
                    "palabras_clave":        pkw,
                    "user_suggestions":      user_sug_m1 or "Ninguna",
                }
                st.session_state.res_m1c = generar_con_gemini("Motor_M1c.txt", vars_m1c, expect_json=True)

    # ── Render M1b ──────────────────────────────────────────────────────────
    if st.session_state.res_m1b:
        st.divider()
        st.markdown("### 🖼️ Diapositivas")
        raw = st.session_state.res_m1b
        slides = (raw if isinstance(raw,list)
                  else raw.get("diapositivas") or raw.get("slides")
                  or (list(raw.values())[0] if isinstance(raw,dict) else []))
        for i, slide in enumerate(slides):
            if isinstance(slide,dict):
                titulo_s = slide.get("titulo") or slide.get("title") or f"Slide {i+1}"
                with st.expander(f"**Slide {i+1}: {titulo_s}**"):
                    st.markdown(f"**📢 Guion:** {slide.get('guion_docente') or slide.get('guion','')}")
                    st.markdown(f"**🖥️ Pantalla:** {slide.get('texto_pantalla') or slide.get('texto','')}")
                    prompt_img = slide.get("prompt_imagen") or slide.get("prompt","")
                    if prompt_img:
                        st.code(prompt_img, language=None)

    # ── Render M1c ──────────────────────────────────────────────────────────
    if st.session_state.res_m1c:
        st.divider()
        st.markdown("### 🎮 Ficha Gamificada")
        raw   = st.session_state.res_m1c
        ficha = raw.get("ficha_trabajo",raw) if isinstance(raw,dict) else {}

        st.markdown(f"## 🏆 {ficha.get('titulo_gancho','—')}")
        st.write(ficha.get("historia_gancho",""))

        misiones = ficha.get("misiones",{})
        t_or, t_pu, t_so, t_pe, t_li = st.tabs([
            "🔮 Oráculo","🌉 Puente","🥣 Sopa","📜 Pergamino","🎨 Lienzo"
        ])
        with t_or:
            for q in misiones.get("oraculo",[]):
                st.markdown(f"**{q.get('pregunta','')}**")
                for op in q.get("opciones",[]): st.markdown(f"   • {op}")
        with t_pu:
            for par in misiones.get("puente",[]):
                st.markdown(f"**{par.get('palabra','')}** → {par.get('significado','')}")
        with t_so:
            for p in misiones.get("sopa",[]): st.markdown(f"- {p}")
        with t_pe:
            per = misiones.get("pergamino",{})
            st.markdown(f"_{per.get('frase_con_espacios','')}_")
            st.markdown(f"**Palabras secretas:** {', '.join(per.get('palabras_secretas',[]))}")
        with t_li:
            st.markdown(misiones.get("lienzo",""))

        adapt_m = ficha.get("adaptaciones_por_mision",[])
        if adapt_m:
            st.divider()
            st.markdown("**♿ Adaptaciones por Misión:**")
            st.dataframe(adapt_m, use_container_width=True, hide_index=True)


# ═════════════════════════════════════════════════════════════════════════════
# TAB 3 — EVALUACIONES
# ═════════════════════════════════════════════════════════════════════════════
with tab_eval:
    st.markdown("Genera el Pop Quiz DUA y el Panel de Control del Tutor.")

    if not st.session_state.res_m1a:
        st.warning("⚠️ Primero genera un **Plan de Clase** en la pestaña anterior.")

    # FIX: campo vacío por defecto
    user_sug_m2 = st.text_area(
        "💬 Sugerencias del docente:",
        value="",
        placeholder="Indicaciones especiales para la evaluación…",
        height=68, key="sug_m2"
    )

    c_btn1, c_btn2 = st.columns(2)
    with c_btn1:
        if st.button("🎲 Generar Pop Quiz DUA", use_container_width=True):
            if not st.session_state.res_m1a:
                st.error("Genera el Plan de Clase primero.")
            else:
                with st.spinner("Creando Pop Quiz…"):
                    vars_m2a = {
                        "plan_estrategico_json": json.dumps(st.session_state.res_m1a, ensure_ascii=False),
                        "diagnosticos":          DIAGNOSTICOS,
                        "palabras_clave":        str(st.session_state.palabras_clave_activas) or st.session_state.tema_activo,
                        "proyecto_pbl":          st.session_state.res_m0b or "No disponible",
                        "user_suggestions":      user_sug_m2 or "Ninguna",
                    }
                    st.session_state.res_m2a = generar_con_gemini("Motor_M2a.txt", vars_m2a, expect_json=False)

    with c_btn2:
        if st.button("📊 Generar Guía del Tutor", use_container_width=True):
            if not st.session_state.res_m2a:
                st.error("Genera el Pop Quiz primero.")
            else:
                with st.spinner("Creando Guía del Tutor…"):
                    vars_m2b = {
                        "plan_estrategico_json": json.dumps(st.session_state.res_m1a, ensure_ascii=False),
                        "pop_quiz":              st.session_state.res_m2a,
                        "diagnosticos":          DIAGNOSTICOS,
                        "sintesis_unidad":       json.dumps(st.session_state.res_m0a, ensure_ascii=False) if st.session_state.res_m0a else "No disponible",
                        "proyecto_pbl":          st.session_state.res_m0b or "No disponible",
                        "user_suggestions":      user_sug_m2 or "Ninguna",
                    }
                    st.session_state.res_m2b = generar_con_gemini("Motor_M2b.txt", vars_m2b, expect_json=False)

    if st.session_state.res_m2a:
        st.divider()
        st.markdown("### 🎲 Pop Quiz DUA")
        st.markdown(st.session_state.res_m2a)

    if st.session_state.res_m2b:
        st.divider()
        st.markdown("### 📊 Panel de Control del Tutor")
        st.markdown(st.session_state.res_m2b)


# ─────────────────────────────────────────────────────────────────────────────
# BARRA LATERAL
# ─────────────────────────────────────────────────────────────────────────────
with st.sidebar:
    st.image("https://img.icons8.com/fluency/96/owl.png", width=80)
    st.header("👤 Ruddy D. Ribera")
    st.write("**Grado:** 5to Primaria")
    st.write("**Colegio:** Las Palmas")
    st.divider()

    st.markdown("### 📊 Estado del Sistema")
    estado = {
        "Síntesis de Unidad": st.session_state.res_m0a is not None,
        "Proyecto ABP":       st.session_state.res_m0b is not None,
        "Rúbrica/Fichas ABP": st.session_state.res_m0c is not None,
        "Plan de Clase":      st.session_state.res_m1a is not None,
        "Diapositivas":       st.session_state.res_m1b is not None,
        "Ficha Gamificada":   st.session_state.res_m1c is not None,
        "Pop Quiz":           st.session_state.res_m2a is not None,
        "Guía del Tutor":     st.session_state.res_m2b is not None,
    }
    for nombre, listo in estado.items():
        st.markdown(f"{'✅' if listo else '⏳'} {nombre}")

    if st.session_state.tema_activo:
        st.divider()
        st.markdown(f"**Tema activo:** {st.session_state.tema_activo}")
        st.markdown(f"**Lecciones generadas:** {st.session_state.leccion_index}")

    # FIX: mostrar caché de libros disponibles
    cache_files = os.listdir(CACHE_DIR) if os.path.exists(CACHE_DIR) else []
    if cache_files:
        st.divider()
        st.markdown(f"**📦 Libros en caché:** {len(cache_files)}")
        with st.expander("Ver archivos"):
            for cf in cache_files:
                c_col1, c_col2 = st.columns([3,1])
                with c_col1:
                    st.caption(cf.replace(".json",""))
                with c_col2:
                    if st.button("🗑️", key=f"del_{cf}", help=f"Eliminar caché de {cf}"):
                        os.remove(os.path.join(CACHE_DIR, cf))
                        st.rerun()

    st.divider()
    if st.button("🧹 Reiniciar Todo", use_container_width=True):
        st.cache_data.clear()
        for k, v in _defaults.items():
            st.session_state[k] = v
        st.rerun()

# ─────────────────────────────────────────────────────────────────────────────
# SECCIÓN DE EXPORTACIÓN — al final de la página principal
# ─────────────────────────────────────────────────────────────────────────────
st.divider()
with st.expander("📤 Exportar todos los documentos generados", expanded=False):
    render_panel_exportacion(st.session_state, DIAGNOSTICOS)
