"""
db_pria.py — Gestor de Estado y Persistencia del Bucle Activo de PRIA
======================================================================
Tablas originales:
  sesiones        — Cada bloque de clase registrado
  micro_objetivos — Objetivos extraídos por Motor_MicroObjetivos, con estado
  planes_buffer   — Planes de amortiguación generados por Motor_Recalibracion

Tablas nuevas (Sistema Diario):
  usuarios            — Cuentas por docente (email + password hash + rol)
  horario_docente     — Horario semanal parseado del Excel oficial
  calendario_escolar  — Eventos del calendario interno LPS
  actividades_cronograma — Actividades del cronograma semanal docente
  comisiones_docente  — Asignaciones de comisiones por docente
  bloques_diario_log  — Estado (completado/pendiente) de cada bloque del día
"""

import sqlite3
import os
import json
import hashlib
import secrets
from datetime import datetime, date

# ── Ruta de la base de datos (junto al app_ui.py) ─────────────────────────────
DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pria_estado.db")


def _conn() -> sqlite3.Connection:
    """Abre conexión con foreign keys activas."""
    con = sqlite3.connect(DB_PATH, check_same_thread=False)
    con.execute("PRAGMA foreign_keys = ON")
    con.row_factory = sqlite3.Row
    return con


def init_db():
    """Crea las tablas si no existen. Idempotente."""
    with _conn() as con:
        con.executescript("""
        -- ── USUARIOS ─────────────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS usuarios (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            email         TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            nombre        TEXT NOT NULL,
            nombre_hoja   TEXT NOT NULL,   -- coincide con la hoja del Excel (ej. "RUDDY")
            rol           TEXT DEFAULT 'docente',  -- 'admin' | 'docente'
            activo        INTEGER DEFAULT 1,
            creado_en     TEXT DEFAULT (datetime('now','localtime'))
        );

        -- ── HORARIO DOCENTE ───────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS horario_docente (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_hoja   TEXT NOT NULL,
            dia_semana    TEXT NOT NULL,   -- 'lunes' … 'viernes'
            hora_inicio   TEXT NOT NULL,   -- 'HH:MM'
            hora_fin      TEXT,
            tipo_bloque   TEXT NOT NULL,   -- 'clase'|'vigilancia_recreo'|'atencion_ppff'|'planificacion'|'ingreso'
            materia       TEXT,
            nivel_grado   TEXT,            -- '5P', '2S', etc.
            ubicacion     TEXT,            -- para vigilancia: 'Área Primaria' | 'Área Secundaria'
            valor_original TEXT
        );

        -- ── CALENDARIO ESCOLAR ────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS calendario_escolar (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha         TEXT NOT NULL,   -- 'YYYY-MM-DD'
            nombre_evento TEXT NOT NULL,
            descripcion   TEXT,
            responsable   TEXT,
            tipo          TEXT             -- 'feriado'|'acto_civico'|'institucional'|'curricular'
        );

        -- ── ACTIVIDADES CRONOGRAMA ────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS actividades_cronograma (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha         TEXT NOT NULL,
            hora_inicio   TEXT,
            hora_fin      TEXT,
            actividad     TEXT NOT NULL,
            a_cargo_de    TEXT
        );

        -- ── COMISIONES DOCENTE ────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS comisiones_docente (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            nombre_docente TEXT NOT NULL,
            nombre_hoja   TEXT NOT NULL,
            comision      TEXT NOT NULL,
            funciones     TEXT
        );

        -- ── LOG DE BLOQUES DIARIOS ────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS bloques_diario_log (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha         TEXT NOT NULL,        -- 'YYYY-MM-DD'
            nombre_hoja   TEXT NOT NULL,
            bloque_key    TEXT NOT NULL,        -- 'dia_semana|hora_inicio|tipo' para identificar unívocamente
            completado    INTEGER DEFAULT 0,
            cerrado       INTEGER DEFAULT 0,    -- 1 = bloque cerrado/bloqueado por docente
            notas         TEXT,
            UNIQUE(fecha, nombre_hoja, bloque_key)
        );

        -- ── TABLAS ORIGINALES ─────────────────────────────────────────────────
        CREATE TABLE IF NOT EXISTS sesiones (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            fecha       TEXT NOT NULL,
            semana      INTEGER NOT NULL,
            hora_inicio TEXT,
            hora_fin    TEXT,
            materia     TEXT NOT NULL,
            grado       TEXT NOT NULL,
            tema        TEXT NOT NULL,
            creado_en   TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS micro_objetivos (
            id           INTEGER PRIMARY KEY AUTOINCREMENT,
            sesion_id    INTEGER NOT NULL REFERENCES sesiones(id) ON DELETE CASCADE,
            texto        TEXT NOT NULL,
            completado   INTEGER NOT NULL DEFAULT 0,   -- 0 = pendiente, 1 = completado
            depende_de   INTEGER,                      -- ID interno del objetivo padre
            prioridad    TEXT DEFAULT 'normal',
            origen_semana INTEGER,
            creado_en    TEXT DEFAULT (datetime('now','localtime'))
        );

        CREATE TABLE IF NOT EXISTS planes_buffer (
            id               INTEGER PRIMARY KEY AUTOINCREMENT,
            semana_buffer    INTEGER NOT NULL,
            materia          TEXT NOT NULL,
            grado            TEXT NOT NULL,
            contenido_json   TEXT NOT NULL,            -- JSON completo de Motor_Recalibracion
            resumen          TEXT,
            alerta_condensacion INTEGER DEFAULT 0,
            creado_en        TEXT DEFAULT (datetime('now','localtime'))
        );
        """)
    # ── Migrations for existing databases ─────────────────────────────────────
    with _conn() as con:
        for _sql in [
            "ALTER TABLE bloques_diario_log ADD COLUMN cerrado INTEGER DEFAULT 0",
        ]:
            try:
                con.execute(_sql)
            except Exception:
                pass  # column already exists


