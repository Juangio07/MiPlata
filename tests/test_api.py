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

    def test_register_rejects_oversized_avatar(self):
        response = self.client.post(
            "/api/auth/register",
            json={
                "name": "Usuario",
                "email": "user@example.com",
                "password": "secret123",
                "avatarUrl": "data:image/jpeg;base64," + ("a" * 600001),
            },
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen es demasiado grande", response.get_json()["error"])

    def test_profile_rejects_oversized_avatar(self):
        with patch.object(app_module, "get_current_user_id_from_req", return_value="user-1"):
            with patch.object(app_module.db, "update_user") as update_user:
                response = self.client.put(
                    "/api/user/profile",
                    json={"avatarUrl": "data:image/jpeg;base64," + ("a" * 600001)},
                )
        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen es demasiado grande", response.get_json()["error"])
        update_user.assert_not_called()

    def test_demo_account_cannot_be_deleted(self):
        with patch.object(app_module, "SUPABASE_ENABLED", False):
            with patch.object(app_module, "get_current_user_id_from_req", return_value="demo-user"):
                with patch.object(app_module.db, "get_user_by_id", return_value={"email": "demo@miplata.app"}):
                    with patch.object(app_module.db, "delete_user") as delete_user:
                        response = self.client.delete("/api/user")
        self.assertEqual(response.status_code, 403)
        self.assertIn("cuenta demo está protegida", response.get_json()["error"])
        delete_user.assert_not_called()

    def test_create_goal_persists_valid_payload(self):
        with patch.object(app_module, "get_current_user_id_from_req", return_value="user-1"):
            with patch.object(app_module.db, "add_savings_goal", return_value="goal-1") as add_goal:
                response = self.client.post(
                    "/api/savings-goals",
                    json={
                        "name": "Fondo de emergencia",
                        "targetAmount": 1500000,
                        "deadline": "2027-06-01",
                        "icon": "security",
                    },
                )
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["id"], "goal-1")
        add_goal.assert_called_once()
        self.assertEqual(add_goal.call_args.args[1]["targetAmount"], 1500000)

    def test_create_goal_rejects_oversized_embedded_image(self):
        with patch.object(app_module, "get_current_user_id_from_req", return_value="user-1"):
            with patch.object(app_module.db, "add_savings_goal") as add_goal:
                response = self.client.post(
                    "/api/savings-goals",
                    json={
                        "name": "Meta con imagen grande",
                        "targetAmount": 1500000,
                        "imageUrl": "data:image/jpeg;base64," + ("a" * 600001),
                    },
                )
        self.assertEqual(response.status_code, 400)
        self.assertIn("imagen es demasiado grande", response.get_json()["error"])
        add_goal.assert_not_called()

    def test_demo_seed_respects_goal_foreign_key_order(self):
        with patch.object(app_module.db.sb, "rest_request", return_value=[]) as request:
            app_module.db.ensure_demo_data("user-1")

        calls = [
            (call.args[0], call.kwargs.get("method", "GET"))
            for call in request.call_args_list
        ]
        delete_contributions = calls.index(("goal_contributions", "DELETE"))
        delete_goals = calls.index(("savings_goals", "DELETE"))
        create_goals = calls.index(("savings_goals", "POST"))
        create_contributions = calls.index(("goal_contributions", "POST"))
        self.assertLess(delete_contributions, delete_goals)
        self.assertLess(create_goals, create_contributions)

    def test_supabase_month_filters_use_repeated_date_parameter(self):
        with patch.object(app_module.db.sb, "rest_request", return_value=[]) as request:
            app_module.db.get_transactions("user-1", "2026-10")
            transaction_params = request.call_args.kwargs["params"]
            app_module.db.get_goal_contributions("user-1", "2026-10")
            contribution_params = request.call_args.kwargs["params"]

        expected = ["gte.2026-10-01", "lt.2026-11-01"]
        self.assertEqual(transaction_params["date"], expected)
        self.assertEqual(contribution_params["date"], expected)
        self.assertNotIn("date.lt", transaction_params)
        self.assertNotIn("date.lt", contribution_params)


if __name__ == "__main__":
    unittest.main()
