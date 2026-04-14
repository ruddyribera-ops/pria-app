"""
db_pria.py — Gestor de Estado y Persistencia del Bucle Activo de PRIA
======================================================================
Auto-detects backend:
  - DATABASE_URL env var present → PostgreSQL (Supabase / Railway)
  - No DATABASE_URL              → SQLite     (local dev, unchanged)
"""

import os, re, json, hashlib, sqlite3, secrets
from datetime import datetime, date
from contextlib import contextmanager

# Load .env file for local development connected to prod DB
try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:
    pass

# ── Backend detection ─────────────────────────────────────────────────────────
_PG_URL = os.environ.get("DATABASE_URL", "")
_USE_PG = bool(_PG_URL)
_DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pria_estado.db")


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
        # Motor analytics table
        f"""CREATE TABLE IF NOT EXISTS motor_usage (
            id              {pk},
            motor_name      TEXT NOT NULL,
            user_email      TEXT,
            success         INTEGER NOT NULL,
            duration_ms     REAL NOT NULL,
            prompt_version  TEXT,
            created_at      {ts}
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


def crear_sesion(
    semana: int,
    materia: str,
    grado: str,
    tema: str,
    hora_inicio: str = "",
    hora_fin: str = "",
    fecha: str = None,
) -> int:
    fecha = fecha or date.today().isoformat()
    with _conn() as con:
        cur = con.execute(
            """INSERT INTO sesiones (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (fecha, semana, hora_inicio, hora_fin, materia, grado, tema),
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
        row = con.execute(
            "SELECT * FROM sesiones WHERE id = ?", (sesion_id,)
        ).fetchone()
        return dict(row) if row else None


# ═══════════════════════════════════════════════════════════════════════════════
# MICRO-OBJETIVOS
# ═══════════════════════════════════════════════════════════════════════════════


def guardar_micro_objetivos(
    sesion_id: int, objetivos: list[dict], origen_semana: int = None
):
    with _conn() as con:
        con.execute("DELETE FROM micro_objetivos WHERE sesion_id = ?", (sesion_id,))
        for obj in objetivos:
            con.execute(
                """INSERT INTO micro_objetivos
                   (sesion_id, texto, depende_de, origen_semana)
                   VALUES (?, ?, ?, ?)""",
                (sesion_id, obj["texto"], obj.get("depende_de"), origen_semana),
            )


def get_micro_objetivos(sesion_id: int) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM micro_objetivos WHERE sesion_id = ? ORDER BY id",
                (sesion_id,),
            ).fetchall()
        ]


def marcar_objetivo(objetivo_id: int, completado: bool):
    with _conn() as con:
        con.execute(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            (1 if completado else 0, objetivo_id),
        )