# ═══════════════════════════════════════════════════════════════════════════════
# SESIONES
# ═══════════════════════════════════════════════════════════════════════════════

def crear_sesion(semana: int, materia: str, grado: str, tema: str,
                 hora_inicio: str = "", hora_fin: str = "",
                 fecha: str = None) -> int:
    """Registra una sesión de clase. Devuelve el ID creado."""
    fecha = fecha or date.today().isoformat()
    with _conn() as con:
        cur = con.execute(
            """INSERT INTO sesiones (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
               VALUES (?, ?, ?, ?, ?, ?, ?)""",
            (fecha, semana, hora_inicio, hora_fin, materia, grado, tema)
        )
        return cur.lastrowid


def get_sesiones(materia: str = None, semana: int = None) -> list[dict]:
    """Devuelve sesiones filtradas por materia y/o semana."""
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
    """
    Inserta los micro-objetivos de una sesión.
    'objetivos' es la lista extraída por Motor_MicroObjetivos (campo micro_objetivos del JSON).
    """
    with _conn() as con:
        # Limpiar objetivos previos de esta sesión (idempotente)
        con.execute("DELETE FROM micro_objetivos WHERE sesion_id = ?", (sesion_id,))
        for obj in objetivos:
            con.execute(
                """INSERT INTO micro_objetivos
                   (sesion_id, texto, depende_de, origen_semana)
                   VALUES (?, ?, ?, ?)""",
                (sesion_id, obj["texto"], obj.get("depende_de"), origen_semana)
            )


def get_micro_objetivos(sesion_id: int) -> list[dict]:
    """Devuelve todos los micro-objetivos de una sesión."""
    with _conn() as con:
        return [dict(r) for r in con.execute(
            "SELECT * FROM micro_objetivos WHERE sesion_id = ? ORDER BY id",
            (sesion_id,)
        ).fetchall()]


def marcar_objetivo(objetivo_id: int, completado: bool):
    """Marca o desmarca un micro-objetivo."""
    with _conn() as con:
        con.execute(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            (1 if completado else 0, objetivo_id)
        )


def marcar_multiples(objetivo_ids: list[int], completado: bool):
    """Actualización masiva de objetivos."""
    with _conn() as con:
        con.executemany(
            "UPDATE micro_objetivos SET completado = ? WHERE id = ?",
            [(1 if completado else 0, oid) for oid in objetivo_ids]
        )


# ═══════════════════════════════════════════════════════════════════════════════
# DEUDA ACADÉMICA — El Delta
# ═══════════════════════════════════════════════════════════════════════════════

def get_deuda_academica(materia: str = None, semana_hasta: int = None) -> list[dict]:
    """
    Devuelve SOLO los objetivos NO completados (la deuda).
    Este es el "delta" que se envía a Motor_Recalibracion — NO el plan completo.
    Optimiza el costo de tokens de la API.
    """
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
    """
    Devuelve objetivos cuyo padre (depende_de) está en la deuda.
    Estos son los más críticos — bloquean el avance curricular.
    """
    deuda_ids = {d["id"] for d in get_deuda_academica(materia)}
    if not deuda_ids:
        return []
    with _conn() as con:
        placeholders = ",".join("?" * len(deuda_ids))
        query = f"""
            SELECT mo.*, s.materia, s.tema, s.semana
            FROM micro_objetivos mo
            JOIN sesiones s ON mo.sesion_id = s.id
            WHERE mo.depende_de IN ({placeholders})
            AND mo.completado = 0
        """
        return [dict(r) for r in con.execute(query, list(deuda_ids)).fetchall()]


def get_resumen_deuda(materia: str = None) -> dict:
    """Estadísticas rápidas de la deuda para el dashboard."""
    deuda = get_deuda_academica(materia)
    bloqueados = get_dependencias_bloqueadas(materia)
    materias_afectadas = list({d["materia"] for d in deuda})
    semanas_afectadas = sorted({d["semana"] for d in deuda})
    return {
        "total_pendientes": len(deuda),
        "bloqueados_criticos": len(bloqueados),
        "materias_afectadas": materias_afectadas,
        "semanas_afectadas": semanas_afectadas,
        "deuda_detalle": deuda,
        "bloqueados_detalle": bloqueados,
    }


