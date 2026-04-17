"""
lib/api_client.py — API Client for Streamlit Frontend
=====================================================
Provides dual-mode support: API mode and standalone mode.
When USE_API=true, calls go through FastAPI.
When USE_API=false or missing, falls back to direct function calls.

Async mode (USE_CELERY=true):
- POST /gemini/generar returns job_id immediately
- Client polls GET /gemini/status/{job_id} until ready
- Falls back to sync mode if USE_CELERY=false
"""

import os
import time
import httpx
from typing import Any, Optional

# Determine API mode
USE_API = os.environ.get("USE_API", "false").lower() == "true"
API_BASE = os.environ.get("API_BASE_URL", "http://localhost:8000")


class APIClientError(Exception):
    """API client error."""

    pass


class APIClient:
    """HTTP client for PRIA API with fallback to direct calls."""

    def __init__(self, token: Optional[str] = None):
        self.token = token
        self._client = httpx.Client(base_url=API_BASE, timeout=30)

    def _headers(self) -> dict:
        if self.token:
            return {"Authorization": f"Bearer {self.token}"}
        return {}

    def _handle_response(self, r: httpx.Response) -> Any:
        if r.status_code == 204:
            return None
        if r.status_code >= 400:
            try:
                detail = r.json().get("detail", r.text)
            except Exception:
                detail = r.text
            raise APIClientError(f"API error {r.status_code}: {detail}")
        return r.json()

    # ── Auth ────────────────────────────────────────────────────────────────────

    def login(self, email: str, password: str) -> dict:
        """Login and store access token."""
        r = self._client.post(
            "/auth/login", json={"email": email, "password": password}
        )
        data = self._handle_response(r)
        self.token = data.get("access_token")
        return data

    def register(
        self,
        email: str,
        password: str,
        nombre_completo: str,
        nombre_hoja: str,
        nivel: str = "5to primaria",
        rol: str = "docente",
    ) -> dict:
        """Register a new user."""
        r = self._client.post(
            "/auth/register",
            json={
                "email": email,
                "password": password,
                "nombre_completo": nombre_completo,
                "nombre_hoja": nombre_hoja,
                "nivel": nivel,
                "rol": rol,
            },
        )
        return self._handle_response(r)

    def refresh(self, refresh_token: str) -> dict:
        """Refresh access token."""
        r = self._client.post("/auth/refresh", json={"refresh_token": refresh_token})
        data = self._handle_response(r)
        self.token = data.get("access_token")
        return data

    def me(self) -> dict:
        """Get current user info."""
        r = self._client.get("/auth/me", headers=self._headers())
        return self._handle_response(r)

    # ── Planes ──────────────────────────────────────────────────────────────────

    def get_plan(self, plan_type: str) -> Optional[dict]:
        """Get user's plan for a specific plan type."""
        r = self._client.get(f"/planes/{plan_type}", headers=self._headers())
        if r.status_code == 404:
            return None
        return self._handle_response(r)

    def save_plan(
        self, plan_type: str, result: Any, metadata: Optional[dict] = None
    ) -> dict:
        """Save plan for a specific type."""
        r = self._client.post(
            f"/planes/{plan_type}",
            json={"result": result, "metadata": metadata},
            headers=self._headers(),
        )
        return self._handle_response(r)

    def delete_plan(self, plan_type: str) -> None:
        """Delete user's plan for a specific type."""
        r = self._client.delete(f"/planes/{plan_type}", headers=self._headers())
        if r.status_code != 204:
            self._handle_response(r)

    # ── Sesiones ────────────────────────────────────────────────────────────────

    def list_sesiones(
        self, materia: Optional[str] = None, semana: Optional[int] = None
    ) -> list:
        """List sessions."""
        params = {}
        if materia:
            params["materia"] = materia
        if semana is not None:
            params["semana"] = semana
        r = self._client.get("/sesiones", params=params, headers=self._headers())
        return self._handle_response(r)

    def get_sesion(self, sesion_id: int) -> dict:
        """Get a specific session."""
        r = self._client.get(f"/sesiones/{sesion_id}", headers=self._headers())
        return self._handle_response(r)

    def create_sesion(
        self,
        fecha: str,
        semana: int,
        materia: str,
        grado: str,
        tema: str,
        hora_inicio: str = "",
        hora_fin: str = "",
    ) -> dict:
        """Create a new session."""
        r = self._client.post(
            "/sesiones",
            params={
                "fecha": fecha,
                "semana": semana,
                "materia": materia,
                "grado": grado,
                "tema": tema,
                "hora_inicio": hora_inicio,
                "hora_fin": hora_fin,
            },
            headers=self._headers(),
        )
        return self._handle_response(r)

    def get_micro_objetivos(self, sesion_id: int) -> list:
        """Get micro-objetivos for a session."""
        r = self._client.get(
            f"/sesiones/{sesion_id}/micro-objetivos", headers=self._headers()
        )
        return self._handle_response(r)

    def save_micro_objetivos(
        self, sesion_id: int, objetivos: list, origen_semana: Optional[int] = None
    ) -> dict:
        """Save micro-objetivos for a session."""
        params = {"objetivos": objetivos}
        if origen_semana is not None:
            params["origen_semana"] = origen_semana
        r = self._client.post(
            f"/sesiones/{sesion_id}/micro-objetivos",
            json=params,
            headers=self._headers(),
        )
        return self._handle_response(r)

    def mark_objetivo(self, objetivo_id: int, completado: bool) -> dict:
        """Mark a micro-objetivo."""
        r = self._client.patch(
            f"/sesiones/micro-objetivos/{objetivo_id}",
            params={"completado": completado},
            headers=self._headers(),
        )
        return self._handle_response(r)

    # ── Gemini ──────────────────────────────────────────────────────────────────

    def generar(
        self,
        prompt_filename: str,
        variables: dict,
        expect_json: bool = False,
        poll_interval: float = 0.5,
        timeout: float = 180.0,
    ) -> dict:
        """
        Generate content using Gemini.

        When USE_CELERY=true, enqueues job and polls until done.
        Otherwise calls synchronously.

        Args:
            prompt_filename: Name of the prompt file
            variables: Dict of template variables
            expect_json: Whether to expect JSON output
            poll_interval: Seconds between status polls (async mode, default 0.5s)
            timeout: Max seconds to wait for job completion (default 180s)

        Returns:
            Dict with result or status info
        """
        use_celery = os.environ.get("USE_CELERY", "false").lower() == "true"

        r = self._client.post(
            "/gemini/generar",
            params={
                "prompt_filename": prompt_filename,
                "variables": variables,
                "expect_json": expect_json,
            },
            headers=self._headers(),
        )
        r.raise_for_status()
        data = r.json()

        # Sync mode or cached result - return immediately
        if data.get("status") == "done":
            return data.get("result") or data

        # Async mode - poll for result
        if not use_celery:
            return data  # sync mode, should already be done

        # Poll for async result with exponential backoff
        job_id = data.get("job_id")
        if not job_id:
            return data

        poll_url = f"/gemini/status/{job_id}"
        start = time.time()
        current_interval = poll_interval

        while time.time() - start < timeout:
            time.sleep(current_interval)
            r = self._client.get(poll_url, headers=self._headers())
            r.raise_for_status()
            status_data = r.json()

            if status_data.get("ready"):
                if status_data.get("status") == "done":
                    return status_data.get("result") or status_data
                elif status_data.get("status") == "failed":
                    raise APIClientError(
                        f"Generation failed: {status_data.get('error', 'Unknown error')}"
                    )

            if status_data.get("status") in ("pending", "running"):
                # Cap backoff at 3 seconds
                current_interval = min(current_interval * 1.5, 3.0)
                continue

        raise APIClientError(f"Generation timed out after {timeout}s")

    def list_motores(self) -> dict:
        """List available prompt files."""
        r = self._client.get("/gemini/motores", headers=self._headers())
        return self._handle_response(r)

    # ── Admin ───────────────────────────────────────────────────────────────────

    def list_usuarios(self) -> list:
        """List all users (admin only)."""
        r = self._client.get("/admin/usuarios", headers=self._headers())
        return self._handle_response(r)

    def toggle_usuario_activo(self, usuario_id: int, activo: bool) -> dict:
        """Toggle user active status (admin only)."""
        r = self._client.patch(
            f"/admin/usuarios/{usuario_id}/active",
            params={"activo": activo},
            headers=self._headers(),
        )
        return self._handle_response(r)

    def delete_usuario(self, usuario_id: int) -> None:
        """Delete user (admin only)."""
        r = self._client.delete(
            f"/admin/usuarios/{usuario_id}", headers=self._headers()
        )
        if r.status_code != 204:
            self._handle_response(r)


