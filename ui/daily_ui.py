"""
ui/daily_ui.py - Daily View Zone
================================
Daily schedule view with date/teacher navigation.
"""

import streamlit as st
from datetime import datetime as _dt, timedelta as _td
import pytz

from views.daily_view import render_daily_view


def render_daily_zone(
    get_horario_dia,
    get_eventos_fecha,
    get_actividades_fecha,
    get_logs_dia,
    get_vigilancias,
    get_all_hojas,
    marcar_bloque_diario,
    cerrar_bloque,
    reabrir_bloque,
    get_or_create_sesion_diaria,
    get_micro_objetivos,
    marcar_objetivo,
    minutos_para_fin_clase,
):
    """Render the daily view zone. Call from app_ui.py."""
    DIAS_HOY = {0: "lunes", 1: "martes", 2: "miercoles", 3: "jueves", 4: "viernes"}
    DIAS_LABEL = {
        "lunes": "Lunes",
        "martes": "Martes",
        "miercoles": "Miércoles",
        "jueves": "Jueves",
        "viernes": "Viernes",
    }
    MESES_LABEL = {
        1: "enero",
        2: "febrero",
        3: "marzo",
        4: "abril",
        5: "mayo",
        6: "junio",
        7: "julio",
        8: "agosto",
        9: "septiembre",
        10: "octubre",
        11: "noviembre",
        12: "diciembre",
    }

    # Current time in Bolivia
    bolivia_tz = pytz.timezone("America/La_Paz")
    ahora = _dt.now(bolivia_tz)
    hora_actual = ahora.hour + ahora.minute / 60.0
    hoy_date = ahora.date()

    # Date navigation
    nav_col1, nav_col2, nav_col3 = st.columns([1, 2, 1])
    ss = st.session_state
    with nav_col1:
        if st.button("⬅ Ayer", use_container_width=True, key="btn_ayer"):
            ss.selected_date = (
                hoy_date if "selected_date" not in ss else ss.selected_date
            ) - _td(days=1)
    with nav_col2:
        sel_date = st.date_input(
            "📅 Fecha:",
            value=ss.get("selected_date", hoy_date),
            key="date_picker_diario",
        )
        ss.selected_date = sel_date
    with nav_col3:
        if st.button("Mañana ➡", use_container_width=True, key="btn_manana"):
            ss.selected_date = (
                hoy_date if "selected_date" not in ss else ss.selected_date
            ) + _td(days=1)

    if ss.get("selected_date", hoy_date) != hoy_date:
        if st.button("📍 Volver a Hoy", key="btn_hoy", use_container_width=True):
            ss.selected_date = hoy_date
            st.rerun()

    # Teacher selector
    mi_hoja = ss.get("usuario_hoja", "")
    todas_hojas = get_all_hojas()
    is_admin = ss.get("usuario_rol") == "admin"

    hoja_options = []
    if mi_hoja:
        hoja_options.append(mi_hoja)
    for h in todas_hojas:
        if h != mi_hoja:
            hoja_options.append(h)

    selected_hoja = st.selectbox(
        "👤 Ver horario de:",
        options=hoja_options,
        index=0,
        key="sel_teacher_diario",
        help="Selecciona tu nombre o el de otro docente.",
    )
    is_own_schedule = selected_hoja == mi_hoja
    if not is_own_schedule:
        st.info(f"👁️ Viendo horario de **{selected_hoja}** (solo lectura)")

    # Compute date variables
    hoy = _dt.combine(ss.get("selected_date", hoy_date), ahora.time())
    hoy = bolivia_tz.localize(hoy) if hoy.tzinfo is None else hoy
    dow = hoy.weekday()
    fecha_iso = hoy.strftime("%Y-%m-%d")
    nombre_hoja = selected_hoja
    SCHOOL_START = _dt(2026, 2, 2).date()
    school_delta = max(0, (hoy.date() - SCHOOL_START).days)
    school_week = school_delta // 7 + 1
    dia_escolar = min(66, school_delta * 5 // 7 + 1)
    if dow < 5:
        dia_es = DIAS_HOY[dow]
        dia_label = f"{DIAS_LABEL[dia_es]}, {hoy.day} de {MESES_LABEL[hoy.month]}"
    else:
        dia_es = "lunes"
        dia_label = f"Fin de semana · {hoy.day} de {MESES_LABEL[hoy.month]}"

    # Render daily view
    render_daily_view(
        ss=ss,
        _nombre_hoja=nombre_hoja,
        _fecha_iso=fecha_iso,
        _dia_es=dia_es,
        _dow=dow,
        _hoy=hoy,
        _school_week=school_week,
        _dia_escolar=dia_escolar,
        _dia_label=dia_label,
        _hora_actual=hora_actual,
        _is_own_schedule=is_own_schedule,
        get_horario_dia=get_horario_dia,
        get_eventos_fecha=get_eventos_fecha,
        get_actividades_fecha=get_actividades_fecha,
        get_logs_dia=get_logs_dia,
        get_vigilancias=get_vigilancias,
        marcar_bloque_diario=marcar_bloque_diario,
        cerrar_bloque=cerrar_bloque,
        reabrir_bloque=reabrir_bloque,
        get_or_create_sesion_diaria=get_or_create_sesion_diaria,
        get_micro_objetivos=get_micro_objetivos,
        marcar_objetivo=marcar_objetivo,
        minutos_para_fin_clase=minutos_para_fin_clase,
    )
