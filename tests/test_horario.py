"""
test_horario.py — Schedule management tests.
"""

import pytest


def _bloque(
    nh="RUDDY",
    dia="lunes",
    hi="07:55",
    hf="08:40",
    tb="clase",
    mat="Lenguaje",
    ng="5to Sec",
    ub="Aula 1",
    vo="Test",
):
    return dict(
        nombre_hoja=nh,
        dia_semana=dia,
        hora_inicio=hi,
        hora_fin=hf,
        tipo_bloque=tb,
        materia=mat,
        nivel_grado=ng,
        ubicacion=ub,
        valor_original=vo,
    )


class TestHorarioCRUD:
    def test_guardar_horario_docente(self, db):
        db.guardar_horario_docente([_bloque(hi="07:55"), _bloque(hi="08:40")])
        rows = db.get_horario_docente_completo("RUDDY")
        assert len(rows) == 2

    def test_guardar_horario_docente_replaces(self, db):
        db.guardar_horario_docente([_bloque(hi="07:55")])
        db.guardar_horario_docente([_bloque(hi="07:55"), _bloque(hi="08:40")])
        rows = db.get_horario_docente_completo("RUDDY")
        assert len(rows) == 2

    def test_get_horario_dia_basic(self, db):
        db.guardar_horario_docente([_bloque(dia="martes"), _bloque(dia="miercoles")])
        rows = db.get_horario_dia("RUDDY", "martes")
        assert len(rows) == 1

    def test_get_horario_dia_case_insensitive(self, db):
        db.guardar_horario_docente([_bloque()])
        rows = db.get_horario_dia("ruddy", "LUNES")
        assert len(rows) == 1

    def test_get_all_hojas(self, db):
        db.guardar_horario_docente([_bloque(nh="RUDDY"), _bloque(nh="OTRO")])
        hojas = db.get_all_hojas()
        assert "RUDDY" in hojas
        assert "OTRO" in hojas


class TestHorarioManual:
    def test_guardar_bloque_horario_manual_insert(self, db):
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "09:30", "10:15", "clase", "Lenguaje", "5to Sec"
        )
        rows = db.get_horario_docente_completo("RUDDY")
        assert len(rows) == 1
        assert rows[0]["materia"] == "Lenguaje"

    def test_guardar_bloque_horario_manual_update(self, db):
        bid = db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "09:30", "10:15", "clase", "Lenguaje"
        )
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "09:30", "10:15", "clase", "Matematica", bloque_id=bid
        )
        rows = db.get_horario_docente_completo("RUDDY")
        mats = [r["materia"] for r in rows]
        assert "Matematica" in mats

    def test_eliminar_bloque_horario_manual(self, db):
        bid = db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "09:30", "10:15", "clase", "Lenguaje"
        )
        db.eliminar_bloque_horario_manual(bid)
        rows = db.get_horario_docente_completo("RUDDY")
        assert len(rows) == 0

    def test_reemplazar_horario_docente_manual(self, db):
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "07:55", "08:40", "clase", "Lenguaje"
        )
        db.reemplazar_horario_docente_manual(
            "RUDDY",
            [
                _bloque(dia="martes", hi="07:55", mat="Ciencias"),
                _bloque(dia="martes", hi="08:40", mat="Ciencias"),
            ],
        )
        rows = db.get_horario_docente_completo("RUDDY")
        mats = [r["materia"] for r in rows]
        assert "Ciencias" in mats


class TestHorarioOrder:
    def test_get_horario_docente_completo_ordered_by_day(self, db):
        for dia in ["viernes", "lunes", "miercoles", "martes"]:
            db.guardar_bloque_horario_manual(
                "RUDDY", dia, "07:55", "08:40", "clase", f"Materia-{dia}"
            )
        rows = db.get_horario_docente_completo("RUDDY")
        dias_ordenados = [r["dia_semana"] for r in rows]
        assert dias_ordenados == ["lunes", "martes", "miercoles", "viernes"]

    def test_get_horario_docente_completo_respects_orden_field(self, db):
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "07:55", "08:40", "clase", orden=3
        )
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "09:30", "10:15", "clase", orden=1
        )
        db.guardar_bloque_horario_manual(
            "RUDDY", "lunes", "10:30", "11:15", "clase", orden=2
        )
        rows = db.get_horario_docente_completo("RUDDY")
        assert len(rows) == 3
