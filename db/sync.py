"""
db/sync.py — Top-down sync: WeeklyPlan → Daily tracker
=======================================================
"""

import re, unicodedata
from ._base import _conn


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
