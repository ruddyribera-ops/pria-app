"""
tests/test_api.py — FastAPI endpoint tests
==========================================
Covers: health/metrics, auth (register/login/me/refresh), sesiones CRUD,
auth guards (401/403), admin-only endpoints.

Uses an isolated SQLite DB per test via the `db` fixture + monkeypatching
before importing the FastAPI app. Tests avoid booting a real server
(uses FastAPI's TestClient in-process).
"""

import pytest
import os


# ─────────────────────────────────────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────────────────────────────────────


@pytest.fixture
def api_client(db, monkeypatch):
    """
    Return a FastAPI TestClient bound to an isolated DB.

    Must be constructed AFTER the `db` fixture patches db._base so that
    when api.routers import db-backed helpers they hit the temp SQLite.
    """
    # Ensure JWT secret is deterministic for the test
    monkeypatch.setenv("JWT_SECRET_KEY", "test-secret-please-do-not-use-in-prod")
    monkeypatch.setenv("JWT_ALGORITHM", "HS256")

    # Reset cached settings if any
    from api import config as api_config

    if hasattr(api_config.get_settings, "cache_clear"):
        api_config.get_settings.cache_clear()

    from fastapi.testclient import TestClient
    from api.main import app

    return TestClient(app)


@pytest.fixture
def registered_teacher(api_client):
    """Register a teacher and return (email, password, tokens_response)."""
    email = "profe@test.com"
    password = "secret1234"
    r = api_client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nombre_completo": "Profe Test",
            "nombre_hoja": "TEST",
            "nivel": "5to primaria",
            "rol": "docente",
        },
    )
    assert r.status_code == 201, r.text

    login = api_client.post(
        "/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200, login.text
    return email, password, login.json()


@pytest.fixture
def teacher_headers(registered_teacher):
    _, _, tokens = registered_teacher
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def registered_admin(api_client):
    email = "admin@test.com"
    password = "adminpass123"
    api_client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nombre_completo": "Admin Test",
            "nombre_hoja": "ADMIN",
            "nivel": "-",
            "rol": "admin",
        },
    )
    login = api_client.post(
        "/auth/login", json={"email": email, "password": password}
    )
    assert login.status_code == 200
    return email, password, login.json()


@pytest.fixture
def admin_headers(registered_admin):
    _, _, tokens = registered_admin
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ─────────────────────────────────────────────────────────────────────────────
# Health / ready / metrics (no auth)
# ─────────────────────────────────────────────────────────────────────────────


def test_health_ok(api_client):
    r = api_client.get("/health")
    assert r.status_code == 200
    assert r.json() == {"status": "ok"}


def test_ready_ok(api_client):
    r = api_client.get("/ready")
    assert r.status_code == 200
    data = r.json()
    assert data["status"] == "ready"
    assert "version" in data


def test_metrics_is_prometheus_text(api_client):
    r = api_client.get("/metrics")
    assert r.status_code == 200
    ct = r.headers.get("content-type", "")
    # Prometheus uses text/plain with version; content must mention a metric
    assert "text/plain" in ct or "openmetrics" in ct
    body = r.text
    assert "priia_http_requests_total" in body or "#" in body


# ─────────────────────────────────────────────────────────────────────────────
# Auth: register → login → me → refresh
# ─────────────────────────────────────────────────────────────────────────────


def test_register_returns_user(api_client):
    r = api_client.post(
        "/auth/register",
        json={
            "email": "new@test.com",
            "password": "pw12345678",
            "nombre_completo": "New User",
            "nombre_hoja": "NEW",
        },
    )
    assert r.status_code == 201, r.text
    data = r.json()
    assert data["email"] == "new@test.com"
    assert data["nombre_completo"] == "New User"


def test_register_duplicate_email_400(api_client, registered_teacher):
    email, password, _ = registered_teacher
    r = api_client.post(
        "/auth/register",
        json={
            "email": email,
            "password": password,
            "nombre_completo": "Dup",
            "nombre_hoja": "DUP",
        },
    )
    assert r.status_code == 400


