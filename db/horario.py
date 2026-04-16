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
    _nh = str(nombre_hoja or "").upper().strip()
    _dia = str(dia_semana or "").lower().strip()

    # Official recess times
    RECESO_TIMES = {
        "primaria": [("10:10", "10:30"), ("12:00", "12:15")],
        "secundaria": [("09:25", "10:10"), ("11:15", "12:00")],
    }

    def _strip_accents(s: str) -> str:
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
