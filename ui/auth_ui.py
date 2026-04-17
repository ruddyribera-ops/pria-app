"""
ui/auth_ui.py - Authentication UI
================================
Login screen, session management, and force-password-change flow.
"""

import streamlit as st


def render_login():
    """Render login form or force-password-change screen. Returns True if authenticated."""

    # ── Force password change screen ──────────────────────────────────────────
    if st.session_state.get("force_pwd_change"):
        _render_password_change_form()
        st.stop()
        return False

    # ── Normal auth ───────────────────────────────────────────────────────────
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
        from ui.cache import log_event

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
                log_event("login", True)

                # Check if user must change password
                if usuario.get("must_change_password"):
                    st.session_state.force_pwd_change = True
                    st.rerun()
                else:
                    st.rerun()
            else:
                log_event("login_failed", False, "wrong credentials")
                st.error("Correo o contraseña incorrectos.")
    st.stop()
    return False


def _render_password_change_form():
    """Show the forced password change screen after first login."""
    from db import cambiar_password, get_usuario_by_email

    st.markdown("### 🔑 Cambia tu contraseña")
    st.warning(
        "Esta es la primera vez que ingresas. Debes cambiar tu contraseña antes de continuar."
    )

    user_email = st.session_state.get("usuario_email", "")

    with st.form(key="force_pwd_change_form", border=True):
        nuevo_pwd = st.text_input(
            "Nueva contraseña:",
            type="password",
            help="Mínimo 10 caracteres.",
        )
        confirmar_pwd = st.text_input(
            "Confirmar nueva contraseña:",
            type="password",
        )
        submitted = st.form_submit_button(
            "Guardar y continuar",
            type="primary",
            use_container_width=True,
        )

        if submitted:
            errors = []

            if len(nuevo_pwd) < 10:
                errors.append("La contraseña debe tener al menos 10 caracteres.")

            if nuevo_pwd != confirmar_pwd:
                errors.append("Las contraseñas no coinciden.")

            if errors:
                for err in errors:
                    st.error(err)
            else:
                try:
                    user = get_usuario_by_email(user_email)
                    if user:
                        cambiar_password(int(user["id"]), nuevo_pwd)
                        st.session_state.force_pwd_change = False
                        st.session_state.autenticado = True
                        st.success("Contraseña cambiada. Bienvenido/a!")
                        st.rerun()
                except ValueError as e:
                    st.error(str(e))
                except Exception as e:
                    st.error(f"Error al cambiar contraseña: {e}")


def logout():
    """Clear authentication state."""
    for key in [
        "autenticado",
        "usuario_email",
        "usuario_nombre",
        "usuario_hoja",
        "usuario_rol",
        "force_pwd_change",
    ]:
        st.session_state.pop(key, None)
    st.rerun()
