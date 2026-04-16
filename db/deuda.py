"""
db/deuda.py — Academic debt (deuda) tracking and reporting
===========================================================
"""

from ._base import _conn, _ph
from .sesiones import get_micro_objetivos


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
