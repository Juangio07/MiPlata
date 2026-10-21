import os
import io
import csv
import math
import re
from copy import deepcopy
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor
from threading import Lock
from flask import Flask, request, jsonify, send_from_directory, send_file, make_response

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")


def _load_local_env():
    env_path = os.path.join(BASE_DIR, ".env")
    if not os.path.exists(env_path):
        return
    try:
        with open(env_path, "r", encoding="utf-8") as env_file:
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


_load_local_env()
SUPABASE_ENABLED = bool(
    os.environ.get("SUPABASE_URL")
    and os.environ.get("SUPABASE_PUBLISHABLE_KEY")
    and os.environ.get("SUPABASE_SECRET_KEY")
)
if SUPABASE_ENABLED:
    import supabase_client as sb
    import supabase_database as db
else:
    import database as db

app = Flask(__name__, static_folder=FRONTEND_DIR)
app.config["MAX_CONTENT_LENGTH"] = 2 * 1024 * 1024
MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH = 600000

# Demo data is a shared, read-only seed. The browser keeps demo interactions
# in memory, so rebuilding the same Supabase rows on every login only adds
# latency and creates unnecessary concurrent writes. Cache the verified seed
# per process/month and initialize it only when it is missing.
_demo_bootstrap_cache = None
_demo_bootstrap_cache_key = None
_demo_bootstrap_lock = Lock()

DEFAULT_CORS_ORIGINS = {
    "http://127.0.0.1:5000",
    "http://localhost:5000",
    "http://127.0.0.1:3000",
    "http://localhost:3000",
    "https://miplatabyf.netlify.app",
}


def _allowed_cors_origins():
    configured = os.environ.get("CORS_ORIGINS", "")
    if not configured.strip():
        return DEFAULT_CORS_ORIGINS
    return {origin.strip().rstrip("/") for origin in configured.split(",") if origin.strip()}

# Initialize database schema and ensure demo user exists
db.init_db()

@app.after_request
def add_cors_headers(response):
    origin = request.headers.get("Origin", "").rstrip("/")
    if origin and origin in _allowed_cors_origins():
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    if request.path.startswith("/api/"):
        response.headers["Cache-Control"] = "no-store"
    elif request.path.startswith(("/js/", "/css/", "/assets/")):
        response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
    return response


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify({"error": "La solicitud es demasiado grande"}), 413


def get_auth_user_from_req():
    if not SUPABASE_ENABLED:
        return None
    cached = getattr(request, "_miplata_auth_user", None)
    if cached is not None:
        return cached
    authorization = request.headers.get("Authorization", "")
    if not authorization.startswith("Bearer "):
        return None
    token = authorization[7:].strip()
    if not token:
        return None
    try:
        user = sb.auth_get_user(token)
    except sb.SupabaseError:
        user = None
    request._miplata_auth_user = user
    return user


def get_current_user_id_from_req():
    if SUPABASE_ENABLED:
        user = get_auth_user_from_req()
        return user.get("id") if user else None
    return db.get_current_user_id()


def _session_response(auth_data, profile, message):
    # Keep the session under one predictable key while also retaining the
    # top-level fields used by simple clients and older cached builds.
    session = {
        key: auth_data.get(key)
        for key in ("access_token", "refresh_token", "expires_in", "expires_at", "token_type")
        if auth_data.get(key) is not None
    }
    return {"user": profile, "session": session, **session, "message": message}


