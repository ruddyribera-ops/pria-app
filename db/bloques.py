"""
db/bloques.py — Daily block log management
==========================================
"""

from ._base import _conn


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


def reset_dia_docente(fecha: str, nombre_hoja: str):
    with _conn() as con:
        con.execute(
            "DELETE FROM bloques_diario_log WHERE fecha=? AND nombre_hoja=?",
            (fecha, nombre_hoja.upper()),
        )
