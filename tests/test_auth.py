"""
test_auth.py — Auth & user management tests.
"""

import pytest


class TestPasswordHashing:
    def test_hash_password_deterministic(self, db):
        h1 = db._hash_password("miClave123")
        h2 = db._hash_password("miClave123")
        assert h1 == h2

    def test_hash_password_different_passwords(self, db):
        h1 = db._hash_password("clave1")
        h2 = db._hash_password("clave2")
        assert h1 != h2

    def test_hash_password_empty(self, db):
        h = db._hash_password("")
        assert len(h) == 64
        h2 = db._hash_password("")
        assert h == h2

    def test_hash_token_deterministic(self, db):
        t1 = db._hash_token("token123")
        t2 = db._hash_token("token123")
        assert t1 == t2


class TestUserCreation:
    def test_crear_usuario_returns_true(self, db):
        ok = db.crear_usuario(
            "new@laspalmas.edu.bo",
            "Pass123!",
            "Nuevo Profesor",
            "NUEVO",
            "docente",
        )
        assert ok is True

    def test_crear_usuario_duplicate_returns_false(self, db, seed_user):
        ok = db.crear_usuario(
            "test@laspalmas.edu.bo",
            "AnotherPass!",
            "Otro Nombre",
            "TEST",
            "docente",
        )
        assert ok is False

    def test_crear_usuario_email_normalized(self, db):
        db.crear_usuario(
            "UPPERCASE@LASPALMAS.EDU.BO",
            "Pass123!",
            "Test",
            "TEST",
            "docente",
        )
        user = db.get_usuario_by_email("uppercase@laspalmas.edu.bo")
        assert user is not None

    def test_crear_usuario_hoja_normalized(self, db):
        db.crear_usuario(
            "hoja@test.com",
            "Pass123!",
            "Test",
            "test",
            "docente",
        )
        user = db.get_usuario_by_email("hoja@test.com")
        assert user["nombre_hoja"] == "TEST"

    def test_crear_usuario_admin_role(self, db):
        db.crear_usuario("admin@test.com", "Pass123!", "Admin", "ADMIN", "admin")
        user = db.get_usuario_by_email("admin@test.com")
        assert user["rol"] == "admin"

    def test_crear_usuario_active_by_default(self, db):
        db.crear_usuario("active@test.com", "Pass123!", "Test", "TEST", "docente")
        assert db.verificar_login("active@test.com", "Pass123!") is not None


class TestLogin:
    def test_verificar_login_success(self, db, seed_user):
        result = db.verificar_login("test@laspalmas.edu.bo", "TestPass123!")
        assert result is not None
        assert result["email"] == "test@laspalmas.edu.bo"

    def test_verificar_login_wrong_password(self, db, seed_user):
        result = db.verificar_login("test@laspalmas.edu.bo", "WrongPass!")
        assert result is None

    def test_verificar_login_unknown_email(self, db, seed_user):
        result = db.verificar_login("nobody@test.com", "AnyPass!")
        assert result is None

    def test_verificar_login_email_case_insensitive(self, db, seed_user):
        result = db.verificar_login("TEST@LASPALMAS.EDU.BO", "TestPass123!")
        assert result is not None

    def test_verificar_login_inactive_user(self, db, seed_user):
        db.toggle_usuario_activo(seed_user["id"], False)
        result = db.verificar_login("test@laspalmas.edu.bo", "TestPass123!")
        assert result is None


class TestTokenAuth:
    def test_crear_token_recordarme_returns_raw_token(self, db, seed_user):
        token = db.crear_token_recordarme(seed_user["id"], dias=7)
        assert isinstance(token, str)
        assert len(token) > 20

    def test_verificar_token_recordarme_valid(self, db, seed_user):
        token = db.crear_token_recordarme(seed_user["id"], dias=30)
        result = db.verificar_token_recordarme(token)
        assert result is not None
        assert result["id"] == seed_user["id"]

    def test_verificar_token_recordarme_invalid(self, db, seed_user):
        result = db.verificar_token_recordarme("not.a.real.token")
        assert result is None

    def test_verificar_token_recordarme_revoked(self, db, seed_user):
        token = db.crear_token_recordarme(seed_user["id"], dias=30)
        db.revocar_token_recordarme(token)
        result = db.verificar_token_recordarme(token)
        assert result is None

    def test_revocar_token_recordarme_multiple_tokens(self, db, seed_user):
        t1 = db.crear_token_recordarme(seed_user["id"])
        t2 = db.crear_token_recordarme(seed_user["id"])
        assert db.verificar_token_recordarme(t1) is not None
        assert db.verificar_token_recordarme(t2) is not None
        db.revocar_token_recordarme(t1)
        assert db.verificar_token_recordarme(t1) is None
        assert db.verificar_token_recordarme(t2) is not None

    def test_revocar_tokens_usuario(self, db, seed_user):
        t1 = db.crear_token_recordarme(seed_user["id"])
        t2 = db.crear_token_recordarme(seed_user["id"])
        db.revocar_tokens_usuario(seed_user["id"])
        assert db.verificar_token_recordarme(t1) is None
        assert db.verificar_token_recordarme(t2) is None


class TestUserManagement:
    def test_get_usuario_by_email(self, db, seed_user):
        user = db.get_usuario_by_email("test@laspalmas.edu.bo")
        assert user is not None
        assert user["nombre"] == "Profesor Test"

    def test_get_usuario_by_email_not_found(self, db):
        assert db.get_usuario_by_email("nadie@test.com") is None

    def test_get_all_usuarios(self, db, seed_user):
        users = db.get_all_usuarios()
        assert len(users) >= 1
        emails = [u["email"] for u in users]
        assert "test@laspalmas.edu.bo" in emails

    def test_actualizar_password(self, db, seed_user):
        db.actualizar_password("test@laspalmas.edu.bo", "NewPass456!")
        result = db.verificar_login("test@laspalmas.edu.bo", "NewPass456!")
        assert result is not None
        assert db.verificar_login("test@laspalmas.edu.bo", "TestPass123!") is None

    def test_actualizar_password_revokes_tokens(self, db, seed_user):
        token = db.crear_token_recordarme(seed_user["id"])
        db.actualizar_password("test@laspalmas.edu.bo", "NewPass456!")
        assert db.verificar_token_recordarme(token) is None

    def test_actualizar_usuario_admin_nombre(self, db, seed_user):
        ok, msg = db.actualizar_usuario_admin(
            seed_user["id"], nuevo_nombre="Nombre Actualizado"
        )
        assert ok is True
        user = db.get_usuario_by_email("test@laspalmas.edu.bo")
        assert user["nombre"] == "Nombre Actualizado"

    def test_actualizar_usuario_admin_email_duplicate(self, db, seed_user):
        db.crear_usuario("otro@test.com", "Pass123!", "Otro", "OTRO", "docente")
        ok, msg = db.actualizar_usuario_admin(
            seed_user["id"], nuevo_email="otro@test.com"
        )
        assert ok is False
        assert "ya existe" in msg

    def test_toggle_usuario_activo(self, db, seed_user):
        db.toggle_usuario_activo(seed_user["id"], False)
        assert db.verificar_login("test@laspalmas.edu.bo", "TestPass123!") is None
        db.toggle_usuario_activo(seed_user["id"], True)
        assert db.verificar_login("test@laspalmas.edu.bo", "TestPass123!") is not None

    def test_eliminar_usuario(self, db, seed_user):
        db.eliminar_usuario(seed_user["id"])
        assert db.get_usuario_by_email("test@laspalmas.edu.bo") is None