# ── Standalone Mode (No API) ────────────────────────────────────────────────────
# When USE_API=false, we provide dummy functions that import and call
# the actual db/ui functions directly. This maintains backward compatibility.


def _standalone_login(email: str, password: str) -> dict:
    """Standalone login - calls db directly."""
    from db import verificar_login, crear_token_recordarme, get_usuario_by_email

    user = verificar_login(email, password)
    if not user:
        raise APIClientError("Invalid credentials")

    # Create a simple token for standalone mode
    token = crear_token_recordarme(int(user["id"]), dias=30)
    return {
        "access_token": token,  # In standalone, this is actually the remember token
        "refresh_token": token,
        "token_type": "bearer",
    }


def _standalone_register(
    email: str,
    password: str,
    nombre_completo: str,
    nombre_hoja: str,
    nivel: str = "5to primaria",
    rol: str = "docente",
) -> dict:
    """Standalone register - calls db directly."""
    from db import crear_usuario, get_usuario_by_email

    existing = get_usuario_by_email(email)
    if existing:
        raise APIClientError("Email already registered")

    success = crear_usuario(
        email=email,
        password=password,
        nombre=nombre_completo,
        nombre_hoja=nombre_hoja,
        rol=rol,
    )
    if not success:
        raise APIClientError("Failed to create user")

    user = get_usuario_by_email(email)
    return {
        "email": user["email"],
        "nombre_completo": user.get("nombre", ""),
        "nombre_hoja": user.get("nombre_hoja", ""),
        "nivel": user.get("nivel", nivel),
        "rol": user["rol"],
    }


