"""
db_pria.py — Gestor de Estado y Persistencia del Bucle Activo de PRIA
======================================================================
Auto-detects backend:
  - DATABASE_URL env var present → PostgreSQL (Supabase / Railway)
  - No DATABASE_URL              → SQLite     (local dev, unchanged)
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
# USUARIOS / AUTH
# ═══════════════════════════════════════════════════════════════════════════════
# Password hashing uses bcrypt (work factor 12).
# Legacy SHA256 hashes are auto-migrated to bcrypt on first successful login.
# Auth roles are consolidated in pria_docs.auth (Role enum).

from pria_docs.auth import Role

_BCRYPT_ROUNDS = 12


def _hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt. Returns a UTF-8 string."""
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt(rounds=_BCRYPT_ROUNDS)).decode()


def _verify_password(password: str, stored_hash: str) -> bool:
    """Check password against stored hash. Supports both bcrypt and legacy SHA256."""
    if stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"):
        # bcrypt hash
        return bcrypt.checkpw(password.encode(), stored_hash.encode())
    else:
        # Legacy SHA256 — accept and trigger migration
        return stored_hash == hashlib.sha256(password.encode()).hexdigest()


def _is_legacy_hash(stored_hash: str) -> bool:
    return not (stored_hash.startswith("$2b$") or stored_hash.startswith("$2a$"))


def _hash_token(token: str) -> str:
    return hashlib.sha256(str(token or "").encode()).hexdigest()


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
            registros,
        )


def get_horario_dia(nombre_hoja: str, dia_semana: str) -> list[dict]:
    _nh = str(nombre_hoja or "").upper().strip()
    _dia = str(dia_semana or "").lower().strip()

    # Official recess times
    RECESO_TIMES = {
        "primaria": [("10:10", "10:30"), ("12:00", "12:15")],
        "secundaria": [("09:25", "10:10"), ("11:15", "12:00")],
    }

    def _strip_accents(s: str) -> str:
        import unicodedata

        return "".join(
            c
            for c in unicodedata.normalize("NFD", s)
            if unicodedata.category(c) != "Mn"
        )

    def _norm_dia(d: str) -> str:
        return _strip_accents(d.lower().strip())

    def _time_overlaps(h_ini, h_fin, r_ini, r_fin):
        if not h_ini or not r_ini:
            return False
        return h_ini <= r_fin and r_ini <= (h_fin or h_ini)

    with _conn() as con:
        rows = [
            dict(r)
            for r in con.execute(
                """SELECT * FROM horario_docente
               WHERE nombre_hoja=? AND dia_semana=?
               ORDER BY COALESCE(orden, 99999) ASC, hora_inicio ASC, id ASC""",
                (_nh, _dia),
            ).fetchall()
        ]

        # Dynamically inject vigilancia blocks from vigilancias_recreo table
        norm_dia = _norm_dia(_dia)
        vigilancias = {
            r["nombre_hoja"].upper(): r["ubicacion"]
            for r in con.execute(
                "SELECT nombre_hoja, ubicacion FROM vigilancias_recreo"
            ).fetchall()
        }
        vigilancia_ubicacion = vigilancias.get(_nh)

        if vigilancia_ubicacion and rows:
            # Determine nivel from existing blocks (Primaria starts 07:xx, Secundaria 08:xx+)
            has_primaria = any(
                r["hora_inicio"] and r["hora_inicio"] < "08:30" for r in rows
            )
            nivel = "primaria" if has_primaria else "secundaria"
            recesos = RECESO_TIMES[nivel]

            # Parse all comma-separated locations
            all_locations = [loc.strip() for loc in vigilancia_ubicacion.split(",")]

            # Determine which locations match the current day
            matched_locs = []
            for loc in all_locations:
                loc_up = _strip_accents(loc.upper())
                # Skip SIN ASIGNAR entries
                if "SIN ASIGNAR" in loc_up:
                    continue
                # ANGÉLICA special case: "PARQUE" → Primaria R1 only
                if _nh == "ANGÉLICA" and "PARQUE" in loc.upper():
                    loc = "Patio Central"
                    matched_locs.append((loc, "1"))  # (location, recreo_num)
                    continue
                # Extract recreo number from location string (e.g., "PRIMARIA RECREO 1 LUNES ...")
                recreo_num = None
                for part in loc_up.split():
                    if part.isdigit() and int(part) in (1, 2):
                        recreo_num = part
                        break
                # Check if day matches (norm_dia is lowercase, loc_up is uppercase)
                if norm_dia.upper() in loc_up:
                    matched_locs.append((loc, recreo_num))

            for r_ini, r_fin in recesos:
                # Determine recreo number for this slot (R1 < 11:00, R2 >= 11:00)
                recreo_num_slot = "1" if float(r_ini.replace(":", ".")) < 11.0 else "2"
                # Find locations for this slot
                slot_locs = [
                    loc
                    for loc, rn in matched_locs
                    if rn is None or rn == recreo_num_slot
                ]
                if not slot_locs:
                    continue
                for loc in slot_locs:
                    rows.append(
                        {
                            "id": None,
                            "nombre_hoja": _nh,
                            "dia_semana": _dia,
                            "hora_inicio": r_ini,
                            "hora_fin": r_fin,
                            "tipo_bloque": "vigilancia_recreo",
                            "materia": None,
                            "nivel_grado": nivel.title(),
                            "ubicacion": loc,
                            "valor_original": f"recreo - {loc}",
                            "orden": 0,
                        }
                    )
            # Re-sort by hora_inicio
            rows.sort(key=lambda r: r.get("hora_inicio") or "")

        if rows:
            return rows

        # Fallback tolerante a errores de escritura / abreviaciones en nombre_hoja
        cand = [
            dict(r)
            for r in con.execute(
                """SELECT * FROM horario_docente
               WHERE dia_semana=?
               ORDER BY nombre_hoja, COALESCE(orden, 99999) ASC, hora_inicio ASC, id ASC""",
                (_dia,),
            ).fetchall()
        ]

    if not cand:
        return []

    import unicodedata

    def _norm(s: str) -> str:
        s = str(s or "").upper().strip()
        s = "".join(
            c
            for c in unicodedata.normalize("NFD", s)
            if unicodedata.category(c) != "Mn"
        )
        s = re.sub(
            r"\b(PROF(?:ESOR(?:A)?)?|DOCENTE|MISS|MISTER|MR|MRS|MS|LIC\.?)\b", " ", s
        )
        s = re.sub(r"[^A-Z0-9 ]+", " ", s)
        s = re.sub(r"\s+", " ", s).strip()
        return s

    target = _norm(_nh)
    if not target:
        return []

    by_name = {}
    for r in cand:
        by_name.setdefault(str(r.get("nombre_hoja") or "").upper().strip(), []).append(
            r
        )

    def _score(a: str, b: str) -> float:
        if not a or not b:
            return 0.0
        if a == b:
            return 1.0
        if a in b or b in a:
            return 0.95
        sa, sb = set(a.split()), set(b.split())
        if sa and sb:
            j = len(sa & sb) / max(1, len(sa | sb))
            if j > 0:
                return 0.6 + 0.35 * j
        return 0.0

    best_name = None
    best_score = 0.0
    for raw_name in by_name.keys():
        s = _score(target, _norm(raw_name))
        if s > best_score:
            best_score, best_name = s, raw_name

    return by_name.get(best_name, []) if best_name and best_score >= 0.75 else []


