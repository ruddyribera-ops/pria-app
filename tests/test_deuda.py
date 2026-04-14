"""
test_deuda.py — Academic debt & micro-objetivos tests.
"""

import pytest


@pytest.fixture
def sesion_con_objetivos(db):
    sid = db.crear_sesion(
        semana=10, materia="Lenguaje", grado="5to Sec", tema="Los determinantes"
    )
    db.guardar_micro_objetivos(
        sid,
        [
            {"texto": "Identificar determinantes", "depende_de": None},
            {"texto": "Clasificar determinantes", "depende_de": None},
            {"texto": "Redactar oraciones", "depende_de": None},
        ],
        origen_semana=10,
    )
    return sid


class TestSesiones:
    def test_crear_sesion_returns_id(self, db):
        sid = db.crear_sesion(
            semana=1, materia="Lenguaje", grado="5to Sec", tema="Prueba"
        )
        assert isinstance(sid, int)

    def test_crear_sesion_today_default(self, db):
        from datetime import date

        sid = db.crear_sesion(
            semana=1, materia="Lenguaje", grado="5to Sec", tema="Prueba"
        )
        ses = db.get_sesion(sid)
        assert ses["fecha"] == date.today().isoformat()

    def test_get_sesiones_filter_materia(self, db):
        db.crear_sesion(semana=1, materia="Lenguaje", grado="5to Sec", tema="A")
        db.crear_sesion(semana=2, materia="Matemática", grado="5to Sec", tema="B")
        rows = db.get_sesiones(materia="Lenguaje")
        assert all(r["materia"] == "Lenguaje" for r in rows)

    def test_get_sesiones_filter_semana(self, db):
        db.crear_sesion(semana=5, materia="Lenguaje", grado="5to Sec", tema="A")
        db.crear_sesion(semana=10, materia="Lenguaje", grado="5to Sec", tema="B")
        rows = db.get_sesiones(semana=10)
        assert len(rows) == 1


class TestMicroObjetivos:
    def test_guardar_micro_objetivos(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        assert len(objetivos) == 3
        textos = [o["texto"] for o in objetivos]
        assert "Identificar determinantes" in textos

    def test_guardar_micro_objetivos_replaces(self, db, sesion_con_objetivos):
        db.guardar_micro_objetivos(
            sesion_con_objetivos,
            [
                {"texto": "Nuevo objetivo único"},
            ],
        )
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        assert len(objetivos) == 1
        assert objetivos[0]["texto"] == "Nuevo objetivo único"

    def test_marcar_objetivo(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        db.marcar_objetivo(objetivos[0]["id"], True)
        obj = db.get_micro_objetivos(sesion_con_objetivos)
        assert obj[0]["completado"] == 1

    def test_marcar_objetivo_toggle_off(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        db.marcar_objetivo(objetivos[0]["id"], True)
        db.marcar_objetivo(objetivos[0]["id"], False)
        obj = db.get_micro_objetivos(sesion_con_objetivos)
        assert obj[0]["completado"] == 0

    def test_marcar_multiples(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        ids = [objetivos[0]["id"], objetivos[1]["id"]]
        db.marcar_multiples(ids, True)
        obj = db.get_micro_objetivos(sesion_con_objetivos)
        completados = [o["completado"] for o in obj]
        assert completados == [1, 1, 0]


class TestDeudaAcademica:
    def test_get_deuda_academica_empty(self, db):
        deuda = db.get_deuda_academica()
        assert deuda == []

    def test_get_deuda_academica_pendientes_only(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        db.marcar_objetivo(objetivos[0]["id"], True)
        deuda = db.get_deuda_academica()
        assert len(deuda) == 2
        textos = [o["texto"] for o in deuda]
        assert "Identificar determinantes" not in textos

    def test_get_deuda_academica_filter_materia(self, db):
        s1 = db.crear_sesion(semana=1, materia="Lenguaje", grado="5to Sec", tema="A")
        s2 = db.crear_sesion(semana=1, materia="Matemática", grado="5to Sec", tema="B")
        db.guardar_micro_objetivos(s1, [{"texto": "Obj Lenguaje", "depende_de": None}])
        db.guardar_micro_objetivos(
            s2, [{"texto": "Obj Matemática", "depende_de": None}]
        )
        deuda = db.get_deuda_academica(materia="Lenguaje")
        assert len(deuda) == 1
        assert deuda[0]["texto"] == "Obj Lenguaje"

    def test_get_resumen_deuda(self, db, sesion_con_objetivos):
        resumen = db.get_resumen_deuda()
        assert resumen["total_pendientes"] == 3
        assert resumen["materias_afectadas"] == ["Lenguaje"]
        assert len(resumen["deuda_detalle"]) == 3

    def test_get_dependencias_bloqueadas(self, db, sesion_con_objetivos):
        objetivos = db.get_micro_objetivos(sesion_con_objetivos)
        db.guardar_micro_objetivos(
            sesion_con_objetivos,
            [
                {"texto": "Obj-A", "depende_de": None},
                {"texto": "Obj-B", "depende_de": objetivos[0]["id"]},
                {"texto": "Obj-C", "depende_de": objetivos[1]["id"]},
            ],
        )
        objetivos2 = db.get_micro_objetivos(sesion_con_objetivos)
        db.marcar_objetivo(objetivos2[0]["id"], True)
        db.marcar_objetivo(objetivos2[1]["id"], True)
        bloqueados = db.get_dependencias_bloqueadas()
        assert len(bloqueados) == 0


class TestMinutosFinClase:
    def test_minutos_para_fin_clase_valid(self, db):
        from datetime import datetime, timedelta

        ahora = datetime.now()
        fin = ahora + timedelta(minutes=30)
        hora_fin = fin.strftime("%H:%M")
        result = db.minutos_para_fin_clase(f"10:00-{hora_fin}")
        assert result is not None

    def test_minutos_para_fin_clase_invalid(self, db):
        assert db.minutos_para_fin_clase("no-es-hora") is None
        assert db.minutos_para_fin_clase("") is None
        assert db.minutos_para_fin_clase("25:99") is None


class TestPlanesBuffer:
    def test_guardar_plan_buffer(self, db):
        sid = db.crear_sesion(
            semana=1, materia="Lenguaje", grado="5to Sec", tema="Prueba"
        )
        contenido = {"resumen_ejecutivo": "Resumen del plan", "objetivos": ["A", "B"]}
        bid = db.guardar_plan_buffer(1, "Lenguaje", "5to Sec", contenido)
        assert isinstance(bid, int)

    def test_get_planes_buffer(self, db):
        contenido = {"resumen_ejecutivo": "Test", "alerta_condensacion": True}
        db.guardar_plan_buffer(1, "Lenguaje", "5to Sec", contenido)
        db.guardar_plan_buffer(2, "Lenguaje", "5to Sec", contenido)
        rows = db.get_planes_buffer(materia="Lenguaje")
        assert len(rows) == 2
        assert "contenido_json" in rows[0]
