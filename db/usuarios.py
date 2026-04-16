"""
db/usuarios.py — User management and authentication
====================================================
"""

import secrets
from datetime import datetime, timedelta, timezone
from pria_docs.auth import Role

from ._base import _conn
from ._internals import (
    _hash_password,
    _verify_password,
    _is_legacy_hash,
    _hash_token,
    _BCRYPT_ROUNDS,
)

# ── Public API ────────────────────────────────────────────────────────────────


def crear_usuario(
    email: str, password: str, nombre: str, nombre_hoja: str, rol: str = "docente"
) -> bool:
    try:
        with _conn() as con:
            con.execute(
                "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol) VALUES (?,?,?,?,?)",
                (
                    email.lower().strip(),
                    _hash_password(password),
                    nombre,
                    nombre_hoja.upper().strip(),
                    rol,
                ),
            )
        return True
    except Exception as e:
        if (
            "unique" in str(e).lower()
            or "duplicate" in str(e).lower()
            or "UNIQUE" in str(e)
        ):
            return False
        raise


def verificar_login(email: str, password: str) -> dict | None:
    _em = email.lower().strip()
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM usuarios WHERE email=? AND activo=1", (_em,)
        ).fetchone()

    if not row:
        return None

    stored_hash = row["password_hash"]
    if not _verify_password(password, stored_hash):
        return None

    # Auto-migrate legacy SHA256 hash to bcrypt on successful login
    if _is_legacy_hash(stored_hash):
        new_hash = _hash_password(password)
        with _conn() as con:
            con.execute(
                "UPDATE usuarios SET password_hash=? WHERE id=?",
                (new_hash, row["id"]),
            )

    return dict(row)


def crear_token_recordarme(usuario_id: int, dias: int = 30) -> str:
    token_raw = secrets.token_urlsafe(48)
    token_hash = _hash_token(token_raw)
    expira_en = (
        datetime.now(timezone.utc) + timedelta(days=max(1, int(dias)))
    ).isoformat()
    with _conn() as con:
        con.execute(
            """INSERT INTO auth_tokens (usuario_id, token_hash, expira_en, revocado)
               VALUES (?,?,?,0)""",
            (int(usuario_id), token_hash, expira_en),
        )
    return token_raw


def verificar_token_recordarme(token_raw: str) -> dict | None:
    token_hash = _hash_token(token_raw)
    with _conn() as con:
        row = con.execute(
            """SELECT u.*,
                      at.id AS token_id,
                      at.expira_en AS token_expira_en,
                      at.revocado AS token_revocado
               FROM auth_tokens at
               JOIN usuarios u ON u.id = at.usuario_id
               WHERE at.token_hash=? AND at.revocado=0 AND u.activo=1""",
            (token_hash,),
        ).fetchone()

    if not row:
        return None

    # Convert to dict to ensure .get() works regardless of row type
    row_dict = dict(row)
    expira_raw = str(row_dict.get("token_expira_en") or "").strip()
    try:
        expira_dt = datetime.fromisoformat(expira_raw)
    except Exception:
        return None

    if datetime.now(timezone.utc) >= expira_dt:
        return None

    d = dict(row)
    d.pop("token_id", None)
    d.pop("token_expira_en", None)
    d.pop("token_revocado", None)
    return d


def revocar_token_recordarme(token_raw: str):
    token_hash = _hash_token(token_raw)
    with _conn() as con:
        con.execute(
            "UPDATE auth_tokens SET revocado=1 WHERE token_hash=?", (token_hash,)
        )


def revocar_tokens_usuario(usuario_id: int):
    with _conn() as con:
        con.execute(
            "UPDATE auth_tokens SET revocado=1 WHERE usuario_id=?", (int(usuario_id),)
        )


def get_usuario_by_email(email: str) -> dict | None:
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM usuarios WHERE email=?", (email.lower().strip(),)
        ).fetchone()
    return dict(row) if row else None


def get_all_usuarios() -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT id, email, nombre, nombre_hoja, rol, activo, creado_en FROM usuarios ORDER BY nombre"
            ).fetchall()
        ]


def actualizar_password(email: str, nueva_password: str):
    with _conn() as con:
        con.execute(
            "UPDATE usuarios SET password_hash=? WHERE email=?",
            (_hash_password(nueva_password), email.lower().strip()),
        )

    u = get_usuario_by_email(email)
    if u:
        revocar_tokens_usuario(int(u["id"]))


def actualizar_usuario_admin(
    usuario_id: int,
    nuevo_email: str | None = None,
    nueva_password: str | None = None,
    nuevo_nombre: str | None = None,
) -> tuple[bool, str]:
    """Actualiza credenciales básicas de un usuario desde panel admin."""
    try:
        with _conn() as con:
            if nuevo_email is not None and str(nuevo_email).strip():
                con.execute(
                    "UPDATE usuarios SET email=? WHERE id=?",
                    (str(nuevo_email).strip().lower(), usuario_id),
                )
            if nuevo_nombre is not None and str(nuevo_nombre).strip():
                con.execute(
                    "UPDATE usuarios SET nombre=? WHERE id=?",
                    (str(nuevo_nombre).strip(), usuario_id),
                )
            if nueva_password is not None and str(nueva_password).strip():
                con.execute(
                    "UPDATE usuarios SET password_hash=? WHERE id=?",
                    (_hash_password(str(nueva_password).strip()), usuario_id),
                )
                con.execute(
                    "UPDATE auth_tokens SET revocado=1 WHERE usuario_id=?",
                    (int(usuario_id),),
                )
        return True, "ok"
    except Exception as e:
        msg = str(e).lower()
        if "unique" in msg or "duplicate" in msg:
            return False, "Ese correo ya existe."
        return False, f"Error al actualizar: {e}"


def toggle_usuario_activo(usuario_id: int, activo: bool):
    with _conn() as con:
        con.execute(
            "UPDATE usuarios SET activo=? WHERE id=?", (1 if activo else 0, usuario_id)
        )


def eliminar_usuario(usuario_id: int):
    with _conn() as con:
        con.execute("DELETE FROM usuarios WHERE id=?", (usuario_id,))
