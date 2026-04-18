"""
db/_base.py — Shared database infrastructure for PRIA
=====================================================
Backend detection, connection management, SQL translation,
and DDL helpers. All other DAO modules import from here.
"""

import os, re, json, hashlib, sqlite3, secrets, bcrypt
from datetime import datetime, date, timedelta, timezone
from contextlib import contextmanager

try:
    import sentry_sdk as _sentry

    _SENTRY_AVAILABLE = True
except ImportError:
    _SENTRY_AVAILABLE = False


def _capture_exception(exc: Exception) -> None:
    """Send exception to Sentry if configured, otherwise silently ignore."""
    if _SENTRY_AVAILABLE and os.environ.get("SENTRY_DSN"):
        _sentry.capture_exception(exc)


# ── Backend detection ─────────────────────────────────────────────────────────
_PG_URL = os.environ.get("DATABASE_URL", "")
_USE_PG = bool(_PG_URL)
_DB_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "pria_estado.db"
)


# ── SQL syntax translation ────────────────────────────────────────────────────
def _q(sql: str) -> str:
    """Translate SQLite-style placeholders/syntax to PostgreSQL when needed."""
    if not _USE_PG:
        return sql
    # Named params :key → %(key)s  (must run before ? replacement)
    sql = re.sub(r":([A-Za-z_][A-Za-z0-9_]*)", r"%(\1)s", sql)
    # Positional ? → %s
    sql = sql.replace("?", "%s")
    return sql


def _ph() -> str:
    """Return positional placeholder for the current backend."""
    return "%s" if _USE_PG else "?"


# ── PostgreSQL adapters ───────────────────────────────────────────────────────
class _PGCursor:
    """Wraps psycopg2 cursor to expose a sqlite3-compatible interface."""

    def __init__(self, cur):
        self._c = cur

    def fetchone(self):
        row = self._c.fetchone()
        return dict(row) if row else None

    def fetchall(self):
        return [dict(r) for r in (self._c.fetchall() or [])]

    @property
    def lastrowid(self):
        # INSERT statements have RETURNING id appended by _PGAdapter.execute
        row = self._c.fetchone()
        return row["id"] if row else None


class _PGAdapter:
    """Makes a psycopg2 connection behave like a sqlite3 connection."""

    def __init__(self, con):
        self._con = con

    def execute(self, sql: str, params=()):
        cur = self._con.cursor()
        translated = _q(sql)
        # Auto-add RETURNING id to INSERTs so that lastrowid works
        if translated.lstrip().upper().startswith("INSERT"):
            translated = translated.rstrip().rstrip(";") + " RETURNING id"
        cur.execute(translated, params if params else None)
        return _PGCursor(cur)

    def executemany(self, sql: str, params_list):
        cur = self._con.cursor()
        cur.executemany(_q(sql), params_list)

    def executescript(self, script: str):
        cur = self._con.cursor()
        for stmt in script.split(";"):
            stmt = stmt.strip()
            if stmt and not stmt.startswith("--"):
                cur.execute(stmt)


# ── Connection context manager ────────────────────────────────────────────────
@contextmanager
def _conn():
    """
    Yields a database connection. Commits on clean exit, rolls back on exception.
    Automatically uses PostgreSQL if DATABASE_URL is set, otherwise SQLite.
    """
    if _USE_PG:
        import psycopg2, psycopg2.extras

        con = psycopg2.connect(_PG_URL, cursor_factory=psycopg2.extras.RealDictCursor)
        try:
            yield _PGAdapter(con)
            con.commit()
        except Exception as exc:
            con.rollback()
            _capture_exception(exc)
            raise
        finally:
            con.close()
    else:
        con = sqlite3.connect(_DB_PATH, check_same_thread=False)
        con.execute("PRAGMA foreign_keys = ON")
        con.row_factory = sqlite3.Row
        try:
            yield con
            con.commit()
        except Exception as exc:
            con.rollback()
            _capture_exception(exc)
            raise
        finally:
            con.close()


# ── DDL helpers ───────────────────────────────────────────────────────────────
def _pk() -> str:
    return "BIGSERIAL PRIMARY KEY" if _USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"


def _ts() -> str:
    return (
        "TIMESTAMPTZ DEFAULT NOW()"
        if _USE_PG
        else "TEXT DEFAULT (datetime('now','localtime'))"
    )


