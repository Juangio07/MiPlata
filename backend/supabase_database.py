"""Supabase-backed implementation of the database functions used by MiPlata.

The public Flask routes pass a user id obtained from a verified Supabase JWT.
Every REST operation below also includes that id as a PostgREST filter.  RLS
therefore remains active even if this adapter is accidentally called with a
different id.
"""

import time
from datetime import datetime, timezone
from concurrent.futures import ThreadPoolExecutor

import supabase_client as sb


DEMO_USER_ID = None
SPANISH_MONTHS = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

DEFAULT_CATEGORIES = [
    ("Alimentación", 700000, "restaurant"),
    ("Compras", 350000, "shopping_bag"),
    ("Educación", 200000, "school"),
    ("Entretenimiento", 300000, "sports_esports"),
    ("Transporte", 250000, "directions_car"),
]


def init_db():
    """No-op: schema creation is deliberately managed in Supabase SQL Editor."""
    return None


def ensure_demo_user():
    return None


def get_current_user_id():
    return None


def set_current_user_id(_user_id):
    return None


def get_current_month_key():
    now = datetime.now()
    return f"{now.year}-{now.month:02d}"


def _month_bounds(month_key):
    """Return inclusive/exclusive ISO dates for a YYYY-MM report period."""
    year, month = (int(part) for part in str(month_key).split("-", 1))
    if month == 12:
        next_year, next_month = year + 1, 1
    else:
        next_year, next_month = year, month + 1
    return f"{year:04d}-{month:02d}-01", f"{next_year:04d}-{next_month:02d}-01"


def get_relative_month_key(offset_months):
    now = datetime.now()
    year = now.year
    month = now.month - offset_months
    while month <= 0:
        month += 12
        year -= 1
    return f"{year}-{month:02d}"


def format_month_key_to_label(month_key):
    if not month_key or "-" not in month_key:
        month_key = get_current_month_key()
    year, month = month_key.split("-", 1)
    try:
        month_name = SPANISH_MONTHS[int(month) - 1]
    except (ValueError, IndexError):
        month_name = month
    return f"{month_name} {year}"


def _num(value):
    if value is None:
        return 0
    try:
        return float(value)
    except (TypeError, ValueError):
        return value


def _bool(value):
    return bool(value)


def _iso_date(value, fallback_today=False):
    raw = str(value or "").strip()
    if len(raw) == 10 and raw[4] == "-" and raw[7] == "-":
        return raw
    normalized = raw.casefold()
    month_year = normalized.split()
    if len(month_year) == 2 and month_year[1].isdigit() and len(month_year[1]) == 4:
        try:
            month_index = next(
                index for index, month in enumerate(SPANISH_MONTHS)
                if month.casefold() == month_year[0]
            )
            return f"{month_year[1]}-{month_index + 1:02d}-01"
        except StopIteration:
            pass
    for separator in ("/", "-"):
        parts = raw.split(separator)
        if len(parts) == 3 and all(part.isdigit() for part in parts):
            day, month, year = parts
            if len(year) == 4 and 1 <= int(month) <= 12 and 1 <= int(day) <= 31:
                return f"{year}-{int(month):02d}-{int(day):02d}"
    return datetime.now().strftime("%Y-%m-%d") if fallback_today else None


def _created_at_ms(value):
    if isinstance(value, (int, float)):
        return int(value)
    if value:
        try:
            normalized = str(value).replace("Z", "+00:00")
            return int(datetime.fromisoformat(normalized).timestamp() * 1000)
        except (TypeError, ValueError, OverflowError):
            pass
    return int(time.time() * 1000)


def _profile_to_dict(row):
    if not row:
        return None
    member_since = row.get("member_since")
    if member_since:
        member_since = format_month_key_to_label(str(member_since)[:7])
    return {
        "id": row.get("id"),
        "name": row.get("name") or "MiPlata",
        "email": row.get("email") or "",
        "password": None,
        "avatarUrl": row.get("avatar_url") or "",
        "plan": row.get("plan") or "Plan Personal Activo",
        "memberSince": member_since or format_month_key_to_label(get_current_month_key()),
        "isLocalOnly": False,
        "monthlySalary": _num(row.get("monthly_salary")),
        "initialBalance": _num(row.get("initial_balance")),
        "monthlyBudgetLimit": _num(row.get("monthly_budget_limit")),
        "budgetRule": {
            "needs": _num(row.get("budget_needs")),
            "wants": _num(row.get("budget_wants")),
            "savings": _num(row.get("budget_savings")),
        },
        "alert80Percent": _bool(row.get("alert_80_percent")),
        "autoAdjustVariable": _bool(row.get("auto_adjust_variable")),
        "currency": row.get("currency") or "COP",
        "quickKeypad": True,
        "resetDay": row.get("reset_day") or 1,
        "smartCategorization": _bool(row.get("smart_categorization")),
    }


