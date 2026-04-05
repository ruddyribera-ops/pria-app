"""
db_pria.py — Gestor de Estado y Persistencia del Bucle Activo de PRIA
======================================================================
Auto-detects backend:
  - DATABASE_URL env var present → PostgreSQL (Supabase / Railway)
  - No DATABASE_URL              → SQLite     (local dev, unchanged)
"""

import os, re, json, hashlib, sqlite3
from datetime import datetime, date
from contextlib import contextmanager

# ── Backend detection ─────────────────────────────────────────────────────────
_PG_URL  = os.environ.get("DATABASE_URL", "")
_USE_PG  = bool(_PG_URL)
_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pria_estado.db")


# ── SQL syntax translation ────────────────────────────────────────────────────
def _q(sql: str) -> str:
    """Translate SQLite-style placeholders/syntax to PostgreSQL when needed."""
    if not _USE_PG:
        return sql
    # Named params :key → %(key)s  (must run before ? replacement)
    sql = re.sub(r':([A-Za-z_][A-Za-z0-9_]*)', r'%(\1)s', sql)
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
        except Exception:
            con.rollback()
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
        except Exception:
            con.rollback()
            raise
        finally:
            con.close()


# ── DDL helpers ───────────────────────────────────────────────────────────────
def _pk() -> str:
    return "BIGSERIAL PRIMARY KEY" if _USE_PG else "INTEGER PRIMARY KEY AUTOINCREMENT"


def _ts() -> str:
    return "TIMESTAMPTZ DEFAULT NOW()" if _USE_PG else "TEXT DEFAULT (datetime('now','localtime'))"


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


# ═══════════════════════════════════════════════════════════════════════════════
# SESIONES
# ═══════════════════════════════════════════════════════════════════════════════

def crear_sesion(semana: int, materia: str, grado: str, tema: str,
                 hora_inicio: str = "", hora_fin: str = "",
                 fecha: str = None) -> int:
    fecha = fecha or date.today().isoformat()
    with _conn() as con:
        cur = con.execute(
            """INSERT INTO sesiones (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
        )
        return cur.lastrowid


def get_sesiones(materia: str = None, semana: int = None) -> list[dict]:
    query = "SELECT * FROM sesiones WHERE 1=1"
    params = []
    if materia:
        query += " AND materia = ?"
        params.append(materia)
    if semana is not None:
        query += " AND semana = ?"
        params.append(semana)
    query += " ORDER BY fecha DESC, hora_inicio ASC"
    with _conn() as con:
        return [dict(r) for r in con.execute(query, params).fetchall()]


def get_sesion(sesion_id: int) -> dict | None:
    with _conn() as con:
        row = con.execute("SELECT * FROM sesiones WHERE id = ?", (sesion_id,)).fetchone()
        return dict(row) if row else None


# ═══════════════════════════════════════════════════════════════════════════════
# MICRO-OBJETIVOS
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_micro_objetivos(sesion_id: int, objetivos: list[dict], origen_semana: int = None):
    with _conn() as con:
        con.execute("DELETE FROM micro_objetivos WHERE sesion_id = ?", (sesion_id,))
        for obj in objetivos:
            con.execute(
                """INSERT INTO micro_objetivos
                   (sesion_id, texto, depende_de, origen_semana)
                   VALUES (?, ?, ?, ?)""",
                (sesion_id, obj["texto"], obj.get("depende_de"), origen_semana)
            )


def get_micro_objetivos(sesion_id: int) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM micro_objetivos WHERE sesion_id = ? ORDER BY id",
            (sesion_id,)
        ).fetchall()]


def marcar_objetivo(objetivo_id: int, completado: bool):
    with _conn() as con:
        con.execute(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            (1 if completado else 0, objetivo_id)
        )


def marcar_multiples(objetivo_ids: list[int], completado: bool):
    with _conn() as con:
        con.executemany(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            [(1 if completado else 0, oid) for oid in objetivo_ids]
        )


# ═══════════════════════════════════════════════════════════════════════════════
# DEUDA ACADÉMICA
# ═══════════════════════════════════════════════════════════════════════════════

def get_deuda_academica(materia: str = None, semana_hasta: int = None) -> list[dict]:
    query = """
        SELECT mo.id, mo.texto, mo.depende_de, mo.origen_semana,
               s.materia, s.grado, s.tema, s.semana, s.fecha
        FROM micro_objetivos mo
        JOIN sesiones s ON mo.sesion_id = s.id
        WHERE mo.completado = 0
    """
    params = []
    if materia:
        query += " AND s.materia = ?"
        params.append(materia)
    if semana_hasta is not None:
        query += " AND s.semana <= ?"
        params.append(semana_hasta)
    query += " ORDER BY s.semana ASC, mo.id ASC"
    with _conn() as con:
        return [dict(r) for r in con.execute(query, params).fetchall()]


def get_dependencias_bloqueadas(materia: str = None) -> list[dict]:
    deuda_ids = {d["id"] for d in get_deuda_academica(materia)}
    if not deuda_ids:
        return []
    ph = _ph()
    placeholders = ",".join([ph] * len(deuda_ids))
    query = f"""
        SELECT mo.*, s.materia, s.tema, s.semana
        FROM micro_objetivos mo
        JOIN sesiones s ON mo.sesion_id = s.id
        WHERE mo.depende_de IN ({placeholders})
        AND mo.completado = 0
    """
    with _conn() as con:
        return [dict(r) for r in con.execute(query, list(deuda_ids)).fetchall()]


def get_resumen_deuda(materia: str = None) -> dict:
    deuda = get_deuda_academica(materia)
    bloqueados = get_dependencias_bloqueadas(materia)
    return {
        "total_pendientes": len(deuda),
        "bloqueados_criticos": len(bloqueados),
        "materias_afectadas": list({d["materia"] for d in deuda}),
        "semanas_afectadas": sorted({d["semana"] for d in deuda}),
        "deuda_detalle": deuda,
        "bloqueados_detalle": bloqueados,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PLANES BUFFER
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_plan_buffer(semana_buffer: int, materia: str, grado: str,
                        contenido_json: dict) -> int:
    resumen = contenido_json.get("resumen_ejecutivo", "")
    alerta  = 1 if contenido_json.get("alerta_condensacion") else 0
    with _conn() as con:
        cur = con.execute(
            """INSERT INTO planes_buffer
               (semana_buffer, materia, grado, contenido_json, resumen, alerta_condensacion)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (semana_buffer, materia, grado, json.dumps(contenido_json, ensure_ascii=False),
             resumen, alerta)
        )
        return cur.lastrowid


