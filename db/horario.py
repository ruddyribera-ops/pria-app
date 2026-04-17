"""
db/horario.py — Schedule management for teachers
================================================
"""

import re, unicodedata
from ._base import _conn, _USE_PG


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
    """
    Get blocks for a teacher on a given day, with vigilancias injected
    from the normalized vigilancia_asignacion table (Phase 5 simplification).
    Falls back to fuzzy name matching if exact name lookup returns nothing.
    """
    _nh = str(nombre_hoja or "").upper().strip()
    _dia = str(dia_semana or "").lower().strip()

    RECESO_TIMES = {
        "primaria": [("10:10", "10:30"), ("12:00", "12:15")],
        "secundaria": [("09:25", "10:10"), ("11:15", "12:00")],
    }

    with _conn() as con:
        # Core blocks from horario_docente
        rows = [
            dict(r)
            for r in con.execute(
                """SELECT * FROM horario_docente
                   WHERE nombre_hoja=? AND dia_semana=?
                   ORDER BY COALESCE(orden, 99999) ASC, hora_inicio ASC, id ASC""",
                (_nh, _dia),
            ).fetchall()
        ]

        # Inject vigilancias from normalized table (Phase 5 — replaces old regex logic)
        vig_rows = con.execute(
            """SELECT * FROM vigilancia_asignacion
               WHERE UPPER(nombre_hoja)=? AND LOWER(dia_semana)=?""",
            (_nh, _dia),
        ).fetchall()

        if rows and vig_rows:
            # Determine nivel from schedule (Primaria starts < 08:30)
            has_primaria = any(
                r["hora_inicio"] and r["hora_inicio"] < "08:30" for r in rows
            )
            nivel = "primaria" if has_primaria else "secundaria"

            for vr in vig_rows:
                if vr["nivel"].lower() != nivel:
                    continue
                recreo_num = str(vr["recreo_num"] or "1")
                # Match to correct time slot
                for r_ini, r_fin in RECESO_TIMES[nivel]:
                    slot_num = "1" if float(r_ini.replace(":", ".")) < 11.0 else "2"
                    if slot_num != recreo_num:
                        continue
                    # Only inject if not already in rows (avoid duplicates)
                    already = any(
                        r.get("tipo_bloque") == "vigilancia_recreo"
                        and r.get("ubicacion") == vr["zona"]
                        and r.get("hora_inicio") == vr["hora_inicio"]
                        for r in rows
                    )
                    if already:
                        continue
                    rows.append(
                        {
                            "id": None,
                            "nombre_hoja": _nh,
                            "dia_semana": _dia,
                            "hora_inicio": vr["hora_inicio"] or r_ini,
                            "hora_fin": vr["hora_fin"] or r_fin,
                            "tipo_bloque": "vigilancia_recreo",
                            "materia": None,
                            "nivel_grado": nivel.title(),
                            "ubicacion": vr["zona"],
                            "valor_original": f"recreo - {vr['zona']}",
                            "orden": 0,
                        }
                    )
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


def guardar_vigilancia_asignaciones(asignaciones: list[dict]):
    """
    Replace all vigilancia_asignacion records with a new set from parsed PDF.
    Each dict: nombre_hoja, nivel, dia_semana, recreo_num, zona, hora_inicio, hora_fin, nota
    """
    with _conn() as con:
        con.execute("DELETE FROM vigilancia_asignacion")
        for a in asignaciones:
            con.execute(
                """INSERT OR REPLACE INTO vigilancia_asignacion
                   (nombre_hoja, nivel, dia_semana, recreo_num, zona,
                    hora_inicio, hora_fin, nota, fuente)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    str(a.get("nombre_hoja") or "").upper().strip(),
                    str(a.get("nivel") or "").lower().strip(),
                    str(a.get("dia_semana") or "").lower().strip(),
                    str(a.get("recreo_num") or "1").strip(),
                    str(a.get("zona") or "").strip(),
                    str(a.get("hora_inicio") or "").strip(),
                    str(a.get("hora_fin") or "").strip(),
                    str(a.get("nota") or "").strip(),
                    "pdf",
                ),
            )


def get_vigilancia_asignaciones(nombre_hoja: str = None) -> list[dict]:
    """
    Get vigilancia_asignacion records, optionally filtered by teacher.
    Returns normalized records ready for daily view injection.
    """
    with _conn() as con:
        if nombre_hoja:
            nh = str(nombre_hoja or "").upper().strip()
            rows = con.execute(
                """SELECT * FROM vigilancia_asignacion
                   WHERE UPPER(nombre_hoja)=?""",
                (nh,),
            ).fetchall()
        else:
            rows = con.execute("SELECT * FROM vigilancia_asignacion").fetchall()
        return [dict(r) for r in rows]


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