def _is_valid_email(email):
    return bool(re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", email or ""))


def _parse_amount(value, allow_zero=True):
    try:
        amount = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(amount) or amount < 0 or (not allow_zero and amount == 0):
        return None
    return amount


def _is_valid_month_key(value):
    match = re.fullmatch(r"(\d{4})-(\d{2})", str(value or "").strip())
    return bool(match and 1 <= int(match.group(2)) <= 12)


def _is_past_goal_month(value):
    match = re.fullmatch(r"(\d{4})-(\d{2})(?:-\d{2})?", str(value or "").strip())
    if not match:
        return False
    year, month = int(match.group(1)), int(match.group(2))
    if month < 1 or month > 12:
        return False
    today = datetime.now()
    return (year, month) < (today.year, today.month)


def _is_duplicate_email_error(error):
    payload = error.payload or {}
    details = " ".join(
        str(payload.get(key, ""))
        for key in ("code", "error_code", "msg", "message", "error", "error_description")
    ).lower()
    duplicate_markers = (
        "email_exists",
        "user_already_exists",
        "already registered",
        "already been registered",
        "already exists",
    )
    return error.status == 409 or any(marker in details for marker in duplicate_markers)


def _available_cash_for_user(user_id):
    """Return the current available balance for a savings goal.

    Only recorded expenses and current-month goal contributions reduce this
    balance. Pending fixed obligations are not deducted until the user pays
    them and the linked expense transaction is created.
    """
    current_month = datetime.now().strftime("%Y-%m")
    if SUPABASE_ENABLED:
        with ThreadPoolExecutor(max_workers=2) as pool:
            transactions_future = pool.submit(db.get_transactions, user_id, current_month)
            contributions_future = pool.submit(db.get_goal_contributions, user_id, current_month)
            transactions = transactions_future.result() or []
            contributions = contributions_future.result() or []
    else:
        transactions = db.get_transactions(user_id, current_month) or []
        contributions = db.get_goal_contributions(user_id, current_month) or []

    total_income = sum(
        float(transaction.get("amount") or 0)
        for transaction in transactions
        if transaction.get("type") == "ingreso"
        and str(transaction.get("date") or "").startswith(current_month)
    )
    total_expenses = sum(
        float(transaction.get("amount") or 0)
        for transaction in transactions
        if transaction.get("type") == "gasto"
        and str(transaction.get("date") or "").startswith(current_month)
    )
    total_savings = sum(float(contribution.get("amount") or 0) for contribution in contributions)
    return max(0, total_income - total_expenses - total_savings)

# --- Static Frontend Serving ---
@app.route("/")
def index():
    return send_from_directory(FRONTEND_DIR, "index.html")

@app.route("/<path:path>")
def static_files(path):
    # Check if the requested file exists in FRONTEND_DIR
    full_path = os.path.join(FRONTEND_DIR, path)
    if os.path.exists(full_path) and os.path.isfile(full_path):
        return send_from_directory(FRONTEND_DIR, path)
    return send_from_directory(FRONTEND_DIR, "index.html")

# --- Auth & User Endpoints ---
@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "app": "MiPlata Python Backend", "version": "1.0.0", "supabase": SUPABASE_ENABLED})


@app.route("/api/config", methods=["GET"])
def public_config():
    if not SUPABASE_ENABLED:
        return jsonify({"supabase": False})
    return jsonify({"supabase": True, **sb.public_config()})

@app.route("/api/auth/demo", methods=["POST"])
def auth_demo():
    if SUPABASE_ENABLED:
        demo_email = "demo@miplata.app"
        demo_password = "MiPlataDemo2026!"
        try:
            try:
                # Existing demo accounts can sign in directly. Creating an
                # Auth user first made every demo access perform an admin API
                # request, even when the account was already configured.
                auth_data = sb.auth_sign_in(demo_email, demo_password)
            except sb.SupabaseError as sign_in_error:
                if sign_in_error.status not in (400, 404):
                    raise
                try:
                    sb.auth_admin_create_user(demo_email, demo_password, "Fixelar")
                except sb.SupabaseError as create_error:
                    # Another request may have created the shared account in
                    # the meantime; the sign-in below is the source of truth.
                    if create_error.status not in (400, 409, 422):
                        raise
                auth_data = sb.auth_sign_in(demo_email, demo_password)
            auth_user = auth_data.get("user") or {}
            profile = db.initialize_registered_user(
                auth_user.get("id"),
                "Fixelar",
                demo_email,
                2000000,
                "",
                apply_default_preferences=False,
            )
            bootstrap = get_demo_bootstrap(auth_user.get("id"))
            return jsonify({
                **_session_response(auth_data, profile, "Sesión de demostración iniciada"),
                "bootstrap": bootstrap,
            })
        except sb.SupabaseError as error:
            return jsonify({"error": str(error)}), 502

    db.ensure_demo_user()
    db.set_current_user_id(db.DEMO_USER_ID)
    user = db.get_user_by_id(db.DEMO_USER_ID)
    return jsonify({
        "user": user,
        "bootstrap": get_bootstrap_payload(db.DEMO_USER_ID),
        "message": "Sesión iniciada con la cuenta de demostración",
    })

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    email = data.get("email", "")
    password = data.get("password")

    if SUPABASE_ENABLED:
        if not email or not password:
            return jsonify({"error": "Correo y contraseña son requeridos"}), 400
        try:
            auth_data = sb.auth_sign_in(email.strip().lower(), password)
            auth_user = auth_data.get("user") or {}
            metadata = auth_user.get("user_metadata") or {}
            profile = db.ensure_user_defaults(
                auth_user.get("id"),
                metadata.get("name") or "MiPlata",
                auth_user.get("email") or email.strip().lower(),
                None,
                metadata.get("avatar_url") or "",
            )
            return jsonify(_session_response(auth_data, profile, f"¡Bienvenido de nuevo, {profile['name'].split()[0]}!"))
        except sb.SupabaseError as error:
            if error.status in (400, 401):
                return jsonify({
                    "error": "Correo o contraseña incorrectos."
                }), 400
            return jsonify({"error": "No se pudo iniciar sesión. Intenta nuevamente."}), 502

    user = db.get_user_by_email(email)
    if user and password and user.get("password") == password:
        db.set_current_user_id(user["id"])
        return jsonify({"user": user, "message": f"¡Bienvenido de nuevo, {user['name'].split()[0]}!"})
    return jsonify({"error": "Correo o contraseña incorrectos"}), 401