def get_planes_buffer(materia: str = None) -> list[dict]:
    query  = "SELECT * FROM planes_buffer WHERE 1=1"
    params = []
    if materia:
        query += " AND materia = ?"
        params.append(materia)
    query += " ORDER BY semana_buffer ASC"
    with _conn() as con:
        rows = [dict(r) for r in con.execute(query, params).fetchall()]
    for r in rows:
        try:
            r["contenido_json"] = json.loads(r["contenido_json"])
        except Exception:
            pass
    return rows


# ═══════════════════════════════════════════════════════════════════════════════
# ALERTAS DE TIEMPO
# ═══════════════════════════════════════════════════════════════════════════════

def minutos_para_fin_clase(hora_fin_str: str) -> int | None:
    try:
        parte = hora_fin_str.strip().split("-")[-1].strip()
        ahora = datetime.now()
        fin = datetime.strptime(parte, "%H:%M").replace(
            year=ahora.year, month=ahora.month, day=ahora.day
        )
        return int((fin - ahora).total_seconds() / 60)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# USUARIOS / AUTH
# ═══════════════════════════════════════════════════════════════════════════════

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def crear_usuario(email: str, password: str, nombre: str,
                  nombre_hoja: str, rol: str = "docente") -> bool:
    try:
        with _conn() as con:
            con.execute(
                "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol) VALUES (?,?,?,?,?)",
                (email.lower().strip(), _hash_password(password), nombre, nombre_hoja.upper().strip(), rol)
            )
        return True
    except Exception as e:
        if "unique" in str(e).lower() or "duplicate" in str(e).lower() or "UNIQUE" in str(e):
            return False
        raise


def verificar_login(email: str, password: str) -> dict | None:
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM usuarios WHERE email=? AND activo=1",
            (email.lower().strip(),)
        ).fetchone()
    if row and row["password_hash"] == _hash_password(password):
        return dict(row)
    return None


