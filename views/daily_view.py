"""
Daily View - Mi Día Tab
========================
Renders the daily dashboard with:
- Today's schedule blocks
- Vigilancia/recreo duties
- Academic debt tracking
- Commission duties
"""

import streamlit as st
from datetime import datetime as _dt
import pytz
from datetime import timedelta as _td


def render_daily_view(
    ss,  # session_state
    _nombre_hoja: str,
    _fecha_iso: str,
    _dia_es: str,
    _dow: int,
    _hoy: _dt,
    _school_week: int,
    _dia_escolar: int,
    _dia_label: str,
    get_horario_dia,
    get_eventos_fecha,
    get_actividades_fecha,
    get_logs_dia,
    get_vigilancias,
    marcar_bloque_diario,
    cerrar_bloque,
    reabrir_bloque,
    get_or_create_sesion_diaria,
    get_micro_objetivos,
    marcar_objetivo,
    minutos_para_fin_clase,
):
    """
    Render the Daily View (Mi Día tab).

    This view shows:
    - Header with date/school week info
    - Schedule blocks for the day
    - Vigilancia (recreo duty) blocks
    - Events from cronograma
    """

    # Constants for this view
    _DIAS_HOY = {0: "lunes", 1: "martes", 2: "miercoles", 3: "jueves", 4: "viernes"}
    _DIAS_LABEL = {
        "lunes": "Lunes",
        "martes": "Martes",
        "miercoles": "Miércoles",
        "jueves": "Jueves",
        "viernes": "Viernes",
    }
    _MESES_LABEL = {
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
    _BLOQUE_ICONO = {
        "ingreso": "🏫",
        "clase": "📚",
        "vigilancia_recreo": "👁️",
        "atencion_ppff": "👨‍👩‍👧",
        "planificacion": "📋",
        "recreo_libre": "☕",
    }
    _BLOQUE_COLOR = {
        "ingreso": "#607D8B",
        "clase": "#1B5E20",
        "vigilancia_recreo": "#E65100",
        "atencion_ppff": "#1A237E",
        "planificacion": "#00695C",
        "recreo_libre": "#9E9E9E",
    }
    _EVENTO_ICONO = {
        "feriado": "🚫",
        "acto_civico": "🎌",
        "institucional": "📣",
        "curricular": "📖",
    }

    # ═══════════════════════════════════════════════════════════════════════════
    # LOAD DATA
    # ═══════════════════════════════════════════════════════════════════════════
    bolivia_tz = pytz.timezone("America/La_Paz")
    _hoy_local = _dt.now(bolivia_tz)
    _hora_actual = _hoy_local.hour + _hoy_local.minute / 60.0
    _is_primary = (
        "primaria" in str(ss.get("nivel_grado", "")).lower()
        or "primaria" in str(ss.get("nivel", "")).lower()
    )
    if (_is_primary and _hora_actual >= 13.0) or (
        not _is_primary and _hora_actual >= 13.66
    ):
        _hoy_local += _td(days=1)
        if _hoy_local.weekday() >= 5:
            _hoy_local += _td(days=(7 - _hoy_local.weekday()))

    _bloques_horario = get_horario_dia(_nombre_hoja, _dia_es) if _nombre_hoja else []
    _eventos_cal = get_eventos_fecha(_fecha_iso)
    _actividades_crono = get_actividades_fecha(_fecha_iso, _nombre_hoja)
    _logs_dia = get_logs_dia(_fecha_iso, _nombre_hoja) if _nombre_hoja else {}
    _vigilancias = get_vigilancias()

    # Build header progress from already-loaded data
    _pre_cerrados = sum(
        1
        for _bh in _bloques_horario
        if _logs_dia.get(
            f"{_bh['dia_semana']}|{_bh['hora_inicio']}|{_bh['tipo_bloque']}", {}
        ).get("cerrado", 0)
    )
    _pre_total = len(_bloques_horario)
    _pre_pct = int(_pre_cerrados / _pre_total * 100) if _pre_total else 0

    # Render header
    _hdr_left, _hdr_right = st.columns([5, 1])
    with _hdr_left:
        st.markdown(
            f"""<div class="aid-day-header">
              <div class="aid-day-header__left">
                <div class="aid-day-header__title">Tu Ruta del Día</div>
                <div class="aid-day-header__sub">{_dia_label}</div>
              </div>
              <div class="aid-day-header__right">
                <div class="aid-day-header__meta">
                  <div class="aid-day-header__cycle">Semana {_school_week}</div>
                  <div class="aid-day-header__daycount">Día {_dia_escolar} / 66</div>
                </div>
                <div class="aid-day-header__pct">{_pre_pct}%</div>
              </div>
            </div>""",
            unsafe_allow_html=True,
        )

    # Weekend message
    if _dow >= 5:
        st.info("Hoy no hay clases. Aquí verás el próximo lunes cuando sea día hábil.")
        return

    # Feriado alert
    _feriados = [e for e in _eventos_cal if e["tipo"] == "feriado"]
    if _feriados:
        st.error(f"🚫 **FERIADO:** {_feriados[0]['nombre_evento']}", icon="🚫")

    # Non-feriado events
    _eventos_no_feriado = [
        e for e in _eventos_cal if e["tipo"] != "feriado" and e["tipo"] != "curricular"
    ]
    if _eventos_no_feriado:
        with st.expander(
            f"📣 {len(_eventos_no_feriado)} evento(s) institucional(es)", expanded=False
        ):
            for _evt in _eventos_no_feriado:
                st.markdown(
                    f"- {_EVENTO_ICONO.get(_evt['tipo'], '📌')} **{_evt['nombre_evento']}**"
                )

    # Cronograma activities
    if _actividades_crono:
        with st.expander(
            f"📋 {len(_actividades_crono)} actividad(es) del cronograma", expanded=False
        ):
            for _act in _actividades_crono:
                _h = (
                    f"{_act.get('hora_inicio', '')}–{_act.get('hora_fin', '')}"
                    if _act.get("hora_inicio")
                    else ""
                )
                st.markdown(
                    f"- **{_h}** {_act['actividad']} _{_act.get('a_cargo_de', '')}_"
                )

    # No schedule loaded message
    if not _bloques_horario and not _nombre_hoja:
        st.warning(
            "Tu horario aún no ha sido cargado por el administrador. Consulta a Ruddy."
        )
        return
    elif not _bloques_horario:
        st.info(f"No hay bloques de horario para {_DIAS_LABEL.get(_dia_es, 'hoy')}.")
        return

    # ── Progress bar ─────────────────────────────────────────────────────────────
    _total_bloques = len(_bloques_horario)
    _bloques_cerrados = sum(
        1
        for _b in _bloques_horario
        if _logs_dia.get(
            f"{_b['dia_semana']}|{_b['hora_inicio']}|{_b['tipo_bloque']}", {}
        ).get("cerrado", 0)
    )
    _bloques_completados = sum(
        1
        for _b in _bloques_horario
        if _logs_dia.get(
            f"{_b['dia_semana']}|{_b['hora_inicio']}|{_b['tipo_bloque']}", {}
        ).get("completado", 0)
    )
    _pct = int(_bloques_cerrados / _total_bloques * 100) if _total_bloques else 0
    _progreso_txt = f"**{_bloques_cerrados} cerrados · {_bloques_completados} marcados · {_total_bloques} total — {_pct}% del día cerrado**"
    st.progress(_pct / 100, text=_progreso_txt)
    st.divider()

    # ── Render each block ─────────────────────────────────────────────────────────
    _now_hhmm = _hoy.strftime("%H:%M")

    for _b in _bloques_horario:
        _tipo = _b["tipo_bloque"]
        _hora_ini = _b["hora_inicio"]
        _hora_fin = _b.get("hora_fin", "")
        _hora = f"{_hora_ini} – {_hora_fin}"
        _color = _BLOQUE_COLOR.get(_tipo, "#333")
        _icono = _BLOQUE_ICONO.get(_tipo, "📌")
        _bkey = f"{_b['dia_semana']}|{_hora_ini}|{_tipo}"
        _log = _logs_dia.get(_bkey, {})
        _done = bool(_log.get("completado", 0))
        _cerrado = bool(_log.get("cerrado", 0))
        _notas_log = _log.get("notas", "")

        # Time-based state
        _hora_ini_float = float(_hora_ini.replace(":", ".")) if _hora_ini else 0
        _hora_fin_float = float(_hora_fin.replace(":", ".")) if _hora_fin else 99
        _is_active = _hora_ini_float <= _hora_actual < _hora_fin_float
        _is_past = _hora_fin_float <= _hora_actual

        # ── Build label based on type ─────────────────────────────────────────
        if _tipo == "clase":
            _nivel = f" — {_b['nivel_grado']}" if _b.get("nivel_grado") else ""
            _label = f"{(_b.get('materia') or '').title()}{_nivel}"
        elif _tipo == "vigilancia_recreo":
            _zona = None
            _nh_upp = _nombre_hoja.upper()
            _dia_actual = _DIAS_HOY.get(_dow, "")

            # Determine which recreo this block belongs to
            # RECREO 1 = morning (before 11:00), RECREO 2 = afternoon (after 11:00)
            _hora_num = float(_hora_ini.replace(":", ".")) if _hora_ini else 0
            _recreo_num = "1" if _hora_num < 11.0 else "2"

            for k_name, v_zona in _vigilancias.items():
                if k_name in _nh_upp or _nh_upp in k_name:
                    zonas = v_zona.split(", ")
                    for zona_item in zonas:
                        zona_upper = zona_item.upper()
                        # Match: current day AND correct recreo number
                        if (
                            _dia_actual.upper() in zona_upper
                            and f"RECREO {_recreo_num}" in zona_upper
                        ):
                            _zona = zona_item.strip()
                            break
                    # If no specific recreo match, try just the day
                    if not _zona:
                        for zona_item in zonas:
                            if _dia_actual.upper() in zona_item.upper():
                                _zona = zona_item.strip()
                                break
                    if not _zona:
                        _zona = zonas[0].strip() if zonas else None
                    break

            if not _zona:
                _zona = _b.get("ubicacion") or "Sin ubicación asignada"

            _label = f"Guardia de Recreo · 📍 {_zona}"
        else:
            _label = {
                "ingreso": "Horario de Ingreso",
                "atencion_ppff": "Atención a Padres de Familia",
                "planificacion": "Planificación / API",
                "recreo_libre": "Recreo",
            }.get(_tipo, (_b.get("valor_original") or _tipo.replace("_", " ").title()))

        # ── CLOSED STATE ───────────────────────────────────────────────────────
        if _cerrado:
            _rc1, _rc2, _rc3 = st.columns([1.8, 5.5, 2.2], gap="small")
            with _rc1:
                st.markdown(
                    f"<span class='aid-time' style='color:#3E4252'>{_hora}</span>",
                    unsafe_allow_html=True,
                )
            with _rc2:
                _note_suffix = f" · {_notas_log}" if _notas_log else ""
                st.markdown(
                    f"<span style='color:#3E4252;text-decoration:line-through'>{_icono} {_label}</span>"
                    f"<span style='color:#2E313C;font-size:0.72rem'>{_note_suffix}</span>",
                    unsafe_allow_html=True,
                )
            with _rc3:
                st.markdown(
                    "<span class='aid-badge aid-badge--closed'>✓ Cerrado</span>",
                    unsafe_allow_html=True,
                )
                if st.button(
                    "Reabrir",
                    key=f"reab_{_fecha_iso}_{_bkey.replace('|', '_')}",
                    use_container_width=True,
                ):
                    reabrir_bloque(_fecha_iso, _nombre_hoja, _b)
                    st.rerun()
            st.markdown(
                "<div style='height:1px;background:#1A1D23;margin:1px 0'></div>",
                unsafe_allow_html=True,
            )
            continue

        # ── ACTIVE STATE ────────────────────────────────────────────────────────
        _badge_html = ""
        if _is_active:
            _badge_html = '<span class="aid-badge aid-badge--active">● EN CURSO</span>'
        elif _is_past and not _done:
            _badge_html = (
                '<span class="aid-badge aid-badge--pending">⚠ PENDIENTE</span>'
            )

        # ── Block content ─────────────────────────────────────────────────────
        with st.container():
            st.markdown(
                f"""<div class="aid-block aid-block--{"active" if _is_active else "pending" if _is_past and not _done else "future"}"
                     style="border-left: 4px solid {_color}">""",
                unsafe_allow_html=True,
            )

            _bc1, _bc2 = st.columns([1.8, 5.5], gap="small")
            with _bc1:
                st.markdown(f"**{_hora}**")
                st.markdown(_badge_html, unsafe_allow_html=True)
            with _bc2:
                st.markdown(f"### {_icono} {_label}")

                # Checkbox for completion
                _new_done = st.checkbox(
                    "Completado" if _done else "Marcar como hecho",
                    value=_done,
                    key=f"chk_{_fecha_iso}_{_bkey.replace('|', '_')}",
                )
                if _new_done != _done:
                    marcar_bloque_diario(_fecha_iso, _nombre_hoja, _b, _new_done)
                    st.rerun()

                # Close button
                if _tipo == "clase" and st.button(
                    "🔒 Cerrar bloque",
                    key=f"cls_{_fecha_iso}_{_bkey.replace('|', '_')}",
                ):
                    cerrar_bloque(_fecha_iso, _nombre_hoja, _b)
                    st.rerun()

            st.markdown("</div>", unsafe_allow_html=True)
            st.markdown(
                "<div style='height:2px;background:#252830;margin:4px 0'></div>",
                unsafe_allow_html=True,
            )

    # ── End of day ───────────────────────────────────────────────────────────────
    st.success("🎉 Has llegado al final de tu día. ¡Buen trabajo!")