@app.route("/api/auth/password-reset/request", methods=["POST"])
def auth_password_reset_request():
    if not SUPABASE_ENABLED:
        return jsonify({"error": "La recuperación por correo requiere Supabase"}), 503
    data = request.get_json() or {}
    email = str(data.get("email") or "").strip().lower()
    redirect_to = str(data.get("redirectTo") or "").strip()
    if not _is_valid_email(email):
        return jsonify({"error": "Ingresa un correo electrónico válido"}), 400
    if not re.fullmatch(r"https?://[^\s]+", redirect_to):
        return jsonify({"error": "La URL de recuperación no es válida"}), 400
    try:
        sb.auth_request_password_reset(email, redirect_to)
        return jsonify({"message": "Si el correo está registrado, recibirás un enlace para recuperar tu contraseña."})
    except sb.SupabaseError as error:
        app.logger.warning("Password recovery email failed (status=%s): %s", error.status, error)
        if error.status == 429:
            return jsonify({"error": "Supabase limitó temporalmente los correos de recuperación. Espera unos minutos y vuelve a intentarlo."}), 429
        if error.status is None:
            return jsonify({"error": "No se pudo conectar con el servicio de correo de Supabase. Intenta nuevamente."}), 503
        if error.status in (400, 422):
            return jsonify({"error": "No se pudo enviar el enlace. Verifica la URL de redirección en Supabase."}), 400
        return jsonify({"error": "No se pudo enviar el enlace de recuperación. Intenta nuevamente."}), 502


@app.route("/api/auth/password-reset/confirm", methods=["POST"])
def auth_password_reset_confirm():
    if not SUPABASE_ENABLED:
        return jsonify({"error": "La recuperación por correo requiere Supabase"}), 503
    data = request.get_json() or {}
    access_token = str(data.get("accessToken") or "").strip()
    password = str(data.get("password") or "")
    if not access_token:
        return jsonify({"error": "El enlace de recuperación no es válido o ya expiró"}), 401
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400
    try:
        sb.auth_update_password(access_token, password)
        return jsonify({"message": "Contraseña actualizada correctamente"})
    except sb.SupabaseError as error:
        if error.status in (400, 401, 403, 404):
            return jsonify({"error": "El enlace de recuperación no es válido o ya expiró"}), 401
        return jsonify({"error": "No se pudo actualizar la contraseña. Intenta nuevamente."}), 502


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = str(data.get("password") or "")
    monthly_salary = data.get("monthlySalary", 0)
    avatar_url = data.get("avatarUrl", "")
    if str(avatar_url or "").startswith("data:") and len(str(avatar_url)) > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH:
        return jsonify({"error": "La imagen es demasiado grande. Elige una imagen más pequeña"}), 400

    if not name:
        return jsonify({"error": "El nombre es requerido"}), 400
    if not email:
        return jsonify({"error": "El correo electrónico es requerido"}), 400
    if not _is_valid_email(email):
        return jsonify({"error": "Ingresa un correo electrónico válido"}), 400
    if not password:
        return jsonify({"error": "La contraseña es requerida"}), 400
    if len(password) < 6:
        return jsonify({"error": "La contraseña debe tener al menos 6 caracteres"}), 400

    if SUPABASE_ENABLED:
        try:
            sb.auth_admin_create_user(email, password, name, avatar_url)
            auth_data = sb.auth_sign_in(email, password)
            auth_user = auth_data.get("user") or {}
            profile = db.initialize_registered_user(
                auth_user.get("id"), name, email, float(monthly_salary or 0), avatar_url,
                apply_default_preferences=True,
            )
            return jsonify(_session_response(
                auth_data,
                profile,
                f"¡Cuenta creada, {name.split()[0]}!",
            ))
        except sb.SupabaseError as error:
            if _is_duplicate_email_error(error):
                return jsonify({"error": "Este correo ya está registrado. Inicia sesión o usa otro correo."}), 409
            return jsonify({"error": "No se pudo crear la cuenta. Intenta nuevamente."}), 502

    existing = db.get_user_by_email(email)
    if existing:
        return jsonify({"error": "Ya existe una cuenta con este correo"}), 409

    user = db.create_user(name, email, password, monthly_salary, avatar_url)
    return jsonify({"user": user, "message": f"¡Cuenta creada, {user['name'].split()[0]}!"})