def marcar_multiples(objetivo_ids: list[int], completado: bool):
    with _conn() as con:
        con.executemany(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            [(1 if completado else 0, oid) for oid in objetivo_ids],
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


def guardar_plan_buffer(
    semana_buffer: int, materia: str, grado: str, contenido_json: dict
) -> int:
    resumen = contenido_json.get("resumen_ejecutivo", "")
    alerta = 1 if contenido_json.get("alerta_condensacion") else 0
    with _conn() as con:
        cur = con.execute(
            """INSERT INTO planes_buffer
               (semana_buffer, materia, grado, contenido_json, resumen, alerta_condensacion)
               VALUES (?, ?, ?, ?, ?, ?)""",
            (
                semana_buffer,
                materia,
                grado,
                json.dumps(contenido_json, ensure_ascii=False),
                resumen,
                alerta,
            ),
        )
        return cur.lastrowid


def get_planes_buffer(materia: str = None) -> list[dict]:
    query = "SELECT * FROM planes_buffer WHERE 1=1"
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
# USUARIOS / AUTH (with salt-based hashing)
# ═══════════════════════════════════════════════════════════════════════════════


def _generate_salt() -> str:
    """Generate a cryptographically secure salt."""
    return secrets.token_hex(32)


def _hash_password(password: str, salt: str) -> str:
    """Hash password with salt using SHA-256."""
    combined = f"{salt}{password}".encode()
    return hashlib.sha256(combined).hexdigest()


def _verify_password(password: str, salt: str, password_hash: str) -> bool:
    """Verify password against stored hash."""
    return _hash_password(password, salt) == password_hash


def crear_usuario(
    email: str, password: str, nombre: str, nombre_hoja: str, rol: str = "docente"
) -> bool:
    try:
        salt = _generate_salt()
        password_hash = _hash_password(password, salt)
        with _conn() as con:
            con.execute(
                "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol, salt) VALUES (?,?,?,?,?,?)",
                (
                    email.lower().strip(),
                    password_hash,
                    nombre,
                    nombre_hoja.upper().strip(),
                    rol,
                    salt,
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
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM usuarios WHERE email=? AND activo=1",
            (email.lower().strip(),),
        ).fetchone()
    if row:
        salt = row.get("salt", "")
        stored_hash = row.get("password_hash", "")

        # Handle legacy passwords (no salt) - upgrade to new format
        if not salt:
            # Try old hash format (password directly hashed)
            if stored_hash == hashlib.sha256(password.encode()).hexdigest():
                # Upgrade to secure salt-based hash
                _upgrade_password_hash(row["id"], password)
                # Re-fetch user
                return get_usuario_by_email(email)

        # Verify with new salt-based hash
        elif _verify_password(password, salt, stored_hash):
            return dict(row)
    return None


def _upgrade_password_hash(user_id: int, password: str) -> bool:
    """Upgrade legacy password to secure salt-based hash."""
    try:
        salt = _generate_salt()
        new_hash = _hash_password(password, salt)

        with _conn() as con:
            con.execute(
                "UPDATE usuarios SET password_hash=?, salt=? WHERE id=?",
                (new_hash, salt, user_id),
            )
        return True
    except Exception:
        return False


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


def toggle_usuario_activo(usuario_id: int, activo: bool):
    with _conn() as con:
        con.execute(
            "UPDATE usuarios SET activo=? WHERE id=?", (1 if activo else 0, usuario_id)
        )


def eliminar_usuario(usuario_id: int):
    with _conn() as con:
        con.execute("DELETE FROM usuarios WHERE id=?", (usuario_id,))


# ═══════════════════════════════════════════════════════════════════════════════
# HORARIO DOCENTE
# ═══════════════════════════════════════════════════════════════════════════════


def guardar_horario_docente(registros: list[dict]):
    print(f"DEBUG: Guardando {len(registros)} registros de horario...")
    with _conn() as con:
        con.execute("DELETE FROM horario_docente")
        # Optimization: use executemany with named placeholders
        con.executemany(
            """INSERT INTO horario_docente
               (nombre_hoja, dia_semana, hora_inicio, hora_fin,
                tipo_bloque, materia, nivel_grado, ubicacion, valor_original)
               VALUES (:nombre_hoja,:dia_semana,:hora_inicio,:hora_fin,
                       :tipo_bloque,:materia,:nivel_grado,:ubicacion,:valor_original)""",
            registros,
        )
    print("DEBUG: Guardado de horarios completado.")


def get_horario_dia(nombre_hoja: str, dia_semana: str) -> list[dict]:
    """
    Returns schedule blocks for a teacher on a given day.
    Dynamically injects vigilancia_recreo blocks from the vigilancias_recreo table
    (the master list), so all teachers see their assigned recess duties.
    """
    # Official recess time slots
    _RECESO_TIMES = {
        "PRIMARIA RECREO 1": ("10:10", "10:30"),
        "PRIMARIA RECREO 2": ("12:00", "12:15"),
        "SECUNDARIA RECREO 1": ("09:25", "10:10"),
        "SECUNDARIA RECREO 2": ("11:15", "12:00"),
    }
    # Normalize accented days
    _DIAS_NORM = {
        "MIÉRCOLES": "MIERCOLES",
        "MIERCOLES": "MIERCOLES",
        "LUNES": "LUNES",
        "MARTES": "MARTES",
        "JUEVES": "JUEVES",
        "VIERNES": "VIERNES",
    }
    _ALL_DAYS = {"LUNES", "MIERCOLES", "JUEVES", "VIERNES"}

    with _conn() as con:
        # Get regular blocks
        blocks = [
            dict(r)
            for r in con.execute(
                """SELECT * FROM horario_docente
               WHERE nombre_hoja=? AND dia_semana=?
               ORDER BY hora_inicio ASC""",
                (nombre_hoja.upper(), dia_semana.lower()),
            ).fetchall()
        ]

        dia_upper = dia_semana.upper()
        dia_norm = _DIAS_NORM.get(dia_upper, dia_upper)

        # Build set of existing (hora_inicio, tipo_bloque) to avoid duplicate injection
        existing_keys = {
            (b["hora_inicio"], b["tipo_bloque"])
            for b in blocks
            if b.get("hora_inicio") and b.get("tipo_bloque")
        }

        injected = []

        vigilancias_rows = con.execute(
            "SELECT ubicacion FROM vigilancias_recreo WHERE nombre_hoja=?",
            (nombre_hoja.upper(),),
        ).fetchall()

        for row in vigilancias_rows:
            ubicacion_raw = row["ubicacion"] or ""
            if not ubicacion_raw or ubicacion_raw.upper().strip() == "SIN ASIGNAR":
                continue

            # Split multiple locations separated by comma
            # e.g. "PRIMARIA RECREO 1 MARTES PATIO CENTRAL, PRIMARIA RECREO 2 MARTES COLISEO"
            for ubicacion in ubicacion_raw.split(","):
                ubicacion = ubicacion.strip()
                if not ubicacion:
                    continue
                ub_up = ubicacion.upper()

                # Find which slot this matches (PRIMARIA/SECUNDARIA + RECREO 1/2)
                recreo_slot = None
                for slot_key in _RECESO_TIMES:
                    if slot_key.upper() in ub_up:
                        recreo_slot = slot_key
                        break

                # Determine if this entry is for the current day
                dia_match = False
                for day_name in ["LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES"]:
                    if day_name in ub_up:
                        day_norm = _DIAS_NORM.get(day_name, day_name)
                        if day_norm == dia_norm:
                            dia_match = True
                        break

                # Handle ANGÉLICA case: "PARQUE" without nivel prefix
                if not recreo_slot and ub_up.strip() == "PARQUE":
                    recreo_slot = "PRIMARIA RECREO 1"
                    dia_match = dia_norm in _ALL_DAYS

                if not dia_match or not recreo_slot:
                    continue

                ini, fin = _RECESO_TIMES[recreo_slot]
                nivel = (
                    "Primaria" if "PRIMARIA" in recreo_slot.upper() else "Secundaria"
                )

                # Skip if horario_docente already has a block at this time
                block_key = (ini, "vigilancia_recreo")
                if block_key in existing_keys:
                    continue

                injected.append(
                    {
                        "id": None,
                        "nombre_hoja": nombre_hoja.upper(),
                        "dia_semana": dia_semana.lower(),
                        "hora_inicio": ini,
                        "hora_fin": fin,
                        "tipo_bloque": "vigilancia_recreo",
                        "materia": None,
                        "nivel_grado": nivel,
                        "ubicacion": ubicacion,
                        "valor_original": ubicacion,
                        "orden": None,
                    }
                )

        # Merge and sort all blocks by hora_inicio
        all_blocks = blocks + injected
        all_blocks.sort(key=lambda b: b.get("hora_inicio") or "")
        return all_blocks


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
            registros,
        )


def get_eventos_fecha(fecha: str) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM calendario_escolar WHERE fecha=? ORDER BY id", (fecha,)
            ).fetchall()
        ]


