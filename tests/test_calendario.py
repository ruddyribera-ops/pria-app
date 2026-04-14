"""
test_calendario.py — Calendar, commissions, vigilancias tests.
"""

import pytest


class TestCalendarioEscolar:
    def test_guardar_eventos_calendario(self, db):
        db.guardar_eventos_calendario(
            [
                {
                    "fecha": "2026-04-15",
                    "nombre_evento": "Dia del Estudiante",
                    "descripcion": "Sin clases",
                    "responsable": "Direccion",
                    "tipo": "feriado",
                },
            ]
        )
        eventos = db.get_eventos_fecha("2026-04-15")
        assert len(eventos) == 1
        assert eventos[0]["nombre_evento"] == "Dia del Estudiante"

    def test_guardar_eventos_calendario_replaces(self, db):
        db.guardar_eventos_calendario(
            [
                {
                    "fecha": "2026-04-15",
                    "nombre_evento": "Evento A",
                    "descripcion": "Desc A",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
            ]
        )
        db.guardar_eventos_calendario(
            [
                {
                    "fecha": "2026-04-15",
                    "nombre_evento": "Evento B",
                    "descripcion": "Desc B",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
                {
                    "fecha": "2026-04-15",
                    "nombre_evento": "Evento C",
                    "descripcion": "Desc C",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
            ]
        )
        eventos = db.get_eventos_fecha("2026-04-15")
        assert len(eventos) == 2

    def test_get_eventos_rango(self, db):
        db.guardar_eventos_calendario(
            [
                {
                    "fecha": "2026-04-10",
                    "nombre_evento": "Evento inicio",
                    "descripcion": "",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
                {
                    "fecha": "2026-04-15",
                    "nombre_evento": "Evento medio",
                    "descripcion": "",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
                {
                    "fecha": "2026-04-20",
                    "nombre_evento": "Evento fin",
                    "descripcion": "",
                    "responsable": "Admin",
                    "tipo": "otro",
                },
            ]
        )
        eventos = db.get_eventos_rango("2026-04-12", "2026-04-17")
        assert len(eventos) == 1
        assert eventos[0]["nombre_evento"] == "Evento medio"


class TestActividadesCronograma:
    def test_guardar_actividades_cronograma(self, db):
        db.guardar_actividades_cronograma(
            [
                {
                    "fecha": "2026-04-15",
                    "hora_inicio": "08:00",
                    "hora_fin": "10:00",
                    "actividad": "Capacitación",
                    "a_cargo_de": "Docentes de Lenguaje",
                },
            ]
        )
        acts = db.get_actividades_fecha("2026-04-15")
        assert len(acts) == 1
        assert acts[0]["actividad"] == "Capacitación"

    def test_get_actividades_fecha_filtra_por_responsable(self, db):
        db.guardar_actividades_cronograma(
            [
                {
                    "fecha": "2026-04-15",
                    "hora_inicio": "08:00",
                    "hora_fin": "10:00",
                    "actividad": "Act 1",
                    "a_cargo_de": "RUDDY",
                },
                {
                    "fecha": "2026-04-15",
                    "hora_inicio": "10:00",
                    "hora_fin": "11:00",
                    "actividad": "Act 2",
                    "a_cargo_de": "OTRO",
                },
            ]
        )
        acts_ruddy = db.get_actividades_fecha("2026-04-15", "RUDDY")
        assert len(acts_ruddy) == 1
        assert acts_ruddy[0]["actividad"] == "Act 1"

    def test_get_actividades_fecha_filtra_todos(self, db):
        db.guardar_actividades_cronograma(
            [
                {
                    "fecha": "2026-04-15",
                    "hora_inicio": "08:00",
                    "hora_fin": "10:00",
                    "actividad": "Act 1",
                    "a_cargo_de": "DOCENTES",
                },
            ]
        )
        acts = db.get_actividades_fecha("2026-04-15", "RUDDY")
        assert len(acts) == 1


class TestVigilanciasRecreo:
    def test_guardar_vigilancias(self, db):
        db.guardar_vigilancias(
            [
                {"nombre_hoja": "RUDDY", "ubicacion": "Patio Principal"},
                {"nombre_hoja": "OTRO", "ubicacion": "Área Primaria"},
            ]
        )
        vig = db.get_vigilancias()
        assert vig["RUDDY"] == "Patio Principal"
        assert vig["OTRO"] == "Área Primaria"

    def test_guardar_vigilancias_replaces(self, db):
        db.guardar_vigilancias(
            [
                {"nombre_hoja": "RUDDY", "ubicacion": "Patio Anterior"},
            ]
        )
        db.guardar_vigilancias(
            [
                {"nombre_hoja": "RUDDY", "ubicacion": "Nuevo Patio"},
            ]
        )
        vig = db.get_vigilancias()
        assert vig["RUDDY"] == "Nuevo Patio"

    def test_guardar_vigilancia_manual(self, db):
        db.guardar_vigilancia_manual("RUDDY", "Área Secundaria")
        vig = db.get_vigilancias()
        assert vig["RUDDY"] == "Área Secundaria"

    def test_eliminar_vigilancia_manual(self, db):
        db.guardar_vigilancia_manual("RUDDY", "Patio")
        db.eliminar_vigilancia_manual("RUDDY")
        vig = db.get_vigilancias()
        assert "RUDDY" not in vig


class TestComisionesDocente:
    def test_guardar_comisiones(self, db):
        db.guardar_comisiones(
            [
                {
                    "nombre_docente": "Ruddy Ribera",
                    "nombre_hoja": "RUDDY",
                    "comision": "Comisión de Evaluación",
                    "funciones": "Revisar rúbricas",
                },
            ]
        )
        comisiones = db.get_comisiones_docente("RUDDY")
        assert len(comisiones) == 1
        assert comisiones[0]["comision"] == "Comisión de Evaluación"

    def test_get_all_comisiones(self, db):
        db.guardar_comisiones(
            [
                {
                    "nombre_docente": "Ruddy",
                    "nombre_hoja": "RUDDY",
                    "comision": "Comisión A",
                    "funciones": "",
                },
                {
                    "nombre_docente": "Otro",
                    "nombre_hoja": "OTRO",
                    "comision": "Comisión A",
                    "funciones": "",
                },
            ]
        )
        all_c = db.get_all_comisiones()
        assert len(all_c) == 2

    def test_get_comisiones_docente_case_insensitive(self, db):
        db.guardar_comisiones(
            [
                {
                    "nombre_docente": "Ruddy",
                    "nombre_hoja": "RUDDY",
                    "comision": "Test",
                    "funciones": "",
                },
            ]
        )
        assert len(db.get_comisiones_docente("ruddy")) == 1
        assert len(db.get_comisiones_docente("Ruddy")) == 1
