"""
app_ui.py - PRIA Main Application
==================================
Thin router that imports UI modules from ui/ package.

Modules:
- ui.helpers   : CSS, session state, helpers, PDF/Gemini processing
- ui.auth_ui    : Login UI
- ui.sidebar    : Sidebar content
- ui.admin_ui   : Admin panel
- ui.daily_ui   : Daily view
- ui.weekly_ui  : Weekly plan tabs
- ui.trimester_ui: Trimester plan tabs
"""

import os
import streamlit as st
import sentry_sdk
from sentry_sdk.integrations.logging import LoggingIntegration

# ── Sentry error monitoring ────────────────────────────────────────────────────
_SENTRY_DSN = os.environ.get("SENTRY_DSN", "")
if _SENTRY_DSN:
    sentry_sdk.init(
        dsn=_SENTRY_DSN,
        traces_sample_rate=0.1,  # 10% of transactions for perf monitoring
        profiles_sample_rate=0.0,  # disable profiling (reduces overhead)
        environment=os.environ.get("RAILWAY_ENVIRONMENT", "development"),
        release=f"pria@5.4",
        integrations=[LoggingIntegration(level=None, event_level="ERROR")],
        send_default_pii=False,  # don't send user email/passwords to Sentry
    )

# PRIA Core - import directly from pria_docs (not through pria/ wrapper)
from pria_docs.config import config, Constants as C
from pria_docs.errors import error_handled, log_user_action, handle_error, PRIAError
from pria_docs.auth import (
    Role,
    get_current_user,
    is_admin,
    is_teacher,
    check_permission,
)

# Database functions
from db_pria import (
    init_db,
    crear_sesion,
    get_sesiones,
    get_sesion,
    guardar_micro_objetivos,
    get_micro_objetivos,
    marcar_objetivo,
    marcar_multiples,
    get_deuda_academica,
    get_dependencias_bloqueadas,
    get_resumen_deuda,
    guardar_plan_buffer,
    get_planes_buffer,
    minutos_para_fin_clase,
    crear_usuario,
    verificar_login,
    get_all_usuarios,
    actualizar_password,
    toggle_usuario_activo,
    eliminar_usuario,
    get_usuario_by_email,
    guardar_horario_docente,
    get_horario_dia,
    get_all_hojas,
    guardar_eventos_calendario,
    get_eventos_fecha,
    get_eventos_rango,
    guardar_actividades_cronograma,
    get_actividades_fecha,
    guardar_comisiones,
    get_comisiones_docente,
    get_all_comisiones,
    marcar_bloque_diario,
    cerrar_bloque,
    get_logs_dia,
    get_or_create_sesion_diaria,
    get_objetivos_semana_materia,
    reset_dia_docente,
    reabrir_bloque,
    guardar_vigilancias,
    get_vigilancias,
)

# UI Modules
from ui.helpers import CSS, init_session_state, forzar_lista
from ui.cache import cleanup_old_sessions, cleanup_old_cache
from ui.auth_ui import render_login
from ui.sidebar import render_sidebar
from ui.admin_ui import render_admin_panel
from ui.daily_ui import render_daily_zone
from ui.weekly_ui import render_weekly_zone
from ui.trimester_ui import render_trimester_zone

# Export functions
from exportar import (
    render_panel_exportacion,
    generar_html_plan_clase,
    generar_html_sintesis,
    generar_html_abp,
    generar_html_evaluaciones,
    generar_html_ficha,
    generar_html_pdc,
)


# ═══════════════════════════════════════════════════════════════════════════════
# PAGE CONFIG
# ═══════════════════════════════════════════════════════════════════════════════
st.set_page_config(
    page_title=f"PRIA v{config.app_version} — Método Palma-Ribera",
    layout="wide",
    page_icon="🦉",
)

# Apply CSS
st.markdown(CSS, unsafe_allow_html=True)


# ═══════════════════════════════════════════════════════════════════════════════
# INIT
# ═══════════════════════════════════════════════════════════════════════════════
# Run cache cleanup once at startup (not at import time)
cleanup_old_sessions()
cleanup_old_cache()

init_db()
init_session_state()


# ═══════════════════════════════════════════════════════════════════════════════
# AUTH
# ═══════════════════════════════════════════════════════════════════════════════
render_login()


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN APP
# ═══════════════════════════════════════════════════════════════════════════════
st.title("🦉 PRIA — Planificación Neuro-Inclusiva")
st.caption("Método Palma-Ribera · DUA · Inteligencias Múltiples · Motor Gemini")

# Render sidebar and get derived data
datos_libro, datos_sb, DIAGNOSTICOS = render_sidebar()

# Derived data
temas_reales = forzar_lista(datos_libro.get("temas", []))
contenido_temas = datos_libro.get("contenido_temas", {})
paginas_temas = datos_libro.get("paginas_temas", {})
usar_sb = st.session_state.get("radio_sb", "No")


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN PANEL (only for admin role)
# ═══════════════════════════════════════════════════════════════════════════════
if st.session_state.get("usuario_rol") == "admin":
    with st.expander("⚙️ Panel de Administración", expanded=False):
        render_admin_panel()


# ═══════════════════════════════════════════════════════════════════════════════
# ZONE SELECTOR
# ═══════════════════════════════════════════════════════════════════════════════
zona_opciones = ["🌅  Diario", "📅  Semanal", "📆  Trimestral"]
zona = st.radio(
    "Zona de trabajo:",
    zona_opciones,
    horizontal=True,
    key="zona_temporal",
    label_visibility="collapsed",
)
st.markdown("---")


# ═══════════════════════════════════════════════════════════════════════════════
# ZONE: DAILY
# ═══════════════════════════════════════════════════════════════════════════════
if zona == "🌅  Diario":
    render_daily_zone(
        get_horario_dia=get_horario_dia,
        get_eventos_fecha=get_eventos_fecha,
        get_actividades_fecha=get_actividades_fecha,
        get_logs_dia=get_logs_dia,
        get_vigilancias=get_vigilancias,
        get_all_hojas=get_all_hojas,
        marcar_bloque_diario=marcar_bloque_diario,
        cerrar_bloque=cerrar_bloque,
        reabrir_bloque=reabrir_bloque,
        get_or_create_sesion_diaria=get_or_create_sesion_diaria,
        get_micro_objetivos=get_micro_objetivos,
        marcar_objetivo=marcar_objetivo,
        minutos_para_fin_clase=minutos_para_fin_clase,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ZONE: WEEKLY
# ═══════════════════════════════════════════════════════════════════════════════
elif zona == "📅  Semanal":
    render_weekly_zone(
        temas_reales=temas_reales,
        contenido_temas=contenido_temas,
        paginas_temas=paginas_temas,
        datos_sb=datos_sb,
        usar_sb=usar_sb,
        DIAGNOSTICOS=DIAGNOSTICOS,
    )


# ═══════════════════════════════════════════════════════════════════════════════
# ZONE: TRIMESTER
# ═══════════════════════════════════════════════════════════════════════════════
elif zona == "📆  Trimestral":
    render_trimester_zone(
        datos_libro=datos_libro,
        temas_reales=temas_reales,
        contenido_temas=contenido_temas,
        DIAGNOSTICOS=DIAGNOSTICOS,
    )