@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    if not SUPABASE_ENABLED:
        db.set_current_user_id(None)
    return jsonify({"message": "Sesión cerrada correctamente"})


@app.route("/api/auth/refresh", methods=["POST"])
def auth_refresh():
    if not SUPABASE_ENABLED:
        return jsonify({"error": "La renovación de sesión requiere Supabase"}), 400
    data = request.get_json() or {}
    refresh_token = data.get("refreshToken")
    if not refresh_token:
        return jsonify({"error": "Sesión expirada"}), 401
    try:
        auth_data = sb.auth_refresh(refresh_token)
        auth_user = auth_data.get("user") or {}
        metadata = auth_user.get("user_metadata") or {}
        profile = db.ensure_user_defaults(
            auth_user.get("id"),
            metadata.get("name") or "MiPlata",
            auth_user.get("email") or "",
            None,
            metadata.get("avatar_url") or "",
        )
        return jsonify(_session_response(auth_data, profile, "Sesión renovada"))
    except sb.SupabaseError:
        return jsonify({"error": "Sesión expirada"}), 401

@app.route("/api/user", methods=["GET"])
def get_user():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"user": None}), 200
    user = db.get_user_by_id(user_id)
    return jsonify({"user": user})

def get_bootstrap_payload(user_id):
    current_month = db.get_current_month_key()
    # Supabase calls are independent reads. Keep one browser request while
    # fetching them concurrently so slower mobile connections do not wait for
    # each table one after another. Only the active month is sent here; older
    # months are loaded on demand from the report endpoint.
    if SUPABASE_ENABLED:
        with ThreadPoolExecutor(max_workers=7) as pool:
            user_future = pool.submit(db.get_user_by_id, user_id)
            transactions_future = pool.submit(db.get_transactions, user_id, current_month)
            fixed_future = pool.submit(db.get_fixed_obligations, user_id)
            goals_future = pool.submit(db.get_savings_goals, user_id)
            contributions_future = pool.submit(db.get_goal_contributions, user_id, current_month)
            budgets_future = pool.submit(db.get_category_budgets, user_id)
            months_future = pool.submit(db.get_record_months, user_id)
            user = user_future.result()
            transactions = transactions_future.result()
            fixed_obligations = fixed_future.result()
            savings_goals = goals_future.result()
            goal_contributions = contributions_future.result()
            category_budgets = budgets_future.result()
            available_months = months_future.result()
    else:
        user = db.get_user_by_id(user_id)
        transactions = db.get_transactions(user_id, current_month)
        fixed_obligations = db.get_fixed_obligations(user_id)
        savings_goals = db.get_savings_goals(user_id)
        goal_contributions = db.get_goal_contributions(user_id, current_month)
        category_budgets = db.get_category_budgets(user_id)
        available_months = db.get_record_months(user_id)

    return {
        "user": user,
        "transactions": transactions,
        "fixedObligations": fixed_obligations,
        "savingsGoals": savings_goals,
        "goalContributions": goal_contributions,
        "categoryBudgets": category_budgets,
        "availableMonths": sorted(set([current_month, *(available_months or [])]), reverse=True),
    }