def get_user_by_id(user_id, timeout=None):
    rows = sb.rest_request(
        "profiles",
        params={"id": f"eq.{user_id}", "limit": 1},
        select="id,name,email,avatar_url,plan,member_since,monthly_salary,initial_balance,monthly_budget_limit,budget_needs,budget_wants,budget_savings,alert_80_percent,auto_adjust_variable,currency,reset_day,smart_categorization",
        timeout=timeout,
    ) or []
    return _profile_to_dict(rows[0]) if rows else None


def get_user_by_email(email):
    rows = sb.rest_request(
        "profiles",
        params={"email": f"eq.{email.strip().lower()}", "limit": 1},
    ) or []
    return _profile_to_dict(rows[0]) if rows else None


def ensure_user_defaults(user_id, name=None, email=None, monthly_salary=0, avatar_url="", apply_default_preferences=False):
    """Complete the profile created by the auth trigger and seed its budgets."""
    current_rows = sb.rest_request("profiles", params={"id": f"eq.{user_id}", "limit": 1}) or []
    if not current_rows:
        # The auth trigger normally creates this row.  This fallback is useful
        # if the trigger was temporarily disabled while setting up a project.
        sb.rest_request(
            "profiles",
            method="POST",
            body={
                "id": user_id,
                "name": name or "MiPlata",
                "email": email or "",
                "avatar_url": avatar_url or None,
                "monthly_salary": monthly_salary or 0,
                "monthly_budget_limit": monthly_salary or 0,
                "initial_balance": 0,
                "alert_80_percent": True,
                "auto_adjust_variable": True,
                "smart_categorization": True,
            },
            returning=True,
        )
    else:
        patch = {}
        if name:
            patch["name"] = name
        if email:
            patch["email"] = email.lower()
        if avatar_url:
            patch["avatar_url"] = avatar_url
        if monthly_salary is not None:
            patch["monthly_salary"] = monthly_salary or 0
            if not current_rows[0].get("monthly_budget_limit"):
                patch["monthly_budget_limit"] = monthly_salary or 0
        if apply_default_preferences:
            patch.update({
                "alert_80_percent": True,
                "auto_adjust_variable": True,
                "smart_categorization": True,
            })
        if patch:
            sb.rest_request("profiles", method="PATCH", params={"id": f"eq.{user_id}"}, body=patch)

    budgets = sb.rest_request("category_budgets", params={"user_id": f"eq.{user_id}", "limit": 1}) or []
    if not budgets:
        rows = [
            {
                "id": f"cb_{user_id}_{category}",
                "user_id": user_id,
                "category": category,
                "limit_amount": limit_value,
                "icon": icon,
            }
            for category, limit_value, icon in DEFAULT_CATEGORIES
        ]
        sb.rest_request("category_budgets", method="POST", body=rows, returning=True)
    return get_user_by_id(user_id)


def initialize_registered_user(user_id, name, email, monthly_salary=0, avatar_url="", apply_default_preferences=True):
    user = ensure_user_defaults(user_id, name, email, monthly_salary, avatar_url, apply_default_preferences)
    # The salary selected during registration is only an estimate used for
    # planning. It is not an income that has already been received.
    return get_user_by_id(user_id)


