"""
ui/auth_ui.py - Authentication UI
================================
Login screen and session management.
"""

import streamlit as st


def render_login():
    """Render login form. Returns True if authenticated, False otherwise."""
    if "usuario_email" not in st.session_state:
        st.session_state.usuario_email = None
        st.session_state.usuario_nombre = None
        st.session_state.usuario_hoja = None
        st.session_state.usuario_rol = None

    if st.session_state.get("autenticado"):
        return True

    with st.container(border=True):
        st.markdown("### 🔐 Acceso al Sistema PRIA")
        st.caption("Ingresa con tu usuario o correo institucional y contraseña.")
        email = st.text_input(
            "Usuario o correo:",
            placeholder="admin  /  nombre@laspalmas.edu",
            key="login_email",
        )
        pwd = st.text_input("Contraseña:", type="password", key="login_pwd")

        # Import here to avoid circular imports
        from db import verificar_login
        from ui.helpers import _log_event

        if st.button(
            "Ingresar", type="primary", use_container_width=True, key="btn_login"
        ):
            usuario = verificar_login(email, pwd)
            if usuario:
                st.session_state.autenticado = True
                st.session_state.usuario_email = usuario["email"]
                st.session_state.usuario_nombre = usuario["nombre"]
                st.session_state.usuario_hoja = usuario["nombre_hoja"]
                st.session_state.usuario_rol = usuario["rol"]
                st.session_state.teacher_name = usuario["nombre"]
                _log_event("login", True)
                st.rerun()
            else:
                _log_event("login_failed", False, "wrong credentials")
                st.error("❌ Correo o contraseña incorrectos.")
    st.stop()
    return False


def logout():
    """Clear authentication state."""
    for key in [
        "autenticado",
        "usuario_email",
        "usuario_nombre",
        "usuario_hoja",
        "usuario_rol",
    ]:
        st.session_state.pop(key, None)
    st.rerun()