def _demo_bootstrap_is_ready(bootstrap):
    return bool(bootstrap) and all(
        bootstrap.get(key)
        for key in (
            "transactions",
            "fixedObligations",
            "savingsGoals",
            "goalContributions",
            "categoryBudgets",
        )
    )


def get_demo_bootstrap(user_id):
    """Return the shared demo seed without rebuilding it on every login."""
    global _demo_bootstrap_cache, _demo_bootstrap_cache_key

    cache_key = (str(user_id), db.get_current_month_key())
    with _demo_bootstrap_lock:
        if _demo_bootstrap_cache_key == cache_key and _demo_bootstrap_cache:
            return deepcopy(_demo_bootstrap_cache)

        bootstrap = get_bootstrap_payload(user_id)
        if not _demo_bootstrap_is_ready(bootstrap):
            db.ensure_demo_data(user_id)
            bootstrap = get_bootstrap_payload(user_id)

        _demo_bootstrap_cache_key = cache_key
        _demo_bootstrap_cache = deepcopy(bootstrap)
        return deepcopy(bootstrap)

@app.route("/api/bootstrap", methods=["GET"])
def bootstrap():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    return jsonify(get_bootstrap_payload(user_id))

@app.route("/api/user/profile", methods=["PUT"])
def update_profile():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    avatar_url = str(data.get("avatarUrl") or "")
    if avatar_url.startswith("data:") and len(avatar_url) > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH:
        return jsonify({"error": "La imagen es demasiado grande. Elige una imagen más pequeña"}), 400
    updated = db.update_user(user_id, data)
    return jsonify({"user": updated, "message": "Perfil actualizado"})

@app.route("/api/user/balance", methods=["PUT"])
def update_balance():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    balance = data.get("initialBalance", 0)
    updated = db.update_user(user_id, {"initialBalance": balance})
    return jsonify({"user": updated, "message": "Saldo disponible base actualizado"})

@app.route("/api/user/reset", methods=["POST"])
def reset_data():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    db.reset_user_data(user_id)
    auth_user = get_auth_user_from_req() if SUPABASE_ENABLED else None
    if auth_user and (auth_user.get("email") or "").strip().lower() == "demo@miplata.app":
        db.ensure_demo_data(user_id)
    return jsonify({"message": "Datos reiniciados al estado por defecto"})

@app.route("/api/user", methods=["DELETE"])
def delete_account():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    account = get_auth_user_from_req() if SUPABASE_ENABLED else db.get_user_by_id(user_id)
    if ((account or {}).get("email") or "").strip().lower() == "demo@miplata.app":
        return jsonify({"error": "La cuenta demo está protegida y no se puede eliminar"}), 403
    db.delete_user(user_id)
    if SUPABASE_ENABLED:
        try:
            sb.auth_admin_delete_user(user_id)
        except sb.SupabaseError:
            # The application data is already deleted.  The auth account can
            # be removed manually if the provider is temporarily unavailable.
            return jsonify({"error": "Datos eliminados, pero no se pudo cerrar la cuenta de acceso"}), 502
    return jsonify({"message": "Tu cuenta y datos han sido eliminados"})

# --- Transactions Endpoints ---
@app.route("/api/transactions", methods=["GET"])
def get_transactions():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify([])
    txs = db.get_transactions(user_id)
    return jsonify(txs)

@app.route("/api/transactions", methods=["POST"])
def add_transaction():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    if data.get("type") not in ("gasto", "ingreso"):
        return jsonify({"error": "El tipo de movimiento no es válido"}), 400
    amount = _parse_amount(data.get("amount"))
    if amount is None:
        return jsonify({"error": "El monto debe ser un número mayor o igual a 0"}), 400
    if not str(data.get("category") or "").strip() or not str(data.get("description") or "").strip():
        return jsonify({"error": "La categoría y la descripción son requeridas"}), 400
    data["amount"] = amount
    tx_id = db.add_transaction(user_id, data)
    return jsonify({"id": tx_id, "message": "Movimiento registrado con éxito"})