def ensure_demo_data(user_id):
    """Reset the demo account to a coherent COP 2,000,000 example dataset."""
    now = datetime.now()
    current_month = now.strftime("%Y-%m")
    day = max(1, min(28, now.day))
    date_from_today = lambda offset: f"{current_month}-{max(1, day - offset):02d}"
    month_date = lambda offset, month_day: f"{get_relative_month_key(offset)}-{month_day:02d}"
    timestamp_now = int(time.time() * 1000)

    transactions = [
        {"id": "demo_tx_income", "user_id": user_id, "type": "ingreso", "amount": 2000000, "category": "Nómina", "description": "Nómina mensual", "date": date_from_today(3), "time": "08:30:00", "account_method": "Bancolombia", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_food", "user_id": user_id, "type": "gasto", "amount": 240000, "category": "Alimentación", "description": "Mercado de la semana", "date": date_from_today(1), "time": "18:15:00", "account_method": "Tarjeta Débito", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_transport", "user_id": user_id, "type": "gasto", "amount": 85000, "category": "Transporte", "description": "Gasolina y transporte", "date": date_from_today(2), "time": "17:45:00", "account_method": "Nequi QR", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_health", "user_id": user_id, "type": "gasto", "amount": 45000, "category": "Salud", "description": "Medicamentos", "date": date_from_today(4), "time": "11:10:00", "account_method": "Efectivo", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_internet", "user_id": user_id, "type": "gasto", "amount": 80000, "category": "Servicios", "description": "Pago Internet Fibra", "date": date_from_today(5), "time": "09:00:00", "account_method": "Débito automático", "is_recurring": True, "fixed_obligation_id": "demo_fixed_internet"},
        {"id": "demo_tx_services", "user_id": user_id, "type": "gasto", "amount": 120000, "category": "Servicios", "description": "Pago servicios públicos", "date": date_from_today(6), "time": "14:00:00", "account_method": "PSE", "is_recurring": False, "fixed_obligation_id": "demo_fixed_services"},
        {"id": "demo_tx_previous_1_income_salary", "user_id": user_id, "type": "ingreso", "amount": 2000000, "category": "Nómina", "description": "Nómina mensual", "date": month_date(1, 15), "time": "08:30:00", "account_method": "Bancolombia", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_income_extra", "user_id": user_id, "type": "ingreso", "amount": 250000, "category": "Honorarios", "description": "Trabajo freelance", "date": month_date(1, 26), "time": "16:00:00", "account_method": "Nequi", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_rent", "user_id": user_id, "type": "gasto", "amount": 500000, "category": "Vivienda", "description": "Arriendo del apartamento", "date": month_date(1, 5), "time": "10:00:00", "account_method": "Transferencia Bancaria", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_food", "user_id": user_id, "type": "gasto", "amount": 300000, "category": "Alimentación", "description": "Mercado mensual", "date": month_date(1, 8), "time": "17:30:00", "account_method": "Tarjeta Débito", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_services", "user_id": user_id, "type": "gasto", "amount": 150000, "category": "Servicios", "description": "Servicios públicos e internet", "date": month_date(1, 12), "time": "14:15:00", "account_method": "PSE", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_transport", "user_id": user_id, "type": "gasto", "amount": 100000, "category": "Transporte", "description": "Gasolina y transporte", "date": month_date(1, 18), "time": "18:30:00", "account_method": "Bancolombia Débito", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_1_leisure", "user_id": user_id, "type": "gasto", "amount": 80000, "category": "Entretenimiento", "description": "Cine y salida de fin de semana", "date": month_date(1, 22), "time": "20:45:00", "account_method": "Tarjeta Crédito", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_income_salary", "user_id": user_id, "type": "ingreso", "amount": 2000000, "category": "Nómina", "description": "Nómina mensual", "date": month_date(2, 15), "time": "08:30:00", "account_method": "Bancolombia", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_income_extra", "user_id": user_id, "type": "ingreso", "amount": 180000, "category": "Honorarios", "description": "Asesoría independiente", "date": month_date(2, 26), "time": "16:00:00", "account_method": "Nequi", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_rent", "user_id": user_id, "type": "gasto", "amount": 500000, "category": "Vivienda", "description": "Arriendo del apartamento", "date": month_date(2, 5), "time": "10:00:00", "account_method": "Transferencia Bancaria", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_food", "user_id": user_id, "type": "gasto", "amount": 340000, "category": "Alimentación", "description": "Mercado y alimentos del hogar", "date": month_date(2, 10), "time": "18:00:00", "account_method": "Tarjeta Débito", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_services", "user_id": user_id, "type": "gasto", "amount": 170000, "category": "Servicios", "description": "Servicios públicos e internet", "date": month_date(2, 14), "time": "14:30:00", "account_method": "PSE", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_transport", "user_id": user_id, "type": "gasto", "amount": 110000, "category": "Transporte", "description": "Gasolina y mantenimiento", "date": month_date(2, 19), "time": "17:15:00", "account_method": "Nequi", "is_recurring": False, "fixed_obligation_id": None},
        {"id": "demo_tx_previous_2_shopping", "user_id": user_id, "type": "gasto", "amount": 160000, "category": "Compras", "description": "Ropa y artículos para el hogar", "date": month_date(2, 22), "time": "16:30:00", "account_method": "Tarjeta Crédito", "is_recurring": False, "fixed_obligation_id": None},
    ]
    fixed = [
        {"id": "demo_fixed_rent", "user_id": user_id, "name": "Arriendo", "amount": 500000, "due_day": 5, "category": "Vivienda", "status": "pending", "paid_date": None, "reminder_days_before": 3, "is_automatic": False, "notes": "Pago mensual del apartamento"},
        {"id": "demo_fixed_internet", "user_id": user_id, "name": "Internet Fibra", "amount": 80000, "due_day": 8, "category": "Servicios", "status": "paid", "paid_date": date_from_today(5), "reminder_days_before": 3, "is_automatic": True, "notes": "Internet del hogar"},
        {"id": "demo_fixed_services", "user_id": user_id, "name": "Servicios públicos", "amount": 120000, "due_day": 15, "category": "Servicios", "status": "paid", "paid_date": date_from_today(6), "reminder_days_before": 3, "is_automatic": False, "notes": "Luz, agua y gas"},
    ]
    goals = [
        {"id": "demo_goal_emergency", "user_id": user_id, "name": "Fondo de Emergencia", "target_amount": 3000000, "current_amount": 120000, "deadline": f"{now.year + 1}-06-30", "icon": "shield", "color": "#0058bc", "category": "Seguridad", "image_url": ""},
        {"id": "demo_goal_trip", "user_id": user_id, "name": "Viaje familiar", "target_amount": 1800000, "current_amount": 80000, "deadline": f"{now.year + 1}-12-15", "icon": "flight", "color": "#00838f", "category": "Viajes", "image_url": ""},
    ]
    contributions = [
        {"id": "demo_contribution_1", "user_id": user_id, "goal_id": "demo_goal_emergency", "goal_name": "Fondo de Emergencia", "amount": 120000, "date": date_from_today(1), "type": "Automático", "timestamp": timestamp_now - 3600000},
        {"id": "demo_contribution_2", "user_id": user_id, "goal_id": "demo_goal_trip", "goal_name": "Viaje familiar", "amount": 80000, "date": date_from_today(3), "type": "Manual", "timestamp": timestamp_now - 7200000},
    ]
    category_budgets = [
        {"id": f"cb_{user_id}_{category}", "user_id": user_id, "category": category, "limit_amount": limit, "icon": icon}
        for category, limit, icon in [
            ("Alimentación", 400000, "restaurant"), ("Compras", 150000, "shopping_bag"),
            ("Educación", 100000, "school"), ("Entretenimiento", 150000, "sports_esports"),
            ("Transporte", 180000, "directions_car"),
        ]
    ]

    # The demo is intentionally ephemeral: every new demo session starts from
    # this clean dataset, so interactions never become permanent records.
    # Contributions reference savings_goals, so remove them first and create
    # them last. Keeping the unrelated tables concurrent preserves fast demo
    # login without racing the foreign-key relationship.
    sb.rest_request("goal_contributions", method="DELETE", params={"user_id": f"eq.{user_id}"})
    with ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(
            lambda table: sb.rest_request(table, method="DELETE", params={"user_id": f"eq.{user_id}"}),
            ("transactions", "fixed_obligations", "category_budgets"),
        ))
    sb.rest_request("savings_goals", method="DELETE", params={"user_id": f"eq.{user_id}"})

    independent_writes = [
        lambda: sb.rest_request(
            "profiles",
            method="PATCH",
            params={"id": f"eq.{user_id}"},
            body={"name": "Fixelar", "monthly_salary": 2000000, "monthly_budget_limit": 2000000, "budget_needs": 50, "budget_wants": 30, "budget_savings": 20, "alert_80_percent": True, "auto_adjust_variable": True, "smart_categorization": True},
        ),
        lambda: sb.rest_request("category_budgets", method="POST", body=category_budgets, returning=True),
        lambda: sb.rest_request("transactions", method="POST", body=transactions, returning=True),
        lambda: sb.rest_request("fixed_obligations", method="POST", body=fixed, returning=True),
    ]
    with ThreadPoolExecutor(max_workers=len(independent_writes)) as pool:
        list(pool.map(lambda write: write(), independent_writes))
    sb.rest_request("savings_goals", method="POST", body=goals, returning=True)
    sb.rest_request("goal_contributions", method="POST", body=contributions, returning=True)


