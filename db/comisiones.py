"""
db/comisiones.py — Teacher commissions and recess surveillance
===============================================================
"""

from ._base import _conn


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


def get_comisiones_docente(nombre_hoja: str) -> list[dict]:
    with _conn() as con:
        return [
            dict(r)
            for r in con.execute(
                "SELECT * FROM comisiones_docente WHERE nombre_hoja=?",
                (nombre_hoja.upper(),),
            ).fetchall()
        ]


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
