"""
test_bloques.py — Daily block tracking (Sistema Diario) tests.
"""

import pytest


class TestBloqueKey:
    def test_bloque_key_basic(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        key = db._bloque_key(bloque)
        assert key == "lunes|07:55|clase"

    def test_bloque_key_vigilancia_recreo_adds_ubicacion(self, db):
        bloque = {
            "dia_semana": "lunes",
            "hora_inicio": "10:00",
            "tipo_bloque": "vigilancia_recreo",
            "ubicacion": "Patio Principal",
        }
        key = db._bloque_key(bloque)
        assert "vigilancia_recreo" in key
        assert "PATIO PRINCIPAL" in key

    def test_bloque_key_vigilancia_uses_valor_original(self, db):
        bloque = {
            "dia_semana": "lunes",
            "hora_inicio": "10:00",
            "tipo_bloque": "vigilancia_recreo",
            "valor_original": "Vigilancia Area Secundaria",
        }
        key = db._bloque_key(bloque)
        assert "AREA SECUNDARIA" in key


class TestMarcarBloqueDiario:
    def test_marcar_bloque_creates_log(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque, True, "Notas de prueba")
        log = db.get_bloque_log("2026-04-07", "RUDDY", bloque)
        assert log is not None
        assert log["completado"] == 1
        assert log["notas"] == "Notas de prueba"

    def test_marcar_bloque_updates_existing(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque, False)
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque, True, "Completado")
        log = db.get_bloque_log("2026-04-07", "RUDDY", bloque)
        assert log["completado"] == 1
        assert log["notas"] == "Completado"

    def test_marcar_bloque_nombre_normalizado(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.marcar_bloque_diario("2026-04-07", "ruddy", bloque, True)
        log = db.get_bloque_log("2026-04-07", "RUDDY", bloque)
        assert log is not None

    def test_get_logs_dia(self, db):
        bloque1 = {
            "dia_semana": "lunes",
            "hora_inicio": "07:55",
            "tipo_bloque": "clase",
        }
        bloque2 = {
            "dia_semana": "lunes",
            "hora_inicio": "08:40",
            "tipo_bloque": "clase",
        }
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque1, True)
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque2, False)
        logs = db.get_logs_dia("2026-04-07", "RUDDY")
        assert len(logs) == 2


class TestCerrarReabrirBloque:
    def test_cerrar_bloque_sets_cerrado(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.cerrar_bloque("2026-04-07", "RUDDY", bloque, "Notas de cierre")
        log = db.get_bloque_log("2026-04-07", "RUDDY", bloque)
        assert log["cerrado"] == 1
        assert log["completado"] == 1
        assert log["notas"] == "Notas de cierre"

    def test_reabrir_bloque_resets_state(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque, True)
        db.cerrar_bloque("2026-04-07", "RUDDY", bloque)
        db.reabrir_bloque("2026-04-07", "RUDDY", bloque)
        log = db.get_bloque_log("2026-04-07", "RUDDY", bloque)
        assert log["cerrado"] == 0
        assert log["completado"] == 0


class TestResetDia:
    def test_reset_dia_docente(self, db):
        bloque = {"dia_semana": "lunes", "hora_inicio": "07:55", "tipo_bloque": "clase"}
        db.marcar_bloque_diario("2026-04-07", "RUDDY", bloque, True)
        db.reset_dia_docente("2026-04-07", "RUDDY")
        logs = db.get_logs_dia("2026-04-07", "RUDDY")
        assert len(logs) == 0