def update_user(user_id, updates):
    field_map = {
        "name": "name",
        "email": "email",
        "avatarUrl": "avatar_url",
        "monthlySalary": "monthly_salary",
        "initialBalance": "initial_balance",
        "monthlyBudgetLimit": "monthly_budget_limit",
        "alert80Percent": "alert_80_percent",
        "autoAdjustVariable": "auto_adjust_variable",
        "smartCategorization": "smart_categorization",
    }
    patch = {}
    for key, value in updates.items():
        if key in field_map:
            patch[field_map[key]] = value
        elif key == "budgetRule" and isinstance(value, dict):
            for nested_key in ("needs", "wants", "savings"):
                if nested_key in value:
                    patch[f"budget_{nested_key}"] = value[nested_key]
    if patch:
        sb.rest_request("profiles", method="PATCH", params={"id": f"eq.{user_id}"}, body=patch)
    return get_user_by_id(user_id)


def delete_user(user_id):
    # Explicit deletes keep this safe even if a project's FK cascade differs
    # from the migration file.
    for table in ("goal_contributions", "transactions", "fixed_obligations", "savings_goals", "category_budgets", "profiles"):
        sb.rest_request(table, method="DELETE", params={"user_id" if table != "profiles" else "id": f"eq.{user_id}"})