def get_eventos_rango(fecha_inicio: str, fecha_fin: str) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM calendario_escolar WHERE fecha BETWEEN ? AND ? ORDER BY fecha",
                (fecha_inicio, fecha_fin),
            ).fetchall()
        ]


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
            registros,
        )


def get_actividades_fecha(fecha: str, nombre_hoja: str = None) -> list[dict]:
    with _conn() as con:
        rows = [
            dict(r)
            for r in con.execute(
                "SELECT * FROM actividades_cronograma WHERE fecha=? ORDER BY hora_inicio",
                (fecha,),
            ).fetchall()
        ]
    if not nombre_hoja:
        return rows
    nombre_upper = nombre_hoja.upper()
    filtered = []
    for r in rows:
        cargo = (r.get("a_cargo_de") or "").upper()
        if (
            not cargo
            or "DOCENTES" in cargo
            or "TODOS" in cargo
            or "TUTORES" in cargo
            or nombre_upper in cargo
            or "EQUIPO" in cargo
            or "COMUNIDAD" in cargo
        ):
            filtered.append(r)
    return filtered


# ═══════════════════════════════════════════════════════════════════════════════
# COMISIONES DOCENTE
# ═══════════════════════════════════════════════════════════════════════════════


def guardar_comisiones_docente(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM comisiones_docente")
        con.executemany(
            """INSERT INTO comisiones_docente
               (nombre_docente, nombre_hoja, comision, funciones)
               VALUES (:nombre_docente,:nombre_hoja,:comision,:funciones)""",
            registros,
        )


def get_comisiones_docente(nombre_hoja: str) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM comisiones_docente WHERE nombre_hoja=?",
                (nombre_hoja.upper(),),
            ).fetchall()
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# VIGILANCIAS RECREO
# ═══════════════════════════════════════════════════════════════════════════════


