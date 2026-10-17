"""Small Supabase HTTP client used by the Flask backend.

The browser only receives the publishable key.  The secret key is read by
this module on the server and is never returned to the frontend.
"""

import json
import os
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen


class SupabaseError(RuntimeError):
    def __init__(self, message, status=None, payload=None):
        super().__init__(message)
        self.status = status
        self.payload = payload


def _read_local_env():
    """Load the project .env without printing or exposing its values."""
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(root, ".env")
    if not os.path.exists(path):
        return
    try:
        with open(path, "r", encoding="utf-8") as env_file:
            for raw_line in env_file:
                line = raw_line.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, value = line.split("=", 1)
                key = key.strip()
                value = value.strip().strip('"').strip("'")
                if key and key not in os.environ:
                    os.environ[key] = value
    except OSError:
        return


_read_local_env()

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").rstrip("/")
SUPABASE_PUBLISHABLE_KEY = os.environ.get("SUPABASE_PUBLISHABLE_KEY", "")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY", "")
USER_AGENT = "MiPlata-Backend/1.0"


def is_configured():
    return bool(SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY)


def public_config():
    return {
        "url": SUPABASE_URL,
        "publishableKey": SUPABASE_PUBLISHABLE_KEY,
    }


def _json_request(url, method="GET", body=None, headers=None):
    request_headers = {
        "Accept": "application/json",
        "User-Agent": USER_AGENT,
    }
    if headers:
        request_headers.update(headers)
    payload = None
    if body is not None:
        payload = json.dumps(body).encode("utf-8")
        request_headers.setdefault("Content-Type", "application/json")

    request = Request(url, data=payload, headers=request_headers, method=method)
    try:
        with urlopen(request, timeout=20) as response:
            raw = response.read().decode("utf-8")
            if not raw:
                return None
            try:
                return json.loads(raw)
            except json.JSONDecodeError:
                return raw
    except HTTPError as error:
        raw = error.read().decode("utf-8", errors="replace")
        try:
            payload = json.loads(raw)
        except json.JSONDecodeError:
            payload = {"message": raw}
        message = payload.get("msg") or payload.get("message") or payload.get("error_description") or payload.get("error") or "Error de Supabase"
        raise SupabaseError(message, status=error.code, payload=payload) from error
    except URLError as error:
        raise SupabaseError("No se pudo conectar con Supabase") from error


def _auth_headers(api_key, bearer=None):
    headers = {"apikey": api_key}
    if bearer:
        headers["Authorization"] = f"Bearer {bearer}"
    return headers


def auth_sign_in(email, password):
    query = urlencode({"grant_type": "password"})
    return _json_request(
        f"{SUPABASE_URL}/auth/v1/token?{query}",
        method="POST",
        body={"email": email, "password": password},
        headers=_auth_headers(SUPABASE_PUBLISHABLE_KEY),
    )


def auth_refresh(refresh_token):
    query = urlencode({"grant_type": "refresh_token"})
    return _json_request(
        f"{SUPABASE_URL}/auth/v1/token?{query}",
        method="POST",
        body={"refresh_token": refresh_token},
        headers=_auth_headers(SUPABASE_PUBLISHABLE_KEY),
    )


def auth_get_user(access_token):
    return _json_request(
        f"{SUPABASE_URL}/auth/v1/user",
        method="GET",
        headers=_auth_headers(SUPABASE_PUBLISHABLE_KEY, access_token),
    )


def auth_admin_create_user(email, password, name, avatar_url=""):
    metadata = {"name": name}
    if avatar_url:
        metadata["avatar_url"] = avatar_url
    return _json_request(
        f"{SUPABASE_URL}/auth/v1/admin/users",
        method="POST",
        body={
            "email": email,
            "password": password,
            "email_confirm": True,
            "user_metadata": metadata,
        },
        headers=_auth_headers(SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY),
    )


def auth_admin_delete_user(user_id):
    return _json_request(
        f"{SUPABASE_URL}/auth/v1/admin/users/{user_id}",
        method="DELETE",
        headers=_auth_headers(SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY),
    )


def rest_request(table, method="GET", params=None, body=None, select=None, returning=False):
    query = dict(params or {})
    if select:
        query["select"] = select
    query_string = urlencode(query, doseq=True)
    url = f"{SUPABASE_URL}/rest/v1/{table}"
    if query_string:
        url = f"{url}?{query_string}"
    headers = _auth_headers(SUPABASE_SECRET_KEY, SUPABASE_SECRET_KEY)
    if returning:
        headers["Prefer"] = "return=representation"
    return _json_request(url, method=method, body=body, headers=headers)
