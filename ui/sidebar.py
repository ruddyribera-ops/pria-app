"""
ui/sidebar.py - Sidebar Content
==============================
Sidebar with profile, materials, diagnostics, and system status.
"""

import streamlit as st
import os

from ui.helpers import (
    CACHE_DIR,
    GEMINI_MODEL,
    helpers as h,
    analizar_pdf_ocr,
    leer_diagnosticos,
    generar_con_gemini,
    get_motor_stats,
    _cargar_cache_hash,
    _bytes_hash,
    log_event,
    limpiar_motor_cache,
)


def render_sidebar():
    """Render the full sidebar content. Call from app_ui.py."""
    from ui.auth_ui import logout

    with st.sidebar:
        ss = st.session_state

        st.image("https://img.icons8.com/fluency/96/owl.png", width=80)

        # Perfil Docente
        st.markdown("### 👤 Perfil Docente")
        nombre_display = ss.get("usuario_nombre") or ss.get("teacher_name", "")
        rol_display = ss.get("usuario_rol", "docente")
        st.markdown(f"**{nombre_display}**")
        st.caption(
            f"{'👑 Administrador' if rol_display == 'admin' else '🎓 Docente'} · {ss.get('usuario_email', '')}"
        )
        if st.button("Cerrar sesión", key="btn_logout", use_container_width=True):
            logout()

        # Motor Analytics
        with st.expander("📊 Estadísticas de Motores"):
            stats = get_motor_stats()
            col1, col2 = st.columns(2)
            with col1:
                st.metric("Usos Totales", stats.get("total_uses", 0))
            with col2:
                st.metric("Tasa de Éxito", f"{stats.get('success_rate', 0):.1f}%")
            if stats.get("motors"):
                st.caption("Motores más usados:")
                for m in stats["motors"][:5]:
                    st.caption(
                        f"• {m['name']}: {m['uses']} usos ({m['success_rate']:.0f}%)"
                    )

        # Cache management
        with st.expander("💾 Gestionar Caché"):
            cache_files = (
                [f for f in os.listdir(CACHE_DIR) if f.endswith(".json")]
                if os.path.exists(CACHE_DIR)
                else []
            )
            st.write(f"Entradas: {len(cache_files)}")
            c1, c2 = st.columns(2)
            with c1:
                if st.button("🧹 Motores", key="btn_cache_motor"):
                    limpiar_motor_cache()
                    st.rerun()
            with c2:
                if st.button("📄 PDFs", key="btn_cache_pdf"):
                    for cf in cache_files:
                        if cf.startswith("motor_"):
                            continue
                        try:
                            os.remove(os.path.join(CACHE_DIR, cf))
                        except Exception:
                            pass
                    ss.tb_extracted = None
                    ss.sb_extracted = None
                    st.rerun()

        # Nivel y Grado
        st.divider()
        st.markdown("### 🎓 Nivel Educativo")
        nivel = st.selectbox(
            "Nivel:",
            ["Primaria", "Secundaria"],
            index=0 if "primaria" in ss.grado_nivel else 1,
            key="sel_nivel",
        )
        max_grado = 6 if nivel == "Primaria" else 5
        sufijos = {1: "ro", 2: "do", 3: "ro", 4: "to", 5: "to", 6: "to"}
        grado_options = [
            f"{g}{sufijos.get(g, 'mo')} {nivel.lower()}"
            for g in range(1, max_grado + 1)
        ]
        sel_idx = next(
            (i for i, o in enumerate(grado_options) if o == ss.grado_nivel),
            4 if nivel == "Primaria" else 0,
        )
        grado = st.selectbox("Grado:", grado_options, index=sel_idx, key="sel_grado")
        if grado != ss.grado_nivel:
            ss.grado_nivel = grado
            st.rerun()

        # Materiales
        st.divider()
        st.markdown("### 📥 Materiales")

        uploaded_tb = st.file_uploader(
            "📗 Libro de Texto (PDF):", type=["pdf"], key="uploader_tb"
        )
        if uploaded_tb is not None:
            tb_bytes = uploaded_tb.getvalue()
            tb_hash_now = _bytes_hash(tb_bytes)
            if tb_hash_now != ss.uploaded_tb_hash:
                ss.uploaded_tb_bytes = tb_bytes
                ss.uploaded_tb_name = uploaded_tb.name
                ss.uploaded_tb_hash = tb_hash_now
                ss.tb_extracted = None
                _log_event(f"upload_tb:{uploaded_tb.name}", True)
            if ss.tb_extracted is None:
                if not _cargar_cache_hash(tb_hash_now):
                    with st.spinner("👁️ Motor Alpha leyendo el PDF…"):
                        ss.tb_extracted = analizar_pdf_ocr(
                            ss.uploaded_tb_bytes, ss.uploaded_tb_name
                        )
                        _log_event("analizar_tb", "unidad_real" in ss.tb_extracted)
                else:
                    ss.tb_extracted = analizar_pdf_ocr(
                        ss.uploaded_tb_bytes, ss.uploaded_tb_name
                    )
            datos_libro = ss.tb_extracted
            cache_label = (
                "📦 caché" if _cargar_cache_hash(ss.uploaded_tb_hash) else "🔍 nuevo"
            )
            st.success(f"📚 {datos_libro.get('unidad_real', '…')} *({cache_label})*")
        else:
            datos_libro = {
                "unidad_real": "",
                "temas": [],
                "contenido_temas": {},
                "paginas_temas": {},
            }

        usar_sb = st.radio(
            "📘 ¿Usa Student Book?", ["No", "Sí"], horizontal=True, key="radio_sb"
        )
        datos_sb = {}
        if usar_sb == "Sí":
            uploaded_sb = st.file_uploader(
                "📙 Student Book (PDF):", type=["pdf"], key="uploader_sb"
            )
            if uploaded_sb is not None:
                sb_bytes = uploaded_sb.getvalue()
                sb_hash_now = _bytes_hash(sb_bytes)
                if sb_hash_now != ss.uploaded_sb_hash:
                    ss.uploaded_sb_bytes = sb_bytes
                    ss.uploaded_sb_name = uploaded_sb.name
                    ss.uploaded_sb_hash = sb_hash_now
                    ss.sb_extracted = None
                if ss.sb_extracted is None:
                    cache_sb = _cargar_cache_hash(sb_hash_now)
                    if not cache_sb:
                        with st.spinner("👁️ Leyendo Student Book…"):
                            ss.sb_extracted = analizar_pdf_ocr(
                                ss.uploaded_sb_bytes, ss.uploaded_sb_name
                            )
                    else:
                        ss.sb_extracted = cache_sb
                datos_sb = ss.sb_extracted or {}

        # Diagnósticos
        st.divider()
        st.markdown("### 🩺 Diagnósticos")
        uploaded_diags = st.file_uploader(
            "Archivos (PDF, DOCX, TXT):",
            type=["pdf", "docx", "txt"],
            accept_multiple_files=True,
            key="uploader_diag",
        )
        if uploaded_diags:
            ss.uploaded_diag_files = [(f.name, f.getvalue()) for f in uploaded_diags]

        if ss.uploaded_diag_files and ss.diagnosticos_texto is None:
            with st.spinner("🔍 Leyendo diagnósticos…"):
                p_texto, p_tabla = leer_diagnosticos(ss.uploaded_diag_files)
                ss.diagnosticos_texto = p_texto
                ss.diagnosticos_tabla = p_tabla

        if ss.diagnosticos_texto:
            diag_preview = ss.diagnosticos_texto[:80] + (
                "…" if len(ss.diagnosticos_texto) > 80 else ""
            )
            st.success(f"✅ {diag_preview}")
            if ss.diagnosticos_tabla:
                st.dataframe(
                    ss.diagnosticos_tabla, use_container_width=True, hide_index=True
                )
            if st.button(
                "🔄 Releer diagnósticos",
                use_container_width=True,
                key="btn_releer_diag",
            ):
                ss.diagnosticos_texto = None
                ss.diagnosticos_tabla = []
                st.rerun()
        elif ss.uploaded_diag_files:
            st.info("Procesando archivos…")
        else:
            st.caption("Sin archivos cargados.")

        DIAGNOSTICOS = ss.diagnosticos_texto or ""

        # Estado del Sistema
        st.divider()
        st.markdown("### 📊 Estado del Sistema")
        estado = {
            "Síntesis Unidad": ss.res_m0a is not None,
            "Proyecto ABP": ss.res_m0b is not None,
            "Plan de Clase": ss.res_m1a is not None,
            "Diapositivas": ss.res_m1b is not None,
            "Ficha Gamificada": ss.res_m1c is not None,
            "Pop Quiz": ss.res_m2a is not None,
            "Guía del Tutor": ss.res_m2b is not None,
        }
        for nombre, listo in estado.items():
            st.markdown(f"{'✅' if listo else '⏳'} {nombre}")

        if ss.tema_activo:
            st.divider()
            st.markdown(f"**Tema activo:** {ss.tema_activo}")
            st.markdown(f"**Lecciones generadas:** {ss.leccion_index}")

        # Error retry
        if ss.last_error:
            st.divider()
            st.warning("⚠️ Última generación falló.")
            if st.button("🔄 Reintentar", use_container_width=True):
                fn = ss.last_generar_fn
                vrs = ss.last_generar_vars
                xjsn = ss.last_generar_json
                if fn and vrs is not None:
                    ss.last_error = None
                    generar_con_gemini(fn, vrs, xjsn)
                    st.rerun()

        st.divider()
        if st.button("🧹 Reiniciar Todo", use_container_width=True):
            st.cache_data.clear()
            from ui.helpers import SESSION_DEFAULTS

            for k, v in SESSION_DEFAULTS.items():
                ss[k] = v
            st.rerun()
        if st.button("🚪 Cerrar Sesión", use_container_width=True):
            _log_event("logout", True)
            ss.autenticado = False
            st.rerun()

    return datos_libro, datos_sb, DIAGNOSTICOS