def get_transactions(user_id, month_key=None, timeout=None):
    params = {"user_id": f"eq.{user_id}", "order": "date.desc,created_at.desc"}
    if month_key:
        start_date, end_date = _month_bounds(month_key)
        # PostgREST combines repeated filters for the same column with AND.
        # Sending `date.lt` creates an invalid filter expression.
        params["date"] = [f"gte.{start_date}", f"lt.{end_date}"]
    rows = sb.rest_request(
        "transactions",
        params=params,
        select="id,user_id,type,amount,category,description,date,time,account_method,is_recurring,fixed_obligation_id,created_at",
        timeout=timeout,
    ) or []
    return [
        {
            "id": row.get("id"),
            "userId": row.get("user_id"),
            "type": row.get("type"),
            "amount": _num(row.get("amount")),
            "category": row.get("category"),
            "description": row.get("description"),
            "date": str(row.get("date") or "")[:10],
            "time": row.get("time") or "",
            "accountMethod": row.get("account_method") or "",
            "isRecurring": _bool(row.get("is_recurring")),
            "fixedObligationId": row.get("fixed_obligation_id"),
            "createdAt": _created_at_ms(row.get("created_at")),
        }
        for row in rows
    ]


def add_transaction(user_id, tx):
    tx_id = tx.get("id") or f"tx_{int(time.time() * 1000)}"
    created_at = tx.get("createdAt")
    row = {
        "id": tx_id,
        "user_id": user_id,
        "type": tx["type"],
        "amount": tx["amount"],
        "category": tx["category"],
        "description": tx["description"],
        "date": _iso_date(tx.get("date"), True),
        "time": tx.get("time") or datetime.now().strftime("%H:%M:%S"),
        "account_method": tx.get("accountMethod", ""),
        "is_recurring": bool(tx.get("isRecurring")),
        "fixed_obligation_id": tx.get("fixedObligationId"),
    }
    if created_at:
        row["created_at"] = datetime.fromtimestamp(_created_at_ms(created_at) / 1000, tz=timezone.utc).isoformat()
    sb.rest_request("transactions", method="POST", body=row, returning=True)
    return tx_id


def update_transaction(user_id, tx_id, updates):
    field_map = {"description": "description"}
    patch = {field_map[key]: value for key, value in updates.items() if key in field_map}
    if patch:
        sb.rest_request("transactions", method="PATCH", params={"id": f"eq.{tx_id}", "user_id": f"eq.{user_id}"}, body=patch)