@app.route("/api/transactions/<tx_id>", methods=["PUT"])
def update_transaction(tx_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    db.update_transaction(user_id, tx_id, data)
    return jsonify({"message": "Movimiento actualizado"})

# --- Fixed Obligations Endpoints ---
@app.route("/api/fixed-obligations", methods=["GET"])
def get_fixed_obligations():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify([])
    obs = db.get_fixed_obligations(user_id)
    return jsonify(obs)

@app.route("/api/fixed-obligations", methods=["POST"])
def add_fixed_obligation():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    amount = _parse_amount(data.get("amount"), allow_zero=False)
    try:
        due_day = int(data.get("dueDay"))
    except (TypeError, ValueError):
        due_day = 0
    if not str(data.get("name") or "").strip() or amount is None or not 1 <= due_day <= 31:
        return jsonify({"error": "Nombre, monto y día de vencimiento son válidos y requeridos"}), 400
    data["amount"] = amount
    data["dueDay"] = due_day
    item_id = db.add_fixed_obligation(user_id, data)
    return jsonify({"id": item_id, "message": "Nuevo gasto fijo agregado"})

@app.route("/api/fixed-obligations/<item_id>", methods=["PUT"])
def update_fixed_obligation(item_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    db.update_fixed_obligation(user_id, item_id, data)
    return jsonify({"message": "Compromiso recurrente actualizado"})

@app.route("/api/fixed-obligations/<item_id>", methods=["DELETE"])
def delete_fixed_obligation(item_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    db.delete_fixed_obligation(user_id, item_id)
    return jsonify({"message": "Obligación eliminada"})

@app.route("/api/fixed-obligations/<item_id>/toggle", methods=["POST"])
def toggle_fixed_obligation(item_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    obligations = db.get_fixed_obligations(user_id) or []
    obligation = next((item for item in obligations if str(item.get("id")) == str(item_id)), None)
    if obligation and obligation.get("status") != "paid":
        available_cash = _available_cash_for_user(user_id)
        amount = float(obligation.get("amount") or 0)
        if amount > available_cash:
            return jsonify({"error": f"No tienes suficiente dinero disponible para pagar este gasto fijo. Te quedan ${available_cash:,.0f} COP"}), 400
    res = db.toggle_pay_fixed_obligation(user_id, item_id)
    if not res:
        return jsonify({"error": "Obligación no encontrada"}), 404
    msg = "Marcado como pagado e integrado a gastos." if res["isPaid"] else "Gasto fijo desmarcado (vuelve a pendiente)."
    return jsonify({"result": res, "message": msg})

# --- Savings Goals Endpoints ---
@app.route("/api/savings-goals", methods=["GET"])
def get_savings_goals():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify([])
    goals = db.get_savings_goals(user_id)
    return jsonify(goals)

@app.route("/api/savings-goals", methods=["POST"])
def add_savings_goal():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    image_url = str(data.get("imageUrl") or "")
    if image_url.startswith("data:") and len(image_url) > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH:
        return jsonify({"error": "La imagen es demasiado grande. Elige una imagen más pequeña"}), 400
    target_amount = _parse_amount(data.get("targetAmount"), allow_zero=False)
    if not str(data.get("name") or "").strip() or target_amount is None:
        return jsonify({"error": "El nombre y el valor objetivo de la meta son requeridos"}), 400
    if _is_past_goal_month(data.get("deadline")):
        return jsonify({"error": "La fecha límite debe ser el mes actual o un mes futuro"}), 400
    data["targetAmount"] = target_amount
    goal_id = db.add_savings_goal(user_id, data)
    return jsonify({"id": goal_id, "message": f"Meta \"{data.get('name')}\" creada con éxito"})

@app.route("/api/savings-goals/<goal_id>", methods=["PUT"])
def update_savings_goal(goal_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    image_url = str(data.get("imageUrl") or "")
    if image_url.startswith("data:") and len(image_url) > MAX_EMBEDDED_IMAGE_DATA_URL_LENGTH:
        return jsonify({"error": "La imagen es demasiado grande. Elige una imagen más pequeña"}), 400
    if "deadline" in data and _is_past_goal_month(data.get("deadline")):
        return jsonify({"error": "La fecha límite debe ser el mes actual o un mes futuro"}), 400
    db.update_savings_goal(user_id, goal_id, data)
    return jsonify({"message": "Meta actualizada"})

@app.route("/api/savings-goals/<goal_id>", methods=["DELETE"])
def delete_savings_goal(goal_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    db.delete_savings_goal(user_id, goal_id)
    return jsonify({"message": "Meta de ahorro eliminada"})

@app.route("/api/savings-goals/<goal_id>/contribute", methods=["POST"])
def contribute_goal(goal_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    amount = _parse_amount(data.get("amount"), allow_zero=False)
    contrib_type = data.get("type", "Manual")
    if amount is None:
        return jsonify({"error": "El monto debe ser mayor a 0"}), 400
    available_cash = _available_cash_for_user(user_id)
    if amount > available_cash:
        return jsonify({
            "error": f"No tienes suficiente dinero disponible. Te quedan ${available_cash:,.0f} COP"
        }), 400

    res = db.contribute_to_goal(user_id, goal_id, amount, contrib_type)
    if not res:
        return jsonify({"error": "Meta no encontrada"}), 404
    return jsonify({"result": res, "message": f"¡Has reservado ${amount:,.0f} COP para tu meta!"})

@app.route("/api/goal-contributions", methods=["GET"])
def get_goal_contributions():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify([])
    contribs = db.get_goal_contributions(user_id)
    return jsonify(contribs)

@app.route("/api/reports/monthly", methods=["GET"])
def get_monthly_report():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    month_key = request.args.get("month", db.get_current_month_key())
    if not _is_valid_month_key(month_key):
        return jsonify({"error": "El mes solicitado no es válido"}), 400
    return jsonify({
        "month": month_key,
        "transactions": db.get_transactions(user_id, month_key),
        "goalContributions": db.get_goal_contributions(user_id, month_key),
    })

# --- Category Budgets Endpoints ---
@app.route("/api/category-budgets", methods=["GET"])
def get_category_budgets():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify([])
    budgets = db.get_category_budgets(user_id)
    return jsonify(budgets)

@app.route("/api/category-budgets", methods=["PUT"])
def update_category_budget():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
    category = str(data.get("category") or "").strip()
    limit_amount = _parse_amount(data.get("limit"))
    if not category or limit_amount is None:
        return jsonify({"error": "La categoría y el límite deben ser válidos"}), 400
    db.update_category_budget(user_id, category, limit_amount)
    return jsonify({"message": f"Presupuesto para {category} actualizado"})

# --- Export CSV Endpoint ---
@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    user = db.get_user_by_id(user_id)
    month_key = request.args.get("month", db.get_current_month_key())
    month_label = db.format_month_key_to_label(month_key)
    report = {
        "transactions": db.get_transactions(user_id, month_key),
        "goalContributions": db.get_goal_contributions(user_id, month_key),
    }
    month_txs = list(report["transactions"])
    month_txs.extend({
        "type": "gasto",
        "amount": contribution["amount"],
        "category": "Metas",
        "description": f"Aporte a {contribution.get('goalName') or 'meta'}",
        "date": contribution.get("date", ""),
    } for contribution in report["goalContributions"])
    total_income = sum(t["amount"] for t in month_txs if t["type"] == "ingreso")
    total_expenses = sum(t["amount"] for t in month_txs if t["type"] == "gasto")
    net_savings = total_income - total_expenses
    savings_rate = (net_savings / total_income * 100) if total_income > 0 else 0

    # Build CSV with BOM (\uFEFF)
    output = io.StringIO()
    output.write("\uFEFF")
    writer = csv.writer(output)

    writer.writerow(["REPORTE FINANCIERO MENSUAL - MIPLATA"])
    writer.writerow(["Período", month_label])
    writer.writerow(["Usuario", user["name"] if user else "Usuario"])
    writer.writerow(["Correo", user["email"] if user else "N/A"])
    writer.writerow(["Total Ingresos", total_income])
    writer.writerow(["Total Gastos", total_expenses])
    writer.writerow(["Ahorro Neto", net_savings])
    writer.writerow(["Tasa de Ahorro", f"{savings_rate:.1f}%"])
    writer.writerow([])
    writer.writerow(["Fecha", "Tipo", "Categoría", "Descripción", "Monto COP"])

    for t in month_txs:
        amt = t["amount"] if t["type"] == "ingreso" else -t["amount"]
        writer.writerow([t["date"], t["type"].capitalize(), t["category"], t["description"], amt])

    output.seek(0)
    bytes_io = io.BytesIO(output.getvalue().encode('utf-8-sig'))
    clean_month = month_label.replace(" ", "_")
    filename = f"Reporte_Financiero_{clean_month}.csv"

    return send_file(
        bytes_io,
        mimetype="text/csv",
        as_attachment=True,
        download_name=filename
    )

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print(f"Starting MiPlata backend server on port {port}...")
    debug = os.environ.get("FLASK_DEBUG", "0") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug, threaded=True)