# ═══════════════════════════════════════════════════════════════════════════════
# PLANES BUFFER
# ═══════════════════════════════════════════════════════════════════════════════

def guardar_plan_buffer(semana_buffer: int, materia: str, grado: str,
                        contenido_json: dict) -> int:
    """Persiste el plan de amortiguación generado por Motor_Recalibracion."""
    resumen = contenido_json.get("resumen_ejecutivo", "")
    alerta = 1 if contenido_json.get("alerta_condensacion") else 0
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
    """Devuelve todos los planes buffer, con el JSON ya parseado."""
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
# ALERTAS DE TIEMPO — base para notificaciones en-app
# ═══════════════════════════════════════════════════════════════════════════════

def minutos_para_fin_clase(hora_fin_str: str) -> int | None:
    """
    Calcula cuántos minutos faltan para que termine una clase.
    hora_fin_str: "HH:MM" o "HH:MM - HH:MM"
    Devuelve None si no se puede parsear.
    """
    try:
        # Soporta formatos "14:30" y "13:45 - 14:30"
        parte = hora_fin_str.strip().split("-")[-1].strip()
        ahora = datetime.now()
        fin = datetime.strptime(parte, "%H:%M").replace(
            year=ahora.year, month=ahora.month, day=ahora.day
        )
        delta = (fin - ahora).total_seconds() / 60
        return int(delta)
    except Exception:
        return None


# ═══════════════════════════════════════════════════════════════════════════════
# USUARIOS / AUTH
# ═══════════════════════════════════════════════════════════════════════════════

def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def crear_usuario(email: str, password: str, nombre: str,
                  nombre_hoja: str, rol: str = "docente") -> bool:
    """Crea un usuario. Devuelve True si OK, False si el email ya existe."""
    try:
        with _conn() as con:
            con.execute(
                "INSERT INTO usuarios (email, password_hash, nombre, nombre_hoja, rol) VALUES (?,?,?,?,?)",
                (email.lower().strip(), _hash_password(password), nombre, nombre_hoja.upper().strip(), rol)
            )
        return True
    except sqlite3.IntegrityError:
        return False


def verificar_login(email: str, password: str) -> dict | None:
    """Verifica credenciales. Devuelve el dict del usuario o None."""
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
    """Reemplaza todo el horario con los registros parseados del Excel."""
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
    """Devuelve los bloques de un docente para un día, ordenados por hora."""
    with _conn() as con:
        return [dict(r) for r in con.execute(
            """SELECT * FROM horario_docente
               WHERE nombre_hoja=? AND dia_semana=?
               ORDER BY hora_inicio ASC""",
            (nombre_hoja.upper(), dia_semana.lower())
        ).fetchall()]


def get_all_hojas() -> list[str]:
    """Devuelve los nombres de hoja únicos en el horario (lista de docentes)."""
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
    """Devuelve eventos del calendario para una fecha ISO dada."""
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
    """
    Devuelve actividades del cronograma para una fecha.
    Si nombre_hoja se pasa, filtra por actividades donde a_cargo_de
    menciona al docente, a 'TUTORES', o es general ('DOCENTES', etc.).
    """
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
# BLOQUES DIARIO LOG — estado completado/pendiente por día
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
    """Cierra (bloquea) un bloque: lo marca completado + cerrado y guarda notas."""
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
    """Devuelve {bloque_key: {completado, cerrado, notas}} para el día dado."""
    with _conn() as con:
        rows = con.execute(
            "SELECT * FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper())
        ).fetchall()
    return {r["bloque_key"]: dict(r) for r in rows}


# ═══════════════════════════════════════════════════════════════════════════════
# TOP-DOWN SYNC — WeeklyPlan → Daily tracker objective injection
# ═══════════════════════════════════════════════════════════════════════════════

def get_objetivos_semana_materia(semana: int, materia: str, grado: str) -> list[dict]:
    """
    Devuelve objetivos de cualquier sesión ya registrada en esta semana
    para la misma materia+grado. Usado para inyectar automáticamente el
    plan semanal del administrador en el tracker diario del docente.
    """
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
# HELPER — sesión diaria automática para bloques de clase
# ═══════════════════════════════════════════════════════════════════════════════

def reset_dia_docente(fecha: str, nombre_hoja: str):
    """Elimina todos los logs del día para un docente (acción admin)."""
    with _conn() as con:
        con.execute(
            "DELETE FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper())
        )


def get_or_create_sesion_diaria(fecha: str, semana: int, materia: str,
                                 grado: str, hora_inicio: str, hora_fin: str) -> int:
    """
    Busca una sesión ya existente para esta clase en esta fecha.
    Si no existe, la crea automáticamente y devuelve el ID.
    """
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


# Inicializar la BD al importar el módulo
init_db()