def delete_transaction(user_id, tx_id):
    sb.rest_request("transactions", method="DELETE", params={"id": f"eq.{tx_id}", "user_id": f"eq.{user_id}"})


def reset_monthly_fixed_obligations(user_id, month_key=None, timeout=None):
    """Reset recurring payment state without deleting closed-month records."""
    month_key = month_key or get_current_month_key()
    rows = sb.rest_request(
        "fixed_obligations",
        params={"user_id": f"eq.{user_id}"},
        select="id,status,paid_date",
        timeout=timeout,
    ) or []
    stale_rows = [
        row for row in rows
        if row.get("status") == "paid" and not str(row.get("paid_date") or "").startswith(month_key)
    ]
    for row in stale_rows:
        sb.rest_request(
            "fixed_obligations",
            method="PATCH",
            params={"id": f"eq.{row.get('id')}", "user_id": f"eq.{user_id}"},
            body={"status": "pending", "paid_date": None},
        )
    return len(stale_rows)


def get_fixed_obligations(user_id, timeout=None):
    rows = sb.rest_request(
        "fixed_obligations",
        params={"user_id": f"eq.{user_id}", "order": "due_day.asc"},
        select="id,user_id,name,amount,due_day,category,status,paid_date,reminder_days_before,is_automatic,notes",
        timeout=timeout,
    ) or []
    current_month = get_current_month_key()
    stale_rows = [
        row
        for row in rows
        if row.get("status") == "paid"
        and not str(row.get("paid_date") or "").startswith(current_month)
    ]
    for row in stale_rows:
        sb.rest_request(
            "fixed_obligations",
            method="PATCH",
            params={"id": f"eq.{row.get('id')}", "user_id": f"eq.{user_id}"},
            body={"status": "pending", "paid_date": None},
            timeout=timeout,
        )
        row["status"] = "pending"
        row["paid_date"] = None
    return [
        {
            "id": row.get("id"), "userId": row.get("user_id"), "name": row.get("name"),
            "amount": _num(row.get("amount")), "dueDay": row.get("due_day"),
            "category": row.get("category"), "status": row.get("status"),
            "paidDate": row.get("paid_date"), "reminderDaysBefore": row.get("reminder_days_before"),
            "isAutomatic": _bool(row.get("is_automatic")), "notes": row.get("notes") or "",
        }
        for row in rows
    ]


def add_fixed_obligation(user_id, item):
    item_id = item.get("id") or f"fix_{int(time.time() * 1000)}"
    row = {
        "id": item_id, "user_id": user_id, "name": item["name"], "amount": item["amount"],
        "due_day": item["dueDay"], "category": item["category"], "status": item.get("status", "pending"),
        "paid_date": _iso_date(item.get("paidDate")),
        "reminder_days_before": item.get("reminderDaysBefore", 3),
        "is_automatic": bool(item.get("isAutomatic")), "notes": item.get("notes", ""),
    }
    sb.rest_request("fixed_obligations", method="POST", body=row, returning=True)
    return item_id