def test_login_ok_returns_tokens(api_client, registered_teacher):
    email, password, tokens = registered_teacher
    assert "access_token" in tokens
    assert "refresh_token" in tokens
    assert tokens.get("token_type") == "bearer"


def test_login_bad_password_401(api_client, registered_teacher):
    email, _, _ = registered_teacher
    r = api_client.post(
        "/auth/login", json={"email": email, "password": "wrong-password"}
    )
    assert r.status_code == 401


def test_login_unknown_user_401(api_client):
    r = api_client.post(
        "/auth/login", json={"email": "nobody@test.com", "password": "whatever123"}
    )
    assert r.status_code == 401


def test_me_requires_auth(api_client):
    r = api_client.get("/auth/me")
    assert r.status_code in (401, 403)  # HTTPBearer returns 403 if missing


def test_me_returns_current_user(api_client, teacher_headers):
    r = api_client.get("/auth/me", headers=teacher_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["email"] == "profe@test.com"
    assert data["rol"] == "docente"


def test_me_rejects_garbage_token(api_client):
    r = api_client.get(
        "/auth/me", headers={"Authorization": "Bearer not-a-real-jwt"}
    )
    assert r.status_code == 401


def test_refresh_returns_new_tokens(api_client, registered_teacher):
    _, _, tokens = registered_teacher
    r = api_client.post(
        "/auth/refresh", json={"refresh_token": tokens["refresh_token"]}
    )
    assert r.status_code == 200, r.text
    new_tokens = r.json()
    assert new_tokens["access_token"]
    assert new_tokens["refresh_token"]


def test_refresh_rejects_access_token_as_refresh(api_client, registered_teacher):
    """Passing an access token to /refresh must fail (type != refresh)."""
    _, _, tokens = registered_teacher
    r = api_client.post(
        "/auth/refresh", json={"refresh_token": tokens["access_token"]}
    )
    assert r.status_code == 401


# ─────────────────────────────────────────────────────────────────────────────
# Sesiones CRUD
# ─────────────────────────────────────────────────────────────────────────────


def test_sesiones_list_requires_auth(api_client):
    r = api_client.get("/sesiones")
    assert r.status_code in (401, 403)


def test_sesiones_list_empty(api_client, teacher_headers):
    r = api_client.get("/sesiones", headers=teacher_headers)
    assert r.status_code == 200
    assert r.json() == []


def test_sesiones_create_and_get(api_client, teacher_headers):
    # create
    r = api_client.post(
        "/sesiones",
        params={
            "fecha": "2026-04-17",
            "semana": 3,
            "materia": "MATEMATICAS",
            "grado": "5to primaria",
            "tema": "Fracciones",
            "hora_inicio": "07:55",
            "hora_fin": "08:40",
        },
        headers=teacher_headers,
    )
    assert r.status_code == 201, r.text
    sid = r.json()["session_id"]
    assert sid

    # list now has one
    r2 = api_client.get("/sesiones", headers=teacher_headers)
    assert r2.status_code == 200
    items = r2.json()
    assert len(items) == 1
    assert items[0]["materia"] == "MATEMATICAS"

    # get by id
    r3 = api_client.get(f"/sesiones/{sid}", headers=teacher_headers)
    assert r3.status_code == 200
    assert r3.json()["tema"] == "Fracciones"


def test_sesion_404_when_missing(api_client, teacher_headers):
    r = api_client.get("/sesiones/999999", headers=teacher_headers)
    assert r.status_code == 404


# ─────────────────────────────────────────────────────────────────────────────
# Admin guard
# ─────────────────────────────────────────────────────────────────────────────


def test_admin_list_users_forbidden_for_teacher(api_client, teacher_headers):
    r = api_client.get("/admin/usuarios", headers=teacher_headers)
    assert r.status_code == 403


def test_admin_list_users_ok_for_admin(api_client, admin_headers):
    r = api_client.get("/admin/usuarios", headers=admin_headers)
    assert r.status_code == 200
    users = r.json()
    # at least the admin itself
    assert any(u["rol"] == "admin" for u in users)


def test_admin_unauthenticated_is_401_or_403(api_client):
    r = api_client.get("/admin/usuarios")
    assert r.status_code in (401, 403)
