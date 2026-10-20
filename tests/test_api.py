import os
import pathlib
import sys
import unittest
from unittest.mock import patch


ROOT = pathlib.Path(__file__).resolve().parents[1]
BACKEND = ROOT / "backend"
sys.path.insert(0, str(BACKEND))

# Keep the test suite fully offline. The application only sees these values
# during import; every Supabase call used by a test is mocked below.
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
os.environ.setdefault("SUPABASE_SECRET_KEY", "test-secret-key")

import app as app_module  # noqa: E402
from supabase_client import SupabaseError  # noqa: E402


class AuthApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        app_module.app.config.update(TESTING=True)

    def setUp(self):
        self.client = app_module.app.test_client()

    def test_health_is_available(self):
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["status"], "ok")

    def test_bootstrap_requires_authentication(self):
        response = self.client.get("/api/bootstrap")
        self.assertEqual(response.status_code, 401)

    def test_recovery_rejects_invalid_email(self):
        response = self.client.post(
            "/api/auth/password-reset/request",
            json={"email": "not-an-email", "redirectTo": "http://127.0.0.1:5000/?password_reset=1"},
        )
        self.assertEqual(response.status_code, 400)

    def test_recovery_rejects_invalid_redirect(self):
        response = self.client.post(
            "/api/auth/password-reset/request",
            json={"email": "user@example.com", "redirectTo": "not-a-url"},
        )
        self.assertEqual(response.status_code, 400)

    def test_recovery_success_does_not_expose_account_existence(self):
        with patch.object(app_module.sb, "auth_request_password_reset") as request_reset:
            response = self.client.post(
                "/api/auth/password-reset/request",
                json={
                    "email": "user@example.com",
                    "redirectTo": "http://127.0.0.1:5000/?password_reset=1",
                },
            )
        self.assertEqual(response.status_code, 200)
        self.assertIn("recibirás un enlace", response.get_json()["message"])
        request_reset.assert_called_once()

    def test_recovery_maps_supabase_rate_limit(self):
        with patch.object(
            app_module.sb,
            "auth_request_password_reset",
            side_effect=SupabaseError("rate limited", status=429),
        ):
            response = self.client.post(
                "/api/auth/password-reset/request",
                json={
                    "email": "user@example.com",
                    "redirectTo": "http://127.0.0.1:5000/?password_reset=1",
                },
            )
        self.assertEqual(response.status_code, 429)
        self.assertIn("limitó temporalmente", response.get_json()["error"])

    def test_password_confirm_requires_token_and_valid_length(self):
        missing_token = self.client.post(
            "/api/auth/password-reset/confirm",
            json={"password": "secret123"},
        )
        short_password = self.client.post(
            "/api/auth/password-reset/confirm",
            json={"accessToken": "token", "password": "123"},
        )
        self.assertEqual(missing_token.status_code, 401)
        self.assertEqual(short_password.status_code, 400)

    def test_password_confirm_success(self):
        with patch.object(app_module.sb, "auth_update_password") as update_password:
            response = self.client.post(
                "/api/auth/password-reset/confirm",
                json={"accessToken": "token", "password": "secret123"},
            )
        self.assertEqual(response.status_code, 200)
        update_password.assert_called_once_with("token", "secret123")

    def test_duplicate_email_is_reported_as_conflict(self):
        duplicate = SupabaseError(
            "User already registered",
            status=422,
            payload={"code": "user_already_exists"},
        )
        with patch.object(app_module.sb, "auth_admin_create_user", side_effect=duplicate):
            response = self.client.post(
                "/api/auth/register",
                json={
                    "name": "Usuario",
                    "email": "user@example.com",
                    "password": "secret123",
                    "monthlySalary": 2000000,
                },
            )
        self.assertEqual(response.status_code, 409)
        self.assertIn("ya está registrado", response.get_json()["error"])


if __name__ == "__main__":
    unittest.main()