def update_fixed_obligation(user_id, item_id, updates):
    field_map = {
        "name": "name", "amount": "amount", "dueDay": "due_day", "category": "category",
        "status": "status", "paidDate": "paid_date", "reminderDaysBefore": "reminder_days_before",
        "isAutomatic": "is_automatic", "notes": "notes",
    }
    patch = {field_map[key]: value for key, value in updates.items() if key in field_map}
    if "paid_date" in patch:
        patch["paid_date"] = _iso_date(patch["paid_date"])
    if patch:
        sb.rest_request("fixed_obligations", method="PATCH", params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"}, body=patch)


def delete_fixed_obligation(user_id, item_id):
    sb.rest_request("transactions", method="DELETE", params={"fixed_obligation_id": f"eq.{item_id}", "user_id": f"eq.{user_id}"})
    sb.rest_request("fixed_obligations", method="DELETE", params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"})


def toggle_pay_fixed_obligation(user_id, item_id):
    rows = sb.rest_request("fixed_obligations", params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}", "limit": 1}) or []
    if not rows:
        return None
    row = rows[0]
    is_now_paid = row.get("status") != "paid"
    new_status = "paid" if is_now_paid else "pending"
    transaction_id = None
    sb.rest_request(
        "fixed_obligations",
        method="PATCH",
        params={"id": f"eq.{item_id}", "user_id": f"eq.{user_id}"},
        body={"status": new_status, "paid_date": datetime.now().strftime("%Y-%m-%d") if is_now_paid else None},
    )
    if is_now_paid:
        existing = sb.rest_request("transactions", params={"fixed_obligation_id": f"eq.{item_id}", "user_id": f"eq.{user_id}", "limit": 1}) or []
        if existing:
            transaction_id = existing[0].get("id")
        else:
            transaction_id = f"tx_fix_{item_id}_{int(time.time() * 1000)}"
            add_transaction(user_id, {
                "id": transaction_id,
                "type": "gasto", "amount": _num(row.get("amount")), "category": row.get("category"),
                "description": f"{row.get('name')} (Gasto Fijo)", "date": datetime.now().strftime("%Y-%m-%d"),
                "time": datetime.now().strftime("%H:%M:%S"), "accountMethod": "Fijo Mensual",
                "isRecurring": True, "fixedObligationId": item_id,
            })
    else:
        sb.rest_request("transactions", method="DELETE", params={"fixed_obligation_id": f"eq.{item_id}", "user_id": f"eq.{user_id}"})
    return {"status": new_status, "isPaid": is_now_paid, "transactionId": transaction_id}


def get_savings_goals(user_id, sync_current_amount=True, timeout=None):
    rows = sb.rest_request(
        "savings_goals",
        params={"user_id": f"eq.{user_id}", "order": "created_at.asc"},
        select="id,user_id,name,target_amount,current_amount,deadline,icon,color,category,image_url",
        timeout=timeout,
    ) or []
    contributions = get_goal_contributions(user_id, timeout=timeout) if sync_current_amount else None
    totals = {}
    for contribution in contributions or []:
        goal_id = str(contribution.get("goalId") or "")
        if goal_id:
            totals[goal_id] = totals.get(goal_id, 0) + _num(contribution.get("amount"))

    result = []
    for row in rows:
        goal_id = str(row.get("id") or "")
        contributed_amount = totals.get(goal_id, _num(row.get("current_amount")))
        if sync_current_amount and _num(row.get("current_amount")) != contributed_amount:
            sb.rest_request(
                "savings_goals",
                method="PATCH",
                params={"id": f"eq.{goal_id}", "user_id": f"eq.{user_id}"},
                body={"current_amount": contributed_amount},
                timeout=timeout,
            )
        result.append({
            "id": row.get("id"), "userId": row.get("user_id"), "name": row.get("name"),
            "targetAmount": _num(row.get("target_amount")), "currentAmount": contributed_amount,
            "deadline": row.get("deadline") or "", "icon": row.get("icon"), "color": row.get("color"),
            "category": row.get("category") or "", "imageUrl": row.get("image_url") or "",
        })
    return result


def add_savings_goal(user_id, goal):
    goal_id = goal.get("id") or f"goal_{int(time.time() * 1000)}"
    row = {
        "id": goal_id, "user_id": user_id, "name": goal["name"], "target_amount": goal["targetAmount"],
        "current_amount": 0, "deadline": _iso_date(goal.get("deadline")),
        "icon": goal.get("icon", "laptop"), "color": goal.get("color", "#0058bc"),
        "category": goal.get("category", ""), "image_url": goal.get("imageUrl", ""),
    }
    sb.rest_request("savings_goals", method="POST", body=row, returning=True)
    return goal_id


def update_savings_goal(user_id, goal_id, updates):
    field_map = {
        "name": "name", "targetAmount": "target_amount",
        "deadline": "deadline", "icon": "icon", "color": "color", "category": "category", "imageUrl": "image_url",
    }
    patch = {field_map[key]: value for key, value in updates.items() if key in field_map}
    if "deadline" in patch:
        patch["deadline"] = _iso_date(patch["deadline"])
    if patch:
        sb.rest_request("savings_goals", method="PATCH", params={"id": f"eq.{goal_id}", "user_id": f"eq.{user_id}"}, body=patch)


def delete_savings_goal(user_id, goal_id):
    # Remove dependent contributions first so the foreign-key relation does
    # not reject the goal deletion in Supabase.
    sb.rest_request(
        "goal_contributions",
        method="DELETE",
        params={"goal_id": f"eq.{goal_id}", "user_id": f"eq.{user_id}"},
    )
    sb.rest_request("savings_goals", method="DELETE", params={"id": f"eq.{goal_id}", "user_id": f"eq.{user_id}"})


def contribute_to_goal(user_id, goal_id, amount, contribution_type="Manual"):
    with ThreadPoolExecutor(max_workers=2) as pool:
        goal_future = pool.submit(
            sb.rest_request,
            "savings_goals",
            params={"id": f"eq.{goal_id}", "user_id": f"eq.{user_id}", "limit": 1},
        )
        contribution_future = pool.submit(
            sb.rest_request,
            "goal_contributions",
            params={"goal_id": f"eq.{goal_id}", "user_id": f"eq.{user_id}", "select": "amount"},
        )
        rows = goal_future.result() or []
        contribution_rows = contribution_future.result() or []
    if not rows:
        return None
    goal = rows[0]
    contributed_amount = sum(_num(row.get("amount")) for row in contribution_rows)
    new_amount = contributed_amount + amount
    sb.rest_request("savings_goals", method="PATCH", params={"id": f"eq.{goal_id}", "user_id": f"eq.{user_id}"}, body={"current_amount": new_amount})
    contribution_id = f"contrib_{int(time.time() * 1000)}"
    sb.rest_request(
        "goal_contributions",
        method="POST",
        body={
            "id": contribution_id, "user_id": user_id, "goal_id": goal_id, "goal_name": goal.get("name"),
            "amount": amount, "date": datetime.now().strftime("%Y-%m-%d"), "type": contribution_type,
            "timestamp": int(time.time() * 1000),
        },
        returning=True,
    )
    return {"goalId": goal_id, "newAmount": new_amount, "contributionId": contribution_id}


def get_goal_contributions(user_id, month_key=None, timeout=None):
    params = {"user_id": f"eq.{user_id}", "order": "timestamp.desc"}
    if month_key:
        start_date, end_date = _month_bounds(month_key)
        params["date"] = [f"gte.{start_date}", f"lt.{end_date}"]
    rows = sb.rest_request(
        "goal_contributions",
        params=params,
        select="id,user_id,goal_id,goal_name,amount,date,type,timestamp",
        timeout=timeout,
    ) or []
    return [
        {
            "id": row.get("id"), "userId": row.get("user_id"), "goalId": row.get("goal_id"),
            "goalName": row.get("goal_name"), "amount": _num(row.get("amount")),
            "date": row.get("date") or "", "type": row.get("type"), "timestamp": row.get("timestamp"),
        }
        for row in rows
    ]


def get_record_months(user_id, timeout=None):
    """Return month keys without loading full transaction histories."""
    with ThreadPoolExecutor(max_workers=2) as pool:
        transaction_future = pool.submit(
            sb.rest_request,
            "transactions",
            params={"user_id": f"eq.{user_id}"},
            select="date",
            timeout=timeout,
        )
        contribution_future = pool.submit(
            sb.rest_request,
            "goal_contributions",
            params={"user_id": f"eq.{user_id}"},
            select="date",
            timeout=timeout,
        )
        transaction_rows = transaction_future.result() or []
        contribution_rows = contribution_future.result() or []
    months = {
        str(row.get("date") or "")[:7]
        for row in [*transaction_rows, *contribution_rows]
        if len(str(row.get("date") or "")) >= 7
    }
    return sorted((month for month in months if month[4:5] == "-"), reverse=True)


def get_category_budgets(user_id, timeout=None):
    rows = sb.rest_request(
        "category_budgets",
        params={"user_id": f"eq.{user_id}", "order": "category.asc"},
        select="category,limit_amount,icon",
        timeout=timeout,
    ) or []
    return [{"category": row.get("category"), "limit": _num(row.get("limit_amount")), "icon": row.get("icon")} for row in rows]


def update_category_budget(user_id, category, limit_amount):
    sb.rest_request(
        "category_budgets",
        method="PATCH",
        params={"user_id": f"eq.{user_id}", "category": f"eq.{category}"},
        body={"limit_amount": limit_amount},
    )


def reset_user_data(user_id):
    for table in ("goal_contributions", "transactions", "fixed_obligations", "savings_goals"):
        sb.rest_request(table, method="DELETE", params={"user_id": f"eq.{user_id}"})