# ── Mode-Aware Factory ─────────────────────────────────────────────────────────


def get_api_client(token: Optional[str] = None) -> "APIClient | StandaloneClient":
    """
    Factory function that returns the appropriate client based on USE_API setting.

    In API mode: returns APIClient instance
    In standalone mode: returns StandaloneClient that calls db functions directly
    """
    if USE_API:
        return APIClient(token=token)
    else:
        return StandaloneClient(token=token)


class StandaloneClient:
    """
    Standalone mode client - calls db/ui functions directly.
    Used when USE_API=false or not set.
    """

    def __init__(self, token: Optional[str] = None):
        self.token = token
        self._user = None

    def _ensure_auth(self):
        """Ensure user is authenticated in standalone mode."""
        if not self._user:
            raise APIClientError("Not authenticated")

    def login(self, email: str, password: str) -> dict:
        from db import verificar_login, crear_token_recordarme, get_usuario_by_email

        user = verificar_login(email, password)
        if not user:
            raise APIClientError("Invalid credentials")

        self.token = crear_token_recordarme(int(user["id"]), dias=30)
        self._user = user
        return {
            "access_token": self.token,
            "refresh_token": self.token,
            "token_type": "bearer",
        }

    def register(
        self,
        email: str,
        password: str,
        nombre_completo: str,
        nombre_hoja: str,
        nivel: str = "5to primaria",
        rol: str = "docente",
    ) -> dict:
        return _standalone_register(
            email, password, nombre_completo, nombre_hoja, nivel, rol
        )

    def refresh(self, refresh_token: str) -> dict:
        from db import verificar_token_recordarme

        user = verificar_token_recordarme(refresh_token)
        if not user:
            raise APIClientError("Invalid refresh token")

        self.token = refresh_token
        self._user = user
        return {
            "access_token": self.token,
            "refresh_token": self.token,
            "token_type": "bearer",
        }

    def me(self) -> dict:
        self._ensure_auth()
        return {
            "email": self._user["email"],
            "nombre_completo": self._user.get("nombre", ""),
            "nombre_hoja": self._user.get("nombre_hoja", ""),
            "nivel": self._user.get("nivel", "5to primaria"),
            "rol": self._user["rol"],
        }

    # Planes - standalone just returns None (client-side storage)
    def get_plan(self, plan_type: str) -> Optional[dict]:
        return None

    def save_plan(
        self, plan_type: str, result: Any, metadata: Optional[dict] = None
    ) -> dict:
        return {"plan_type": plan_type, "result": result, "metadata": metadata}

    def delete_plan(self, plan_type: str) -> None:
        pass

    # Sesiones - delegate to db
    def list_sesiones(
        self, materia: Optional[str] = None, semana: Optional[int] = None
    ) -> list:
        from db import get_sesiones

        return get_sesiones(materia=materia, semana=semana)

    def get_sesion(self, sesion_id: int) -> dict:
        from db import get_sesion

        sesion = get_sesion(sesion_id)
        if not sesion:
            raise APIClientError("Session not found")
        return sesion

    def create_sesion(
        self,
        fecha: str,
        semana: int,
        materia: str,
        grado: str,
        tema: str,
        hora_inicio: str = "",
        hora_fin: str = "",
    ) -> dict:
        from db import crear_sesion

        session_id = crear_sesion(
            semana, materia, grado, tema, hora_inicio, hora_fin, fecha
        )
        return {"session_id": session_id}

    def get_micro_objetivos(self, sesion_id: int) -> list:
        from db import get_micro_objetivos

        return get_micro_objetivos(sesion_id)

    def save_micro_objetivos(
        self, sesion_id: int, objetivos: list, origen_semana: Optional[int] = None
    ) -> dict:
        from db import guardar_micro_objetivos

        guardar_micro_objetivos(sesion_id, objetivos, origen_semana)
        return {"status": "ok"}

    def mark_objetivo(self, objetivo_id: int, completado: bool) -> dict:
        from db import marcar_objetivo

        marcar_objetivo(objetivo_id, completado)
        return {"status": "ok"}

    # Gemini - delegate to ui.gemini
    def generar(
        self,
        prompt_filename: str,
        variables: dict,
        expect_json: bool = False,
        poll_interval: float = 1.0,
        timeout: float = 120.0,
    ) -> dict:
        # Note: standalone mode is always synchronous, ignores poll_interval/timeout
        from ui.gemini import generar_con_gemini
        from ui.cache import _motor_cache_key, _cargar_motor_cache, _guardar_motor_cache

        cache_key = _motor_cache_key(prompt_filename, variables)
        cached = _cargar_motor_cache(cache_key)
        if cached is not None:
            return {"cached": True, "result": cached}

        result = generar_con_gemini(prompt_filename, variables, expect_json=expect_json)
        if result is not None:
            _guardar_motor_cache(cache_key, result, prompt_filename)
        return {"cached": False, "result": result}

    def list_motores(self) -> dict:
        import os

        prompts_dir = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), "prompts_maestros"
        )
        if os.path.exists(prompts_dir):
            files = [f for f in os.listdir(prompts_dir) if f.endswith(".txt")]
        else:
            files = []
        return {"motores": files}

    # Admin - delegate to db
    def list_usuarios(self) -> list:
        from db import get_all_usuarios

        return get_all_usuarios()

    def toggle_usuario_activo(self, usuario_id: int, activo: bool) -> dict:
        from db import toggle_usuario_activo

        toggle_usuario_activo(usuario_id, activo)
        return {"status": "ok"}

    def delete_usuario(self, usuario_id: int) -> None:
        from db import eliminar_usuario

        eliminar_usuario(usuario_id)