# ── Schema initialization ─────────────────────────────────────────────────────
def init_db():
    """Creates all tables if they don't exist. Idempotent."""
    pk, ts = _pk(), _ts()

    tables = [
        f"""CREATE TABLE IF NOT EXISTS usuarios (
            id            {pk},
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            nombre        TEXT NOT NULL,
            nombre_hoja   TEXT NOT NULL,
            rol           TEXT DEFAULT 'docente',
            activo        INTEGER DEFAULT 1,
            creado_en     {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS auth_tokens (
            id            {pk},
            usuario_id    INTEGER NOT NULL,
            token_hash    TEXT NOT NULL UNIQUE,
            expira_en     TEXT NOT NULL,
            revocado      INTEGER DEFAULT 0,
            creado_en     {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS horario_docente (
            id            {pk},
            nombre_hoja   TEXT NOT NULL,
            dia_semana    TEXT NOT NULL,
            hora_inicio   TEXT NOT NULL,
            hora_fin      TEXT,
            tipo_bloque   TEXT NOT NULL,
            materia       TEXT,
            nivel_grado   TEXT,
            ubicacion     TEXT,
            valor_original TEXT
        )""",
        f"""CREATE TABLE IF NOT EXISTS calendario_escolar (
            id            {pk},
            fecha         TEXT NOT NULL,
            nombre_evento TEXT NOT NULL,
            descripcion   TEXT,
            responsable   TEXT,
            tipo          TEXT
        )""",
        f"""CREATE TABLE IF NOT EXISTS actividades_cronograma (
            id            {pk},
            fecha         TEXT NOT NULL,
            hora_inicio   TEXT,
            hora_fin      TEXT,
            actividad     TEXT NOT NULL,
            a_cargo_de    TEXT
        )""",
        f"""CREATE TABLE IF NOT EXISTS comisiones_docente (
            id            {pk},
            nombre_docente TEXT NOT NULL,
            nombre_hoja   TEXT NOT NULL,
            comision      TEXT NOT NULL,
            funciones     TEXT
        )""",
        f"""CREATE TABLE IF NOT EXISTS vigilancias_recreo (
            id            {pk},
            nombre_hoja   TEXT NOT NULL,
            ubicacion     TEXT NOT NULL
        )""",
        f"""CREATE TABLE IF NOT EXISTS vigilancia_asignacion (
            id            {pk},
            nombre_hoja   TEXT NOT NULL,
            nivel         TEXT NOT NULL,
            dia_semana    TEXT NOT NULL,
            recreo_num    TEXT NOT NULL,
            zona          TEXT NOT NULL,
            hora_inicio   TEXT,
            hora_fin      TEXT,
            nota          TEXT,
            fuente        TEXT DEFAULT 'pdf',
            UNIQUE(nombre_hoja, nivel, dia_semana, recreo_num, zona)
        )""",
        f"""CREATE TABLE IF NOT EXISTS bloques_diario_log (
            id            {pk},
            fecha         TEXT NOT NULL,
            nombre_hoja   TEXT NOT NULL,
            bloque_key    TEXT NOT NULL,
            completado    INTEGER DEFAULT 0,
            cerrado       INTEGER DEFAULT 0,
            notas         TEXT,
            UNIQUE(fecha, nombre_hoja, bloque_key)
        )""",
        f"""CREATE TABLE IF NOT EXISTS sesiones (
            id          {pk},
            fecha       TEXT NOT NULL,
            semana      INTEGER NOT NULL,
            hora_inicio TEXT,
            hora_fin    TEXT,
            materia     TEXT NOT NULL,
            grado       TEXT NOT NULL,
            tema        TEXT NOT NULL,
            creado_en   {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS micro_objetivos (
            id           {pk},
            sesion_id    INTEGER NOT NULL,
            texto        TEXT NOT NULL,
            completado   INTEGER NOT NULL DEFAULT 0,
            depende_de   INTEGER,
            prioridad    TEXT DEFAULT 'normal',
            origen_semana INTEGER,
            creado_en    {ts}
        )""",
        f"""CREATE TABLE IF NOT EXISTS planes_buffer (
            id               {pk},
            semana_buffer    INTEGER NOT NULL,
            materia          TEXT NOT NULL,
            grado            TEXT NOT NULL,
            contenido_json   TEXT NOT NULL,
            resumen          TEXT,
            alerta_condensacion INTEGER DEFAULT 0,
            creado_en        {ts}
        )""",
    ]

    with _conn() as con:
        for stmt in tables:
            con.execute(stmt)

    # Migrations — add columns that may not exist in older DBs
    _migration_col("bloques_diario_log", "cerrado", "INTEGER DEFAULT 0")
    _migration_col("horario_docente", "orden", "INTEGER")
    # Password change enforcement (Task 2 — force password change on first login)
    _migration_col(
        "usuarios",
        "must_change_password",
        "INTEGER DEFAULT 1" if not _USE_PG else "BOOLEAN DEFAULT TRUE",
    )
    # Fix must_change_password type in PostgreSQL (INTEGER -> BOOLEAN)
    if _USE_PG:
        try:
            with _conn() as con:
                con.execute(
                    "ALTER TABLE usuarios ALTER COLUMN must_change_password TYPE BOOLEAN USING must_change_password::boolean"
                )
        except Exception:
            pass  # Already correct type


def _migration_col(table: str, col: str, col_def: str):
    """Safely adds a column to an existing table if it doesn't exist."""
    if _USE_PG:
        sql = f"ALTER TABLE {table} ADD COLUMN IF NOT EXISTS {col} {col_def}"
        with _conn() as con:
            con.execute(sql)
    else:
        try:
            with _conn() as con:
                con.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_def}")
        except Exception:
            pass  # column already exists