def get_all_hojas() -> list[str]:
    with _conn() as con:
        rows = con.execute(
            "SELECT DISTINCT nombre_hoja FROM horario_docente ORDER BY nombre_hoja"
        ).fetchall()
    return [r["nombre_hoja"] for r in rows]


def get_horario_docente_completo(nombre_hoja: str) -> list[dict]:
    with _conn() as con:
        rows = con.execute(
            """SELECT * FROM horario_docente
               WHERE nombre_hoja=?
               ORDER BY
                 CASE dia_semana
                   WHEN 'lunes' THEN 1
                   WHEN 'martes' THEN 2
                   WHEN 'miercoles' THEN 3
                   WHEN 'jueves' THEN 4
                   WHEN 'viernes' THEN 5
                   ELSE 9
                 END,
                 COALESCE(orden, 99999) ASC,
                 hora_inicio ASC,
                 id ASC""",
            (str(nombre_hoja or "").upper().strip(),),
        ).fetchall()
    return [dict(r) for r in rows]


def guardar_bloque_horario_manual(
    nombre_hoja: str,
    dia_semana: str,
    hora_inicio: str,
    hora_fin: str,
    tipo_bloque: str,
    materia: str = None,
    nivel_grado: str = None,
    ubicacion: str = None,
    valor_original: str = None,
    bloque_id: int = None,
    orden: int = None,
):
    nh = str(nombre_hoja or "").upper().strip()
    ds = str(dia_semana or "").lower().strip()
    hi = str(hora_inicio or "").strip()
    hf = str(hora_fin or "").strip()
    tb = str(tipo_bloque or "").strip()

    with _conn() as con:
        if bloque_id:
            con.execute(
                """UPDATE horario_docente
                   SET nombre_hoja=?, dia_semana=?, hora_inicio=?, hora_fin=?,
                       tipo_bloque=?, materia=?, nivel_grado=?, ubicacion=?, valor_original=?, orden=?
                   WHERE id=?""",
                (
                    nh,
                    ds,
                    hi,
                    hf,
                    tb,
                    materia,
                    nivel_grado,
                    ubicacion,
                    valor_original,
                    orden,
                    int(bloque_id),
                ),
            )
            return bloque_id
        else:
            if _USE_PG:
                cur = con.execute(
                    """INSERT INTO horario_docente
                       (nombre_hoja, dia_semana, hora_inicio, hora_fin, tipo_bloque,
                        materia, nivel_grado, ubicacion, valor_original, orden)
                       VALUES (?,?,?,?,?,?,?,?,?,?) RETURNING id""",
                    (
                        nh,
                        ds,
                        hi,
                        hf,
                        tb,
                        materia,
                        nivel_grado,
                        ubicacion,
                        valor_original,
                        orden,
                    ),
                )
                return cur.lastrowid
            else:
                con.execute(
                    """INSERT INTO horario_docente
                       (nombre_hoja, dia_semana, hora_inicio, hora_fin, tipo_bloque,
                        materia, nivel_grado, ubicacion, valor_original, orden)
                       VALUES (?,?,?,?,?,?,?,?,?,?)""",
                    (
                        nh,
                        ds,
                        hi,
                        hf,
                        tb,
                        materia,
                        nivel_grado,
                        ubicacion,
                        valor_original,
                        orden,
                    ),
                )
                return con.execute("SELECT last_insert_rowid()").lastrowid


