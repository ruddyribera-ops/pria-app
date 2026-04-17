"""
db/__init__.py — PRIA Database Access Objects
=============================================
Provides structured access via submodules and re-exports all functions
for convenience.

Usage:
    from db import crear_usuario, get_sesion

Usage (structured):
    from db import usuarios, sesiones
    db.usuarios.crear_usuario(...)
"""

# ── Infrastructure ────────────────────────────────────────────────────────────
from ._base import (
    init_db,
    _conn,
    _q,
    _ph,
    _pk,
    _ts,
    _migration_col,
    _capture_exception,
)
from ._base import _PGAdapter as PGAdapter
from ._base import _PGCursor as PGCursor

# ── Internal helpers (used by tests / pria_docs) ───────────────────────────────
from ._internals import (
    _hash_password,
    _verify_password,
    _is_legacy_hash,
    _hash_token,
    _BCRYPT_ROUNDS,
)

# ── Role enum ─────────────────────────────────────────────────────────────────
from pria_docs.auth import Role

# ── Usuarios / Auth ───────────────────────────────────────────────────────────
from .usuarios import (
    crear_usuario,
    verificar_login,
    crear_token_recordarme,
    verificar_token_recordarme,
    revocar_token_recordarme,
    revocar_tokens_usuario,
    get_usuario_by_email,
    get_usuario_by_id,
    get_all_usuarios,
    actualizar_password,
    cambiar_password,
    actualizar_usuario_admin,
    toggle_usuario_activo,
    eliminar_usuario,
)

# ── Sesiones ─────────────────────────────────────────────────────────────────
from .sesiones import (
    crear_sesion,
    get_sesiones,
    get_sesion,
    get_or_create_sesion_diaria,
    guardar_micro_objetivos,
    get_micro_objetivos,
    marcar_objetivo,
    marcar_multiples,
)

# ── Deuda académica ──────────────────────────────────────────────────────────
from .deuda import (
    get_deuda_academica,
    get_dependencias_bloqueadas,
    get_resumen_deuda,
)

# ── Planes buffer ─────────────────────────────────────────────────────────────
from .planes import (
    guardar_plan_buffer,
    get_planes_buffer,
)

# ── Horario ──────────────────────────────────────────────────────────────────
from .horario import (
    guardar_horario_docente,
    get_horario_dia,
    get_all_hojas,
    get_horario_docente_completo,
    guardar_bloque_horario_manual,
    eliminar_bloque_horario_manual,
    guardar_vigilancia_manual,
    eliminar_vigilancia_manual,
    reemplazar_horario_docente_manual,
)

# ── Calendario ────────────────────────────────────────────────────────────────
from .calendario import (
    guardar_eventos_calendario,
    get_eventos_fecha,
    get_eventos_rango,
    guardar_actividades_cronograma,
    get_actividades_fecha,
)

# ── Comisiones / Vigilancias ──────────────────────────────────────────────────
from .comisiones import (
    guardar_vigilancias,
    get_vigilancias,
    get_comisiones_docente,
    guardar_comisiones,
    get_all_comisiones,
)

# ── Bloques diario ───────────────────────────────────────────────────────────
from .bloques import (
    get_bloque_log,
    marcar_bloque_diario,
    cerrar_bloque,
    reabrir_bloque,
    get_logs_dia,
    reset_dia_docente,
    _bloque_key,
)

# ── Utilities ────────────────────────────────────────────────────────────────
from .utils import minutos_para_fin_clase

# ── Sync ─────────────────────────────────────────────────────────────────────
from .sync import get_objetivos_semana_materia

# ── Submodule access (new structured usage) ───────────────────────────────────
from . import usuarios
from . import sesiones
from . import deuda
from . import planes
from . import horario
from . import calendario
from . import comisiones
from . import bloques
from . import utils
from . import sync
from . import _base
from . import _internals

# ── Backward-compat flags ─────────────────────────────────────────────────────
_USE_PG = _base._USE_PG
_PG_URL = _base._PG_URL
_DB_PATH = _base._DB_PATH

# ── Init on import ───────────────────────────────────────────────────────────
# NOTE: init_db() is NOT called automatically here.
# Tests use the `db` fixture which patches db._base._DB_PATH before calling init_db().
# Do NOT call init_db() here automatically — it would pollute the real DB before patching.

__all__ = [
    # Infrastructure
    "init_db",
    "_conn",
    "_q",
    "_ph",
    "_pk",
    "_ts",
    "_migration_col",
    "_capture_exception",
    "PGAdapter",
    "PGCursor",
    # Internals (used by tests)
    "_hash_password",
    "_verify_password",
    "_is_legacy_hash",
    "_hash_token",
    "_BCRYPT_ROUNDS",
    # Role
    "Role",
    # Usuarios
    "crear_usuario",
    "verificar_login",
    "crear_token_recordarme",
    "verificar_token_recordarme",
    "revocar_token_recordarme",
    "revocar_tokens_usuario",
    "get_usuario_by_email",
    "get_usuario_by_id",
    "get_all_usuarios",
    "actualizar_password",
    "cambiar_password",
    "actualizar_usuario_admin",
    "toggle_usuario_activo",
    "eliminar_usuario",
    # Sesiones
    "crear_sesion",
    "get_sesiones",
    "get_sesion",
    "get_or_create_sesion_diaria",
    "guardar_micro_objetivos",
    "get_micro_objetivos",
    "marcar_objetivo",
    "marcar_multiples",
    # Deuda
    "get_deuda_academica",
    "get_dependencias_bloqueadas",
    "get_resumen_deuda",
    # Planes
    "guardar_plan_buffer",
    "get_planes_buffer",
    # Horario
    "guardar_horario_docente",
    "get_horario_dia",
    "get_all_hojas",
    "get_horario_docente_completo",
    "guardar_bloque_horario_manual",
    "eliminar_bloque_horario_manual",
    "guardar_vigilancia_manual",
    "eliminar_vigilancia_manual",
    "reemplazar_horario_docente_manual",
    # Calendario
    "guardar_eventos_calendario",
    "get_eventos_fecha",
    "get_eventos_rango",
    "guardar_actividades_cronograma",
    "get_actividades_fecha",
    # Comisiones
    "guardar_vigilancias",
    "get_vigilancias",
    "get_comisiones_docente",
    "guardar_comisiones",
    "get_all_comisiones",
    # Bloques
    "get_bloque_log",
    "marcar_bloque_diario",
    "cerrar_bloque",
    "reabrir_bloque",
    "get_logs_dia",
    "reset_dia_docente",
    # Utils
    "minutos_para_fin_clase",
    # Sync
    "get_objetivos_semana_materia",
    # Submodules
    "usuarios",
    "sesiones",
    "deuda",
    "planes",
    "horario",
    "calendario",
    "comisiones",
    "bloques",
    "utils",
    "sync",
    "_base",
    "_internals",
    # Flags
    "_USE_PG",
    "_PG_URL",
    "_DB_PATH",
]
