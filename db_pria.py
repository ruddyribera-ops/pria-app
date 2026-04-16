"""
db_pria.py — Thin backward-compatibility wrapper for db/
=========================================================
All functionality has been moved to the `db/` package.
This module re-exports everything for backward compatibility
with existing imports like `from db_pria import crear_usuario`.

New code should use `from db import crear_usuario` or
`from db import usuarios; usuarios.crear_usuario(...)`.
"""

import os, re, json, hashlib, sqlite3, secrets, bcrypt
from datetime import datetime, date, timedelta, timezone
from contextlib import contextmanager

# Re-export from the new db/ package
from db import (
    # Infrastructure
    init_db,
    _conn,
    _q,
    _ph,
    _pk,
    _ts,
    _migration_col,
    _capture_exception,
    PGAdapter,
    PGCursor,
    # Internals (used by tests)
    _hash_password,
    _verify_password,
    _is_legacy_hash,
    _hash_token,
    _BCRYPT_ROUNDS,
    # Role
    Role,
    # Usuarios
    crear_usuario,
    verificar_login,
    crear_token_recordarme,
    verificar_token_recordarme,
    revocar_token_recordarme,
    revocar_tokens_usuario,
    get_usuario_by_email,
    get_all_usuarios,
    actualizar_password,
    actualizar_usuario_admin,
    toggle_usuario_activo,
    eliminar_usuario,
    # Sesiones
    crear_sesion,
    get_sesiones,
    get_sesion,
    get_or_create_sesion_diaria,
    guardar_micro_objetivos,
    get_micro_objetivos,
    marcar_objetivo,
    marcar_multiples,
    # Deuda
    get_deuda_academica,
    get_dependencias_bloqueadas,
    get_resumen_deuda,
    # Planes
    guardar_plan_buffer,
    get_planes_buffer,
    # Horario
    guardar_horario_docente,
    get_horario_dia,
    get_all_hojas,
    get_horario_docente_completo,
    guardar_bloque_horario_manual,
    eliminar_bloque_horario_manual,
    guardar_vigilancia_manual,
    eliminar_vigilancia_manual,
    reemplazar_horario_docente_manual,
    # Calendario
    guardar_eventos_calendario,
    get_eventos_fecha,
    get_eventos_rango,
    guardar_actividades_cronograma,
    get_actividades_fecha,
    # Comisiones
    guardar_vigilancias,
    get_vigilancias,
    get_comisiones_docente,
    guardar_comisiones,
    get_all_comisiones,
    # Bloques
    get_bloque_log,
    marcar_bloque_diario,
    cerrar_bloque,
    reabrir_bloque,
    get_logs_dia,
    reset_dia_docente,
    _bloque_key,
    # Utils
    minutos_para_fin_clase,
)

# ── Backward compat: module-level flags that tests patch ─────────────────────
from db import _USE_PG as _USE_PG, _PG_URL as _PG_URL, _DB_PATH as _DB_PATH

# ── Backward compat: init_db runs on import (matches original behavior) ───────
init_db()