def get_usuario_by_email(email: str) -> dict | None:
    with _conn() as con:
        row = con.execute("SELECT * FROM usuarios WHERE email=?",
                          (email.lower().strip(),)).fetchone()
    return dict(row) if row else None


def get_all_usuarios() -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT id, email, nombre, nombre_hoja, rol, activo, creado_en FROM usuarios ORDER BY nombre"
        ).fetchall()]


def actualizar_password(email: str, nueva_password: str):
    with _conn() as con:
        con.execute("UPDATE usuarios SET password_hash=? WHERE email=?",
                    (_hash_password(nueva_password), email.lower().strip()))


def toggle_usuario_activo(usuario_id: int, activo: bool):
    with _conn() as con:
        con.execute("UPDATE usuarios SET activo=? WHERE id=?",
                    (1 if activo else 0, usuario_id))


def eliminar_usuario(usuario_id: int):
    with _conn() as con:
        con.execute("DELETE FROM usuarios WHERE id=?", (usuario_id,))


# ═══════════════════════════════════════════════════════════════════════════════
# HORARIO DOCENTE
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_horario_docente(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM horario_docente")
        con.executemany(
            """INSERT INTO horario_docente
               (nombre_hoja, dia_semana, hora_inicio, hora_fin,
                tipo_bloque, materia, nivel_grado, ubicacion, valor_original)
               VALUES (:nombre_hoja,:dia_semana,:hora_inicio,:hora_fin,
                       :tipo_bloque,:materia,:nivel_grado,:ubicacion,:valor_original)""",
            registros
        )


def get_horario_dia(nombre_hoja: str, dia_semana: str) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            """SELECT * FROM horario_docente
               WHERE nombre_hoja=? AND dia_semana=?
               ORDER BY hora_inicio ASC""",
            (nombre_hoja.upper(), dia_semana.lower())
        ).fetchall()]


def get_all_hojas() -> list[str]:
    with _conn() as con:
        rows = con.execute(
            "SELECT DISTINCT nombre_hoja FROM horario_docente ORDER BY nombre_hoja"
        ).fetchall()
    return [r["nombre_hoja"] for r in rows]


# ═══════════════════════════════════════════════════════════════════════════════
# CALENDARIO ESCOLAR
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_eventos_calendario(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM calendario_escolar")
        con.executemany(
            """INSERT INTO calendario_escolar
               (fecha, nombre_evento, descripcion, responsable, tipo)
               VALUES (:fecha,:nombre_evento,:descripcion,:responsable,:tipo)""",
            registros
        )


def get_eventos_fecha(fecha: str) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM calendario_escolar WHERE fecha=? ORDER BY id",
            (fecha,)
        ).fetchall()]


def get_eventos_rango(fecha_inicio: str, fecha_fin: str) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM calendario_escolar WHERE fecha BETWEEN ? AND ? ORDER BY fecha",
            (fecha_inicio, fecha_fin)
        ).fetchall()]


# ═══════════════════════════════════════════════════════════════════════════════
# ACTIVIDADES CRONOGRAMA
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_actividades_cronograma(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM actividades_cronograma")
        con.executemany(
            """INSERT INTO actividades_cronograma
               (fecha, hora_inicio, hora_fin, actividad, a_cargo_de)
               VALUES (:fecha,:hora_inicio,:hora_fin,:actividad,:a_cargo_de)""",
            registros
        )


def get_actividades_fecha(fecha: str, nombre_hoja: str = None) -> list[dict]:
    with _conn() as con:
        rows = [dict(r) for r in con.execute(
            "SELECT * FROM actividades_cronograma WHERE fecha=? ORDER BY hora_inicio",
            (fecha,)
        ).fetchall()]
    if not nombre_hoja:
        return rows
    nombre_upper = nombre_hoja.upper()
    filtered = []
    for r in rows:
        cargo = (r.get("a_cargo_de") or "").upper()
        if (not cargo or "DOCENTES" in cargo or "TODOS" in cargo
                or "TUTORES" in cargo or nombre_upper in cargo
                or "EQUIPO" in cargo or "COMUNIDAD" in cargo):
            filtered.append(r)
    return filtered


# ═══════════════════════════════════════════════════════════════════════════════
# COMISIONES DOCENTE
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_comisiones(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM comisiones_docente")
        con.executemany(
            """INSERT INTO comisiones_docente
               (nombre_docente, nombre_hoja, comision, funciones)
               VALUES (:nombre_docente,:nombre_hoja,:comision,:funciones)""",
            registros
        )


def get_comisiones_docente(nombre_hoja: str) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM comisiones_docente WHERE nombre_hoja=?",
            (nombre_hoja.upper(),)
        ).fetchall()]


