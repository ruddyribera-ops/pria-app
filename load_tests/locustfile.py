"""
load_tests/locustfile.py — Locust Load Tests for PRIA API
========================================================
Simulates realistic user behavior against the PRIA API.
"""

from locust import HttpUser, task, between
import random
import string


def random_email():
    """Generate a random email for registration tests."""
    suffix = "".join(random.choices(string.ascii_lowercase, k=8))
    return f"loadtest_{suffix}@test.com"


class PRIAUser(HttpUser):
    """Simulates an authenticated PRIA teacher."""

    wait_time = between(1, 3)

    def on_start(self):
        email = "misterruddy@laspalmas.edu.bo"
        password = "testpassword123"
        with self.client.post(
            "/auth/login",
            json={
                "email": email,
                "password": password,
            },
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                resp.failure(f"Login failed: {resp.status_code}")

    @task(3)
    def get_plans(self):
        plan_types = ["m0a", "m1a", "m1b", "m1c", "m2a"]
        pt = random.choice(plan_types)
        with self.client.get(
            f"/planes/{pt}", headers=self.headers, catch_response=True
        ) as resp:
            if resp.status_code in (200, 404):
                resp.success()
            else:
                resp.failure(f"Got {resp.status_code}")

    @task(1)
    def save_plan(self):
        pt = random.choice(["m1a", "m2a"])
        fake_result = {
            "plan": "Test plan from load test",
            "objetivos": ["Obj 1", "Obj 2"],
        }
        with self.client.post(
            f"/planes/{pt}",
            json={"result": fake_result},
            headers=self.headers,
            catch_response=True,
        ) as resp:
            if resp.status_code in (200, 201):
                resp.success()
            else:
                resp.failure(f"Got {resp.status_code}")

    @task(2)
    def health_check(self):
        with self.client.get("/health", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Health check failed")

    @task(2)
    def list_sesiones(self):
        with self.client.get(
            "/sesiones", headers=self.headers, catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Got {resp.status_code}")


class AnonymousUser(HttpUser):
    """Unauthenticated access simulation."""

    wait_time = between(2, 5)

    @task
    def health_check(self):
        with self.client.get("/health", catch_response=True) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Health failed: {resp.status_code}")

    @task
    def login_invalid(self):
        with self.client.post(
            "/auth/login",
            json={
                "email": "invalid@test.com",
                "password": "wrong",
            },
            catch_response=True,
        ) as resp:
            if resp.status_code == 401:
                resp.success()
            else:
                resp.failure(f"Expected 401, got {resp.status_code}")


class PRIAAdmin(HttpUser):
    """Admin user simulation."""

    wait_time = between(1, 2)

    def on_start(self):
        with self.client.post(
            "/auth/login",
            json={
                "email": "admin@laspalmas.edu.bo",
                "password": "adminpassword123",
            },
            catch_response=True,
        ) as resp:
            if resp.status_code == 200:
                self.token = resp.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
                resp.success()
            else:
                resp.failure(f"Admin login failed")

    @task(2)
    def list_users(self):
        with self.client.get(
            "/admin/usuarios", headers=self.headers, catch_response=True
        ) as resp:
            if resp.status_code == 200:
                resp.success()
            else:
                resp.failure(f"Got {resp.status_code}")
