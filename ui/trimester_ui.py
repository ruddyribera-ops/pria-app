"""
ui/trimester_ui.py - Trimester Plan Zone
========================================
Trimester tabs: Plan de Unidad + ABP, PDC Trimestral.
"""

import streamlit as st
from datetime import datetime as _dt

from ui.helpers import (
    generar_con_gemini,
    forzar_lista,
    generar_pdc_trimestral,
    _leer_docx_texto,
)
from exportar import generar_html_sintesis, generar_html_abp, generar_html_pdc


def render_trimester_zone(datos_libro, temas_reales, contenido_temas, DIAGNOSTICOS):
    """Render the trimester zone. Call from app_ui.py."""
    ss = st.session_state

    tab_unidad, tab_pdc = st.tabs(["🏗️ Plan de Unidad y ABP", "📋 PDC Trimestral"])

    # ═══════════════════════════════════════════════════════════════
    # TAB: PLAN DE UNIDAD Y ABP
    # ═══════════════════════════════════════════════════════════════
    with tab_unidad:
        st.markdown(
            "Genera la síntesis curricular completa de la unidad y el Proyecto ABP."
        )
        st.info("💡 Trabaja sobre la **unidad completa**.", icon="ℹ️")

        c_cfg1, c_cfg2 = st.columns(2)
        with c_cfg1:
            recursos_aula = st.text_input(
                "🖥️ Recursos disponibles:",
                value="",
                placeholder="Ej: proyector, tablets, materiales de arte…",
            )
            permitir_online = st.radio(
                "🌐 ¿Investigación online en el ABP?",
                ["Sí", "No"],
                horizontal=True,
                key="online_m0",
            )
        with c_cfg2:
            user_sug_m0 = st.text_area(
                "💬 Sugerencias:",
                value="",
                placeholder="Escribe aquí cualquier indicación especial…",
                height=80,
                key="sug_m0",
            )

        if st.button(
            "🛠️ Generar Síntesis Curricular",
            use_container_width=True,
            key="btn_sintesis",
        ):
            with st.spinner("Sintetizando unidad y conceptos clave…"):
                vars_m0a = {
                    "unidad_real": datos_libro.get("unidad_real", ""),
                    "temas": str(temas_reales),
                    "contenido_temas": str(contenido_temas),
                    "diagnosticos": DIAGNOSTICOS or "No especificado",
                }
                resultado = generar_con_gemini(
                    "Motor_M0a.txt", vars_m0a, expect_json=True
                )
                ss.res_m0a = resultado
                ss.res_m0b = None
                ss.res_m0c = None

        if ss.res_m0a and "unidad_sintetizada" in ss.res_m0a:
            unidad = ss.res_m0a["unidad_sintetizada"]
            st.success("✅ ¡Síntesis curricular generada!")
            st.markdown(f"## 📘 {unidad.get('titulo', 'Sin Título')}")
            st.divider()

            c_izq, c_der = st.columns([1.6, 1], gap="large")
            with c_izq:
                st.markdown("### 📑 Temas de la Unidad")
                for tema in unidad.get("temas_desarrollados", []):
                    nombre_t = tema.get("nombre", "Tema")
                    with st.expander(f"**📍 {nombre_t}**", expanded=False):
                        cc, ci = st.columns(2)
                        with cc:
                            st.markdown("**🔑 Conceptos Clave:**")
                            for item in forzar_lista(
                                tema.get("conceptos_clave")
                                or tema.get("conceptos")
                                or []
                            ):
                                st.markdown(f"- {item}")
                        with ci:
                            st.markdown("**🧠 Inteligencias Múltiples:**")
                            for item in forzar_lista(
                                tema.get("inteligencias_sugeridas")
                                or tema.get("inteligencias")
                                or []
                            ):
                                st.markdown(f"- {item}")
                        texto_real = contenido_temas.get(nombre_t, "")
                        if texto_real:
                            st.markdown("**📖 Contenido del libro (extracto):**")
                            st.caption(
                                texto_real[:500]
                                + ("…" if len(texto_real) > 500 else "")
                            )
            with c_der:
                st.markdown("### 👨‍🏫 Notas DUA del Docente")
                st.info(unidad.get("notas_docente", "—"))
                st.markdown("### 🚀 Proyecto ABP *(resumen)*")
                st.success(unidad.get("proyecto_pbl", "⚠️ La IA no generó el proyecto."))

            st.divider()
            if st.button(
                "➡️ Diseñar Proyecto ABP Completo",
                use_container_width=True,
                type="primary",
                key="btn_abp",
            ):
                with st.spinner("M0b diseñando el Proyecto ABP…"):
                    vars_m0b = {
                        "unidad_json": str(unidad),
                        "diagnosticos": DIAGNOSTICOS or "No especificado",
                        "recursos_aula": recursos_aula or "No especificado",
                        "permitir_investigacion_online": permitir_online,
                        "user_suggestions": user_sug_m0 or "Ninguna",
                    }
                    ss.res_m0b = generar_con_gemini(
                        "Motor_M0b.txt", vars_m0b, expect_json=False
                    )
                if ss.res_m0b:
                    with st.spinner("M0c creando rúbricas y fichas…"):
                        vars_m0c = {
                            "proyecto_pbl": ss.res_m0b,
                            "unidad_json": str(unidad),
                            "diagnosticos": DIAGNOSTICOS or "No especificado",
                            "user_suggestions": user_sug_m0 or "Ninguna",
                        }
                        ss.res_m0c = generar_con_gemini(
                            "Motor_M0c.txt", vars_m0c, expect_json=False
                        )

        if ss.res_m0a and "unidad_sintetizada" in ss.res_m0a:
            st.divider()
            st.download_button(
                "⬇️ Descargar Síntesis Curricular (.html)",
                data=generar_html_sintesis(ss.res_m0a, DIAGNOSTICOS),
                file_name=f"LasP_Sintesis_{_dt.now().strftime('%Y%m%d')}.html",
                mime="text/html",
                use_container_width=True,
            )
        if ss.res_m0b:
            st.divider()
            st.markdown("### 📋 Proyecto ABP Detallado")
            st.markdown(ss.res_m0b)
        if ss.res_m0c:
            st.divider()
            st.markdown("### 📊 Rúbrica y Fichas de Proceso")
            st.markdown(ss.res_m0c)
        if ss.res_m0b:
            st.divider()
            u_titulo = (
                ss.res_m0a["unidad_sintetizada"].get("titulo", "Unidad")
                if ss.res_m0a
                else "Unidad"
            )
            st.download_button(
                "⬇️ Descargar Proyecto ABP (.html)",
                data=generar_html_abp(ss.res_m0b, ss.res_m0c or "", u_titulo),
                file_name=f"LasP_ABP_{_dt.now().strftime('%Y%m%d')}.html",
                mime="text/html",
                use_container_width=True,
            )

    # ═══════════════════════════════════════════════════════════════
    # TAB: PDC TRIMESTRAL
    # ═══════════════════════════════════════════════════════════════
    with tab_pdc:
        st.markdown(
            "Genera un **PDC Trimestral completo** adaptado a tu materia y calendario."
        )
        col_pdc1, col_pdc2 = st.columns(2)
        with col_pdc1:
            st.markdown("#### 👤 Contexto Docente")
            pdc_teacher = st.text_input(
                "Nombre del docente",
                value=ss.get("pdc_teacher", ss.get("teacher_name", "")),
                placeholder="Ej. Ruddy Ribera",
                key="pdc_teacher",
            )
            pdc_level = st.selectbox(
                "Nivel",
                ["Primaria (5to)", "Primaria (4to)", "Secundaria"],
                key="pdc_level",
            )
            pdc_subject = st.selectbox(
                "Materia",
                [
                    "Lenguaje",
                    "Matemáticas",
                    "Ciencias Naturales",
                    "Ciencias Sociales",
                    "Inglés",
                    "Educación Física",
                    "Música",
                    "Arte",
                ],
                key="pdc_subject",
            )
            pdc_semanas = st.number_input(
                "Semanas hábiles del trimestre",
                min_value=6,
                max_value=20,
                value=12,
                key="pdc_semanas",
            )
        with col_pdc2:
            st.markdown("#### 📂 Archivos Base")
            pdc_file = st.file_uploader(
                "PDC Base (.docx)",
                type=["docx"],
                key="pdc_file_upload",
                help="Tu PDC actual que será tomado como referencia.",
            )
            pdc_libros = st.file_uploader(
                "Libros de texto (PDF, opcional)",
                type=["pdf"],
                accept_multiple_files=True,
                key="pdc_libros_upload",
            )

        st.divider()
        if st.button(
            "⚡ Generar PDC Trimestral",
            type="primary",
            use_container_width=True,
            disabled=not pdc_teacher,
            key="btn_pdc",
        ):
            if not pdc_file:
                st.warning("⚠️ Sube tu PDC base (.docx) para continuar.")
            else:
                with st.spinner("Gemini está construyendo tu PDC trimestral…"):
                    pdc_texto = _leer_docx_texto(pdc_file.read())
                    resultado_pdc = generar_pdc_trimestral(
                        teacher_name=pdc_teacher,
                        level=pdc_level,
                        subject=pdc_subject,
                        pdc_texto=pdc_texto,
                        semanas_calendario=int(pdc_semanas),
                    )
                    if resultado_pdc:
                        ss["pdc_resultado"] = resultado_pdc
                        st.success("✅ PDC generado correctamente.")

        if ss.get("pdc_resultado"):
            resultado = ss["pdc_resultado"]
            st.divider()
            st.markdown("### 📄 PDC Generado")
            st.markdown(resultado)
            st.divider()
            st.download_button(
                "⬇️ Descargar PDC (.html)",
                data=generar_html_pdc(resultado, pdc_teacher, pdc_subject, pdc_level),
                file_name=f"PDC_{pdc_subject.replace(' ', '_')}_{pdc_teacher.replace(' ', '_')}.html",
                mime="text/html",
                use_container_width=True,
                key="pdc_download_btn",
            )