def guardar_vigilancias(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM vigilancias_recreo")
        con.executemany(
            """INSERT INTO vigilancias_recreo (nombre_hoja, ubicacion)
               VALUES (:nombre_hoja, :ubicacion)""",
            registros,
        )


def get_vigilancias() -> dict[str, str]:
    with _conn() as con:
        rows = con.execute(
            "SELECT nombre_hoja, ubicacion FROM vigilancias_recreo"
        ).fetchall()
        return {r["nombre_hoja"].upper(): r["ubicacion"] for r in rows}


def guardar_comisiones(registros: list[dict]):
    with _conn() as con:
        con.execute("DELETE FROM comisiones_docente")
        con.executemany(
            """INSERT INTO comisiones_docente
               (nombre_docente, nombre_hoja, comision, funciones)
               VALUES (:nombre_docente,:nombre_hoja,:comision,:funciones)""",
            registros,
        )


def get_comisiones_docente(nombre_hoja: str) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM comisiones_docente WHERE nombre_hoja=?",
                (nombre_hoja.upper(),),
            ).fetchall()
        ]


def get_all_comisiones() -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM comisiones_docente ORDER BY comision, nombre_docente"
            ).fetchall()
        ]


# ═══════════════════════════════════════════════════════════════════════════════
# BLOQUES DIARIO LOG
# ═══════════════════════════════════════════════════════════════════════════════


def _bloque_key(bloque: dict) -> str:
    return f"{bloque.get('dia_semana', '')}|{bloque.get('hora_inicio', '')}|{bloque.get('tipo_bloque', '')}"


def get_bloque_log(fecha: str, nombre_hoja: str, bloque: dict) -> dict | None:
    key = _bloque_key(bloque)
    with _conn() as con:
        row = con.execute(
            "SELECT * FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=? AND bloque_key=?",
            (fecha, nombre_hoja.upper(), key),
        ).fetchone()
    return dict(row) if row else None


def marcar_bloque_diario(
    fecha: str, nombre_hoja: str, bloque: dict, completado: bool, notas: str = ""
):
    key = _bloque_key(bloque)
    with _conn() as con:
        con.execute(
            """INSERT INTO bloques_diario_log (fecha, nombre_hoja, bloque_key, completado, notas)
               VALUES (?,?,?,?,?)
               ON CONFLICT(fecha, nombre_hoja, bloque_key)
               DO UPDATE SET completado=excluded.completado, notas=excluded.notas""",
            (fecha, nombre_hoja.upper(), key, 1 if completado else 0, notas),
        )


def cerrar_bloque(fecha: str, nombre_hoja: str, bloque: dict, notas: str = ""):
    key = _bloque_key(bloque)
    with _conn() as con:
        con.execute(
            """INSERT INTO bloques_diario_log (fecha, nombre_hoja, bloque_key, completado, cerrado, notas)
               VALUES (?,?,?,1,1,?)
               ON CONFLICT(fecha, nombre_hoja, bloque_key)
               DO UPDATE SET completado=1, cerrado=1, notas=excluded.notas""",
            (fecha, nombre_hoja.upper(), key, notas),
        )


def reabrir_bloque(fecha: str, nombre_hoja: str, bloque: dict):
    key = _bloque_key(bloque)
    with _conn() as con:
        con.execute(
            "UPDATE bloques_diario_log SET cerrado=0, completado=0 WHERE fecha=? AND nombre_hoja=? AND bloque_key=?",
            (fecha, nombre_hoja.upper(), key),
        )


def get_logs_dia(fecha: str, nombre_hoja: str) -> dict:
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper()),
        ).fetchall()
    return {r["bloque_key"]: dict(r) for r in rows}


# ═══════════════════════════════════════════════════════════════════════════════
# TOP-DOWN SYNC — WeeklyPlan → Daily tracker
# ═══════════════════════════════════════════════════════════════════════════════