def get_all_comisiones() -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM comisiones_docente ORDER BY comision, nombre_docente"
        ).fetchall()]


# ═══════════════════════════════════════════════════════════════════════════════
# BLOQUES DIARIO LOG
# ═══════════════════════════════════════════════════════════════════════════════

def _bloque_key(bloque: dict) -> str:
    return f"{bloque.get('dia_semana','')}|{bloque.get('hora_inicio','')}|{bloque.get('tipo_bloque','')}"


def get_bloque_log(fecha: str, nombre_hoja: str, bloque: dict) -> dict | None:
    key = _bloque_key(bloque)
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=? AND bloque_key=?",
            (fecha, nombre_hoja.upper(), key)
        ).fetchone()
    return dict(row) if row else None


def marcar_bloque_diario(fecha: str, nombre_hoja: str, bloque: dict,
                         completado: bool, notas: str = ""):
    key = _bloque_key(bloque)
    with _conn() as con:
        con.execute(
            """INSERT INTO bloques_diario_log (fecha, nombre_hoja, bloque_key, completado, notas)
               VALUES (?,?,?,?,?)
               ON CONFLICT(fecha, nombre_hoja, bloque_key)
               DO UPDATE SET completado=excluded.completado, notas=excluded.notas""",
            (fecha, nombre_hoja.upper(), key, 1 if completado else 0, notas)
        )


def cerrar_bloque(fecha: str, nombre_hoja: str, bloque: dict, notas: str = ""):
    key = _bloque_key(bloque)
    with _conn() as con:
        con.execute(
            """INSERT INTO bloques_diario_log (fecha, nombre_hoja, bloque_key, completado, cerrado, notas)
               VALUES (?,?,?,1,1,?)
               ON CONFLICT(fecha, nombre_hoja, bloque_key)
               DO UPDATE SET completado=1, cerrado=1, notas=excluded.notas""",
            (fecha, nombre_hoja.upper(), key, notas)
        )


def get_logs_dia(fecha: str, nombre_hoja: str) -> dict:
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper())
        ).fetchall()
    return {r["bloque_key"]: dict(r) for r in rows}


# ═══════════════════════════════════════════════════════════════════════════════
# TOP-DOWN SYNC — WeeklyPlan → Daily tracker
# ═══════════════════════════════════════════════════════════════════════════════

def get_objetivos_semana_materia(semana: int, materia: str, grado: str) -> list[dict]:
    with _conn() as con:
        return [dict(r) for r in con.execute(
            """SELECT mo.texto, mo.depende_de
               FROM micro_objetivos mo
               JOIN sesiones s ON mo.sesion_id = s.id
               WHERE s.semana = ? AND LOWER(s.materia) = LOWER(?) AND LOWER(s.grado) = LOWER(?)
               GROUP BY mo.texto
               ORDER BY mo.id""",
            (semana, materia, grado)
        ).fetchall()]


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN HELPERS
# ═══════════════════════════════════════════════════════════════════════════════

def reset_dia_docente(fecha: str, nombre_hoja: str):
    with _conn() as con:
        con.execute(
            "DELETE FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper())
        )


def get_or_create_sesion_diaria(fecha: str, semana: int, materia: str,
                                 grado: str, hora_inicio: str, hora_fin: str) -> int:
    with _conn() as con:
        row = con.execute(
            """SELECT id FROM sesiones
               WHERE fecha=? AND materia=? AND grado=? AND hora_inicio=?""",
            (fecha, materia, grado, hora_inicio)
        ).fetchone()
        if row:
            return row["id"]
        cur = con.execute(
            """INSERT INTO sesiones (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
               VALUES (?,?,?,?,?,?,?)""",
            (fecha, semana, hora_inicio, hora_fin or "", materia, grado,
             f"{materia} — {fecha}")
        )
        return cur.lastrowid


# ── Initialize DB on import ───────────────────────────────────────────────────
init_db()
