"""
db/calendario.py — Calendar and activity schedule management
=============================================================
"""

from ._base import _conn


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