def get_objetivos_semana_materia(semana: int, materia: str, grado: str) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            """SELECT mo.texto, mo.depende_de, s.materia as s_mat, s.grado as s_grad, mo.id
               FROM micro_objetivos mo
               JOIN sesiones s ON mo.sesion_id = s.id
               WHERE s.semana = ?
               ORDER BY mo.id ASC""",
            (semana,),
        ).fetchall()

    def _normalize(text):
        import unicodedata, re

        if not text:
            return ""
        text = str(text).upper()
        text = "".join(
            c
            for c in unicodedata.normalize("NFD", text)
            if unicodedata.category(c) != "Mn"
        )
        return re.sub(r"[^A-Z0-9]", "", text)

    norm_mat = _normalize(materia)
    norm_grado = _normalize(grado)

    matched = []
    for r in rows:
        r_mat = _normalize(r["s_mat"])
        r_grad = _normalize(r["s_grad"])

        match_mat = (norm_mat in r_mat) or (r_mat in norm_mat)
        if not match_mat:
            if "LENGUA" in norm_mat and "LENGUA" in r_mat:
                match_mat = True
            if "MATEMA" in norm_mat and "MATEMA" in r_mat:
                match_mat = True

        match_grado = (norm_grado in r_grad) or (r_grad in norm_grado)
        if not match_grado and r_grad and norm_grado:
            import re

            m1 = re.search(r"(\d)", r_grad)
            m2 = re.search(r"(\d)", norm_grado)
            if m1 and m2 and m1.group(1) == m2.group(1):
                if ("S" in r_grad or "SEC" in r_grad) and (
                    "S" in norm_grado or "SEC" in norm_grado
                ):
                    match_grado = True
                elif ("P" in r_grad or "PRIM" in r_grad) and (
                    "P" in norm_grado or "PRIM" in norm_grado
                ):
                    match_grado = True

        if match_mat and (match_grado or not norm_grado or not r_grad):
            matched.append(
                {"texto": r["texto"], "depende_de": r["depende_de"], "id": r["id"]}
            )

    seen = set()
    final = []
    for m in matched:
        k = (m["texto"], m["depende_de"])
        if k not in seen:
            seen.add(k)
            final.append(m)
    return final


# ═══════════════════════════════════════════════════════════════════════════════
# ADMIN HELPERS
# ═══════════════════════════════════════════════════════════════════════════════


def reset_dia_docente(fecha: str, nombre_hoja: str):
    with _conn() as con:
        con.execute(
            "DELETE FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper()),
        )


def get_or_create_sesion_diaria(
    fecha: str, semana: int, materia: str, grado: str, hora_inicio: str, hora_fin: str
) -> int:
    with _conn() as con:
        row = con.execute(
            """SELECT id FROM sesiones
               WHERE fecha=? AND materia=? AND grado=? AND hora_inicio=?""",
            (fecha, materia, grado, hora_inicio),
        ).fetchone()
        if row:
            return row["id"]
        cur = con.execute(
            """INSERT INTO sesiones (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
               VALUES (?,?,?,?,?,?,?)""",
            (
                fecha,
                semana,
                hora_inicio,
                hora_fin or "",
                materia,
                grado,
                f"{materia} — {fecha}",
            ),
        )
        return cur.lastrowid


# ═══════════════════════════════════════════════════════════════════════════════
# MOTOR ANALYTICS
# ═══════════════════════════════════════════════════════════════════════════════


def guardar_motor_uso(
    motor_name: str,
    success: bool,
    duration_ms: float,
    user_email: str = None,
    prompt_version: str = None,
):
    """Save motor usage to database for analytics."""
    with _conn() as con:
        con.execute(
            """INSERT INTO motor_usage (motor_name, user_email, success, duration_ms, prompt_version)
               VALUES (?,?,?,?,?)""",
            (motor_name, user_email, 1 if success else 0, duration_ms, prompt_version),
        )


def get_motor_analytics(
    dias: int = 7,
    motor_name: str = None,
) -> dict:
    """
    Get motor usage analytics.

    Args:
        dias: Number of days to look back
        motor_name: Optional filter for specific motor

    Returns:
        dict with usage stats per motor
    """
    fecha_limite = datetime.now().strftime("%Y-%m-%d")

    where_clause = "WHERE created_at >= ?"
    params = [fecha_limite]

    if motor_name:
        where_clause += " AND motor_name = ?"
        params.append(motor_name)

    with _conn() as con:
        # Get stats per motor
        stats = con.execute(
            f"""SELECT motor_name, COUNT(*) as total_uses,
                       SUM(success) as successes,
                       AVG(duration_ms) as avg_duration
                FROM motor_usage {where_clause}
                GROUP BY motor_name""",
            params,
        ).fetchall()

        return [
            {
                "name": r["motor_name"],
                "uses": r["total_uses"],
                "successes": r["successes"],
                "success_rate": (r["successes"] / r["total_uses"] * 100)
                if r["total_uses"] > 0
                else 0,
                "avg_duration_ms": r["avg_duration"] or 0,
            }
            for r in stats
        ]


# ── Initialize DB on import ───────────────────────────────────────────────────
init_db()