def eliminar_bloque_horario_manual(bloque_id: int):
    with _conn() as con:
        con.execute("DELETE FROM horario_docente WHERE id=?", (int(bloque_id),))


def guardar_vigilancia_manual(nombre_hoja: str, ubicacion: str):
    nh = str(nombre_hoja or "").upper().strip()
    ub = str(ubicacion or "").strip()
    with _conn() as con:
        con.execute("DELETE FROM vigilancias_recreo WHERE nombre_hoja=?", (nh,))
        con.execute(
            "INSERT INTO vigilancias_recreo (nombre_hoja, ubicacion) VALUES (?, ?)",
            (nh, ub),
        )


def eliminar_vigilancia_manual(nombre_hoja: str):
    with _conn() as con:
        con.execute(
            "DELETE FROM vigilancias_recreo WHERE nombre_hoja=?",
            (str(nombre_hoja or "").upper().strip(),),
        )


def reemplazar_horario_docente_manual(nombre_hoja: str, filas: list[dict]):
    """Reemplaza todos los bloques de un docente con una lista ordenada (editor inline)."""
    nh = str(nombre_hoja or "").upper().strip()
    with _conn() as con:
        con.execute("DELETE FROM horario_docente WHERE nombre_hoja=?", (nh,))
        for i, f in enumerate(filas, 1):
            con.execute(
                """INSERT INTO horario_docente
                   (nombre_hoja, dia_semana, hora_inicio, hora_fin, tipo_bloque,
                    materia, nivel_grado, ubicacion, valor_original, orden)
                   VALUES (?,?,?,?,?,?,?,?,?,?)""",
                (
                    nh,
                    str(f.get("dia_semana") or "").lower().strip(),
                    str(f.get("hora_inicio") or "").strip(),
                    str(f.get("hora_fin") or "").strip(),
                    str(f.get("tipo_bloque") or "").strip(),
                    (str(f.get("materia") or "").strip() or None),
                    (str(f.get("nivel_grado") or "").strip() or None),
                    (str(f.get("ubicacion") or "").strip() or None),
                    (str(f.get("valor_original") or "").strip() or None),
                    int(f.get("orden") or i),
                ),
            )


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
    k = f"{bloque.get('dia_semana', '')}|{bloque.get('hora_inicio', '')}|{bloque.get('tipo_bloque', '')}"
    if bloque.get("tipo_bloque") == "vigilancia_recreo":
        extra = (
            str(bloque.get("ubicacion") or bloque.get("valor_original") or "")
            .strip()
            .upper()
        )
        if extra:
            k += f"|{extra}"
    return k


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


# ── Initialize DB on import ───────────────────────────────────────────────────
init_db()
