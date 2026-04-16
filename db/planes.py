"""
db/planes.py — Plan buffer management
======================================
"""

import json
from ._base import _conn


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
