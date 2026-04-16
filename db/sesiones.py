"""
db/sesiones.py — Session and micro-objective management
========================================================
"""

from datetime import date
from ._base import _conn


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


# ── Micro-objetivos ────────────────────────────────────────────────────────────


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
