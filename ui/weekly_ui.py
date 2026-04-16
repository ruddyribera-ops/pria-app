"""
ui/weekly_ui.py - Weekly Plan Zone
=================================
Weekly tabs: Plan de Clase, Diapositivas, Ficha, Pop Quiz, Exportar.
"""

import streamlit as st
from datetime import datetime as _dt

from ui.helpers import generar_con_gemini, forzar_lista, helpers as h
from exportar import (
    render_panel_exportacion,
    generar_html_plan_clase,
    generar_html_ficha,
    generar_html_evaluaciones,
)


def render_weekly_zone(
    temas_reales, contenido_temas, paginas_temas, datos_sb, usar_sb, DIAGNOSTICOS
):
    """Render the weekly plan zone. Call from app_ui.py."""
    ss = st.session_state

    tab_clase, tab_diap, tab_ficha, tab_quiz, tab_export = st.tabs(
        ["Plan de Clase", "Diapositivas", "Ficha", "Pop Quiz", "Exportar"]
    )

    # ═══════════════════════════════════════════════════════════════
    # TAB: PLAN DE CLASE
    # ═══════════════════════════════════════════════════════════════
    with tab_clase:
        st.markdown("Crea el plan de clase de 45 min.")
        with st.container(border=True):
            st.markdown("#### 🎯 Configuración de la Lección")
            tema_opts = (
                temas_reales
                if temas_reales
                else ["(carga el libro en el panel lateral)"]
            )
            tema_final = st.selectbox("📍 Tema:", tema_opts, key="sel_tema_m1")

            tema_hash_nuevo = h.topic_hash(tema_final)
            if tema_hash_nuevo != ss.tema_hash:
                ss.res_m1a_prev = ss.res_m1a
                ss.res_m1a = None
                ss.res_m1b = None
                ss.res_m1c = None
                ss.tema_hash = tema_hash_nuevo
                ss.tema_activo = tema_final
                ss.mostrar_adaptaciones_prev = False

            pags_tb_auto = paginas_temas.get(tema_final, "—")
            pags_sb_temas = datos_sb.get("paginas_temas", {}) if datos_sb else {}
            pags_sb_auto = (
                pags_sb_temas.get(tema_final, "—") if usar_sb == "Sí" else "N/A"
            )

            c_pags1, c_pags2 = st.columns(2)
            with c_pags1:
                st.markdown("**📄 Páginas TextBook:**")
                st.markdown(
                    f"<div style='background:rgba(200,230,201,0.35);border:2px dashed #4CAF50;"
                    f"border-radius:6px;padding:8px 14px;color:#1B5E20;font-weight:800;'>📖 {pags_tb_auto}</div>",
                    unsafe_allow_html=True,
                )
            with c_pags2:
                st.markdown("**📄 Páginas Student Book:**")
                st.markdown(
                    f"<div style='background:rgba(200,230,201,0.35);border:2px dashed #4CAF50;"
                    f"border-radius:6px;padding:8px 14px;color:#1B5E20;font-weight:800;'>📖 {pags_sb_auto}</div>",
                    unsafe_allow_html=True,
                )

            c_m1a, c_m1b_col = st.columns(2)
            with c_m1a:
                objetivo_gen = st.text_input(
                    "🎯 Objetivo General (opcional):",
                    value="",
                    placeholder="Déjalo vacío para que la IA lo defina…",
                    key="obj_m1",
                )
            with c_m1b_col:
                personaje_genero = st.radio(
                    "🧒 Género del personaje visual:",
                    ["masculino", "femenino", "ambos"],
                    horizontal=True,
                    key="genero_m1",
                )
            user_sug_m1 = st.text_area(
                "💬 Sugerencias:",
                value="",
                placeholder="Indicaciones especiales para esta lección…",
                height=68,
                key="sug_m1",
            )

        if ss.res_m1a_prev:
            col_prev, col_gen = st.columns([1, 2])
            with col_prev:
                label_prev = (
                    "🙈 Ocultar adaptaciones anteriores"
                    if ss.mostrar_adaptaciones_prev
                    else "👁️ Ver adaptaciones anteriores"
                )
                if st.button(label_prev, use_container_width=True):
                    ss.mostrar_adaptaciones_prev = not ss.mostrar_adaptaciones_prev
            if ss.mostrar_adaptaciones_prev:
                with st.container(border=True):
                    st.markdown("#### 📋 Adaptaciones de la lección anterior")
                    prev = ss.res_m1a_prev
                    adapt_prev = prev.get("tabla_adaptaciones_clase", [])
                    if adapt_prev:
                        st.dataframe(
                            adapt_prev, use_container_width=True, hide_index=True
                        )
                    dua_prev = prev.get("dua_neuroinclusion", [])
                    if dua_prev:
                        st.markdown("**Directrices DUA anteriores:**")
                        for d in forzar_lista(dua_prev):
                            st.markdown(f"- {d}")
            with col_gen:
                btn_generar = st.button(
                    "✨ Generar Nuevo Plan de Clase", use_container_width=True
                )
        else:
            btn_generar = st.button(
                "✨ Generar Plan de Clase", use_container_width=True
            )

        if btn_generar:
            conceptos_clave = []
            inteligencias_sug = []
            palabras_clave = []
            if ss.res_m0a and "unidad_sintetizada" in ss.res_m0a:
                for t in ss.res_m0a["unidad_sintetizada"].get(
                    "temas_desarrollados", []
                ):
                    if t.get("nombre", "") == tema_final:
                        conceptos_clave = forzar_lista(
                            t.get("conceptos_clave") or t.get("conceptos") or []
                        )
                        inteligencias_sug = forzar_lista(
                            t.get("inteligencias_sugeridas")
                            or t.get("inteligencias")
                            or []
                        )
                        palabras_clave = conceptos_clave
                        break

            contenido_real_tema = contenido_temas.get(tema_final, "")
            ss.tema_activo = tema_final
            ss.conceptos_activos = conceptos_clave
            ss.palabras_clave_activas = palabras_clave
            ss.contenido_tema_activo = contenido_real_tema

            contexto_prev = ""
            if ss.res_m1a_prev:
                contexto_prev = (
                    "CONTEXTO DE MEJORA: Ya existe un plan para otra lección de esta unidad. "
                    "Estudia las adaptaciones previas y MEJÓRALAS.\n"
                    + str(
                        {
                            k: ss.res_m1a_prev.get(k)
                            for k in [
                                "mapa_cognitivo",
                                "dua_neuroinclusion",
                                "tabla_adaptaciones_clase",
                            ]
                            if k in ss.res_m1a_prev
                        }
                    )[:800]
                )

            with st.spinner("Diseñando la estrategia de clase…"):
                vars_m1a = {
                    "tema_clase": tema_final,
                    "conceptos_clave": str(conceptos_clave)
                    or "Derivar del contenido del libro",
                    "palabras_clave": str(palabras_clave) or tema_final,
                    "inteligencias_sugeridas": str(inteligencias_sug)
                    or "Lingüística, Visual-espacial",
                    "contenido_curricular": contenido_real_tema[:1500]
                    or "No disponible",
                    "diagnosticos": DIAGNOSTICOS or "No especificado",
                    "objetivo_general": objetivo_gen or "No especificado",
                    "PAG_TB": pags_tb_auto,
                    "PAG_SB": pags_sb_auto,
                    "user_suggestions": user_sug_m1 or "Ninguna",
                    "contexto_leccion_previa": contexto_prev,
                }
                ss.res_m1a = generar_con_gemini(
                    "Motor_M1a.txt", vars_m1a, expect_json=True
                )
                ss.res_m1b = None
                ss.res_m1c = None
                ss.leccion_index += 1
                ss.mostrar_adaptaciones_prev = False

        if ss.res_m1a:
            res = ss.res_m1a
            lec_num = ss.leccion_index
            st.success(f"✅ Plan de clase #{lec_num} — **{ss.tema_activo}**")
            c_izq, c_der = st.columns([1.6, 1], gap="large")
            with c_izq:
                st.markdown("### 🎯 Verbos Operativos (Bloom)")
                for v in forzar_lista(res.get("mapa_cognitivo", {}).get("verbos", [])):
                    st.checkbox(v, value=True, key=f"bloom_{lec_num}_{v}")
                st.markdown("### 🧩 Inteligencias Múltiples")
                im_data = res.get("inteligencias_multiples", [])
                if im_data:
                    st.dataframe(im_data, use_container_width=True, hide_index=True)
                st.markdown("### ⏱️ Secuencia Didáctica *(45 min)*")
                for bloque in res.get("secuencia_didactica", {}).get("bloques", []):
                    nb = bloque.get("nombre", "Bloque")
                    dur = bloque.get("duracion", "?")
                    with st.expander(f"**⏩ {nb}** — {dur} min"):
                        st.write(bloque.get("objetivo", ""))
                        if "nota" in bloque:
                            st.info(f"💡 {bloque['nota']}")
            with c_der:
                st.markdown("### 🛡️ Directrices DUA")
                for d in forzar_lista(res.get("dua_neuroinclusion", [])):
                    st.markdown(f"- {d}")
                st.markdown("### ♿ Adaptaciones por Diagnóstico")
                adapt = res.get("tabla_adaptaciones_clase", [])
                if adapt:
                    st.dataframe(adapt, use_container_width=True, hide_index=True)
                st.markdown("### 👥 Perfil del Aula")
                st.info(res.get("perfil_aula_resumido", "—"))
            st.divider()
            st.download_button(
                "⬇️ Descargar Plan de Clase (.html)",
                data=generar_html_plan_clase(ss.res_m1a, ss.tema_activo, DIAGNOSTICOS),
                file_name=f"LasP_PlanClase_{_dt.now().strftime('%Y%m%d')}.html",
                mime="text/html",
                use_container_width=True,
            )

    # ═══════════════════════════════════════════════════════════════
    # TAB: DIAPOSITIVAS
    # ═══════════════════════════════════════════════════════════════
    with tab_diap:
        if not ss.res_m1a:
            st.warning("⚠️ Primero genera un **Plan de Clase** en la pestaña anterior.")
        else:
            tema_diap = ss.tema_activo
            pags_tb_d = paginas_temas.get(tema_diap, "—")
            pags_sb_d = (
                datos_sb.get("paginas_temas", {}).get(tema_diap, "—")
                if datos_sb and usar_sb == "Sí"
                else "N/A"
            )
            pkw = (
                str(ss.palabras_clave_activas)
                if ss.palabras_clave_activas
                else tema_diap
            )

            personaje_diap = st.radio(
                "🧒 Género del personaje:",
                ["masculino", "femenino", "ambos"],
                horizontal=True,
                key="genero_diap",
            )
            user_sug_diap = st.text_area(
                "💬 Sugerencias:",
                value="",
                height=68,
                key="sug_diap",
                placeholder="Indicaciones para las diapositivas…",
            )

            if st.button(
                "🎨 Generar Diapositivas",
                use_container_width=True,
                type="primary",
                key="btn_gen_diap",
            ):
                with st.spinner("M1b creando diapositivas…"):
                    vars_m1b = {
                        "plan_estrategico_json": str(ss.res_m1a),
                        "diagnosticos": DIAGNOSTICOS or "No especificado",
                        "PAG_TB": pags_tb_d,
                        "PAG_SB": pags_sb_d,
                        "palabras_clave": pkw,
                        "personaje_genero": personaje_diap,
                        "user_suggestions": user_sug_diap or "Ninguna",
                    }
                    ss.res_m1b = generar_con_gemini(
                        "Motor_M1b.txt", vars_m1b, expect_json=True
                    )

            if ss.res_m1b:
                st.success("✅ Diapositivas generadas.")
                raw = ss.res_m1b
                slides = (
                    raw
                    if isinstance(raw, list)
                    else raw.get("diapositivas") or raw.get("slides") or []
                )
                for i, slide in enumerate(slides):
                    if isinstance(slide, dict):
                        titulo_s = (
                            slide.get("titulo")
                            or slide.get("title")
                            or f"Slide {i + 1}"
                        )
                        with st.expander(f"**Slide {i + 1}: {titulo_s}**"):
                            st.markdown(
                                f"**📢 Guion:** {slide.get('guion_docente') or slide.get('guion', '')}"
                            )
                            st.markdown(
                                f"**🖥️ Pantalla:** {slide.get('texto_pantalla') or slide.get('texto', '')}"
                            )
                            prompt_img = slide.get("prompt_imagen") or slide.get(
                                "prompt", ""
                            )
                            if prompt_img:
                                st.code(prompt_img, language=None)
                st.caption(
                    "Descarga el archivo .pptx desde la pestaña **📤 Exportar**."
                )

    # ═══════════════════════════════════════════════════════════════
    # TAB: FICHA GAMIFICADA
    # ═══════════════════════════════════════════════════════════════
    with tab_ficha:
        if not ss.res_m1a:
            st.warning("⚠️ Primero genera un **Plan de Clase**.")
        else:
            pkw_ficha = (
                str(ss.palabras_clave_activas)
                if ss.palabras_clave_activas
                else ss.tema_activo
            )
            user_sug_fich = st.text_area(
                "💬 Sugerencias:",
                value="",
                height=68,
                key="sug_ficha",
                placeholder="Indicaciones para la ficha gamificada…",
            )

            if st.button(
                "🎮 Generar Ficha Gamificada",
                use_container_width=True,
                type="primary",
                key="btn_gen_ficha",
            ):
                with st.spinner("M1c creando ficha gamificada…"):
                    vars_m1c = {
                        "plan_estrategico_json": str(ss.res_m1a),
                        "diagnosticos": DIAGNOSTICOS or "No especificado",
                        "conceptos_clave": str(ss.conceptos_activos),
                        "palabras_clave": pkw_ficha,
                        "user_suggestions": user_sug_fich or "Ninguna",
                    }
                    ss.res_m1c = generar_con_gemini(
                        "Motor_M1c.txt", vars_m1c, expect_json=True
                    )

            if ss.res_m1c:
                st.success("✅ Ficha generada.")
                raw = ss.res_m1c
                ficha = raw.get("ficha_trabajo", raw) if isinstance(raw, dict) else {}
                st.markdown(f"## 🏆 {ficha.get('titulo_gancho', '—')}")
                st.write(ficha.get("historia_gancho", ""))
                misiones = ficha.get("misiones", {})
                t_or, t_pu, t_so, t_pe, t_li = st.tabs(
                    ["🔮 Oráculo", "🌉 Puente", "🥣 Sopa", "📜 Pergamino", "🎨 Lienzo"]
                )
                with t_or:
                    for q in misiones.get("oraculo", []):
                        st.markdown(f"**{q.get('pregunta', '')}**")
                        for op in q.get("opciones", []):
                            st.markdown(f"   • {op}")
                with t_pu:
                    for par in misiones.get("puente", []):
                        st.markdown(
                            f"**{par.get('palabra', '')}** → {par.get('significado', '')}"
                        )
                with t_so:
                    for p in misiones.get("sopa", []):
                        st.markdown(f"- {p}")
                with t_pe:
                    per = misiones.get("pergamino", {})
                    st.markdown(f"_{per.get('frase_con_espacios', '')}_")
                    st.markdown(
                        f"**Palabras secretas:** {', '.join(per.get('palabras_secretas', []))}"
                    )
                with t_li:
                    st.markdown(misiones.get("lienzo", ""))
                adapt_m = ficha.get("adaptaciones_por_mision", [])
                if adapt_m:
                    st.divider()
                    st.markdown("**♿ Adaptaciones por Misión:**")
                    st.dataframe(adapt_m, use_container_width=True, hide_index=True)
                st.divider()
                st.download_button(
                    "⬇️ Descargar Ficha Gamificada (.html)",
                    data=generar_html_ficha(
                        ss.res_m1c, ss.tema_activo, theme="aventura"
                    ).encode("utf-8"),
                    file_name=f"LasP_Ficha_{_dt.now().strftime('%Y%m%d')}.html",
                    mime="text/html",
                    use_container_width=True,
                )

    # ═══════════════════════════════════════════════════════════════
    # TAB: POP QUIZ
    # ═══════════════════════════════════════════════════════════════
    with tab_quiz:
        if not ss.res_m1a:
            st.warning("⚠️ Primero genera un **Plan de Clase**.")
        else:
            user_sug_m2 = st.text_area(
                "💬 Sugerencias:",
                value="",
                placeholder="Indicaciones especiales…",
                height=68,
                key="sug_m2",
            )
            c_btn1, c_btn2 = st.columns(2)
            with c_btn1:
                if st.button(
                    "🎲 Generar Pop Quiz DUA", use_container_width=True, key="btn_quiz"
                ):
                    with st.spinner("Creando Pop Quiz…"):
                        vars_m2a = {
                            "plan_estrategico_json": str(ss.res_m1a),
                            "diagnosticos": DIAGNOSTICOS or "No especificado",
                            "palabras_clave": str(ss.palabras_clave_activas)
                            or ss.tema_activo,
                            "proyecto_pbl": ss.res_m0b or "No disponible",
                            "user_suggestions": user_sug_m2 or "Ninguna",
                        }
                        ss.res_m2a = generar_con_gemini(
                            "Motor_M2a.txt", vars_m2a, expect_json=False
                        )
            with c_btn2:
                if st.button(
                    "📊 Generar Guía del Tutor",
                    use_container_width=True,
                    key="btn_tutor",
                    disabled=not ss.res_m2a,
                ):
                    with st.spinner("Creando Guía del Tutor…"):
                        vars_m2b = {
                            "plan_estrategico_json": str(ss.res_m1a),
                            "pop_quiz": ss.res_m2a,
                            "diagnosticos": DIAGNOSTICOS or "No especificado",
                            "sintesis_unidad": str(ss.res_m0a)
                            if ss.res_m0a
                            else "No disponible",
                            "proyecto_pbl": ss.res_m0b or "No disponible",
                            "user_suggestions": user_sug_m2 or "Ninguna",
                        }
                        ss.res_m2b = generar_con_gemini(
                            "Motor_M2b.txt", vars_m2b, expect_json=False
                        )

            if ss.res_m2a:
                st.divider()
                st.markdown("### 🎲 Pop Quiz DUA")
                st.markdown(ss.res_m2a)
            if ss.res_m2b:
                st.divider()
                st.markdown("### 📊 Panel de Control del Tutor")
                st.markdown(ss.res_m2b)
            if ss.res_m2a:
                st.divider()
                st.download_button(
                    "⬇️ Descargar Pop Quiz + Guía Tutor (.html)",
                    data=generar_html_evaluaciones(
                        ss.res_m2a, ss.res_m2b or "", ss.tema_activo, theme="aventura"
                    ).encode("utf-8"),
                    file_name=f"LasP_Evaluaciones_{_dt.now().strftime('%Y%m%d')}.html",
                    mime="text/html",
                    use_container_width=True,
                )

    # ═══════════════════════════════════════════════════════════════
    # TAB: EXPORTAR
    # ═══════════════════════════════════════════════════════════════
    with tab_export:
        render_panel_exportacion(st.session_state, DIAGNOSTICOS)
