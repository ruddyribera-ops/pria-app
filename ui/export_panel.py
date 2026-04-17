"""
ui/export_panel.py - Export Panel UI
====================================
Streamlit UI for the export panel. This is the UI layer that wraps
the pure export functions from exporters/.
"""

from datetime import datetime


def render_panel_exportacion(ss, diagnosticos: str):
    """Render the export panel UI.

    Args:
        ss: Streamlit session_state object
        diagnosticos: Diagnostic information string
    """
    import streamlit as st

    try:
        from slide_generator import (
            generar_pptx_con_claude,
            node_disponible,
            instalar_pptxgenjs,
        )
    except ImportError as _e:
        # Graceful fallback — premium engine unavailable
        def node_disponible():
            return False

        def instalar_pptxgenjs():
            return str(_e)

        generar_pptx_con_claude = None

    # Import export functions
    from exporters.pptx import generar_pptx_diapositivas
    from exporters.html import (
        generar_html_sintesis,
        generar_html_abp,
        generar_html_plan_clase,
        generar_html_ficha,
        generar_html_evaluaciones,
        WORKSHEET_THEMES,
    )

    unidad_titulo = ""
    if ss.res_m0a and "unidad_sintetizada" in ss.res_m0a:
        unidad_titulo = ss.res_m0a["unidad_sintetizada"].get("titulo", "Unidad")
    tema_activo = ss.get("tema_activo", "tema")
    fecha_str = datetime.now().strftime("%Y%m%d")
    HTML = "text/html"
    PPTX = "application/vnd.openxmlformats-officedocument.presentationml.presentation"

    anthropic_key = st.secrets.get("ANTHROPIC_API_KEY", "")
    node_ok = node_disponible()

    st.markdown("### 📤 Exportar — Plantilla Las Palmas School")
    st.caption(
        "Logo oficial. Listo para imprimir. Solo se habilitan los materiales ya generados."
    )

    if not node_ok or not anthropic_key:
        with st.expander("⚙️ Configuración del Motor de Diapositivas", expanded=False):
            if not anthropic_key:
                st.warning("⚠️ Falta `ANTHROPIC_API_KEY` en `secrets.toml`.")
            if not node_ok:
                st.warning("⚠️ Node.js o pptxgenjs no encontrado.")
                if st.button("📦 Instalar pptxgenjs ahora"):
                    with st.spinner("Instalando…"):
                        st.info(instalar_pptxgenjs())
                else:
                    st.caption("Ejecuta: `npm install -g pptxgenjs`")
            st.info(
                "Diapositivas en modo básico (python-pptx) hasta configurar el motor premium."
            )

    st.markdown("#### 🏗️ Plan de Unidad y ABP")
    c1, c2, _ = st.columns(3)
    with c1:
        if ss.res_m0a:
            st.download_button(
                "📄 Síntesis Curricular (.html)",
                data=generar_html_sintesis(ss.res_m0a, diagnosticos),
                file_name=f"LasP_Sintesis_{fecha_str}.html",
                mime=HTML,
                use_container_width=True,
            )
        else:
            st.button(
                "📄 Síntesis Curricular (.html)",
                disabled=True,
                use_container_width=True,
                help="Genera la Síntesis primero.",
            )
    with c2:
        if ss.res_m0b:
            st.download_button(
                "📋 Proyecto ABP (.html)",
                data=generar_html_abp(ss.res_m0b, ss.res_m0c or "", unidad_titulo),
                file_name=f"LasP_ABP_{fecha_str}.html",
                mime=HTML,
                use_container_width=True,
            )
        else:
            st.button(
                "📋 Proyecto ABP (.html)",
                disabled=True,
                use_container_width=True,
                help="Diseña el Proyecto ABP primero.",
            )

    # ── Selector de estilo de plantilla HTML ────────────────────────────────
    with st.expander(
        "🎨 Estilo de plantilla (fichas y evaluaciones HTML)", expanded=False
    ):
        _theme_options = list(WORKSHEET_THEMES.keys())
        _theme_labels = [WORKSHEET_THEMES[k]["label"] for k in _theme_options]
        _theme_idx = st.radio(
            "Elige el estilo visual:",
            options=range(len(_theme_options)),
            format_func=lambda i: _theme_labels[i],
            key="export_theme_idx",
            horizontal=False,
        )
        html_theme = _theme_options[_theme_idx]
        st.caption(f"Vista previa activa: **{_theme_labels[_theme_idx]}**")

    st.markdown("#### 🚀 Plan de Clase y Fichas")
    c4, c5, c6 = st.columns(3)
    with c4:
        if ss.res_m1a:
            st.download_button(
                "📄 Plan de Clase (.html)",
                data=generar_html_plan_clase(ss.res_m1a, tema_activo, diagnosticos),
                file_name=f"LasP_PlanClase_{fecha_str}.html",
                mime=HTML,
                use_container_width=True,
            )
        else:
            st.button(
                "📄 Plan de Clase (.html)",
                disabled=True,
                use_container_width=True,
                help="Genera el Plan de Clase primero.",
            )
    with c5:
        if ss.res_m1b:
            if node_ok and anthropic_key:
                if st.button(
                    "✨ Generar Diapositivas (.pptx)",
                    use_container_width=True,
                    type="primary",
                ):
                    with st.spinner(
                        "🎨 Claude diseñando las diapositivas… (30–60 seg)"
                    ):
                        try:
                            slides = (
                                ss.res_m1b
                                if isinstance(ss.res_m1b, list)
                                else ss.res_m1b.get("diapositivas")
                                or ss.res_m1b.get("slides")
                                or list(ss.res_m1b.values())[0]
                            )
                            pptx_bytes = generar_pptx_con_claude(
                                slides_data=slides,
                                tema=tema_activo,
                                unidad=unidad_titulo,
                                anthropic_api_key=anthropic_key,
                            )
                            st.session_state["pptx_cache"] = pptx_bytes
                            st.success("✅ ¡Diapositivas generadas!")
                        except Exception as e:
                            st.error(f"❌ {str(e)[:400]}")
                if st.session_state.get("pptx_cache"):
                    st.download_button(
                        "⬇️ Descargar Diapositivas (.pptx)",
                        data=st.session_state["pptx_cache"],
                        file_name=f"LasP_Slides_{fecha_str}.pptx",
                        mime=PPTX,
                        use_container_width=True,
                    )
            else:
                st.download_button(
                    "🖼️ Diapositivas (.pptx) — modo básico",
                    data=generar_pptx_diapositivas(
                        ss.res_m1b, tema_activo, unidad_titulo
                    ),
                    file_name=f"LasP_Slides_{fecha_str}.pptx",
                    mime=PPTX,
                    use_container_width=True,
                )
        else:
            st.button(
                "🖼️ Diapositivas (.pptx)",
                disabled=True,
                use_container_width=True,
                help="Genera las Diapositivas primero.",
            )
    with c6:
        if ss.res_m1c:
            st.download_button(
                "🎮 Ficha Gamificada (.html)",
                data=generar_html_ficha(
                    ss.res_m1c, tema_activo, theme=html_theme
                ).encode("utf-8"),
                file_name=f"LasP_Ficha_{fecha_str}.html",
                mime=HTML,
                use_container_width=True,
            )
        else:
            st.button(
                "🎮 Ficha Gamificada (.html)",
                disabled=True,
                use_container_width=True,
                help="Genera la Ficha primero.",
            )

    st.markdown("#### 📝 Evaluaciones")
    c7, _, __ = st.columns(3)
    with c7:
        if ss.res_m2a:
            st.download_button(
                "📝 Pop Quiz + Guía Tutor (.html)",
                data=generar_html_evaluaciones(
                    ss.res_m2a, ss.res_m2b or "", tema_activo, theme=html_theme
                ).encode("utf-8"),
                file_name=f"LasP_Evaluaciones_{fecha_str}.html",
                mime=HTML,
                use_container_width=True,
            )
        else:
            st.button(
                "📝 Pop Quiz + Guía Tutor (.html)",
                disabled=True,
                use_container_width=True,
                help="Genera el Pop Quiz primero.",
            )
