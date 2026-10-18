import sqlite3
import json
import time
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "miplata.db")

SPANISH_MONTHS = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

def get_current_month_key():
    now = datetime.now()
    return f"{now.year}-{now.month:02d}"

def format_month_key_to_label(month_key):
    if not month_key or '-' not in month_key:
        now = datetime.now()
        return f"{SPANISH_MONTHS[now.month - 1]} {now.year}"
    year_str, month_str = month_key.split('-')
    month_num = int(month_str) - 1
    month_name = SPANISH_MONTHS[month_num] if 0 <= month_num < 12 else month_str
    return f"{month_name} {year_str}"

def get_relative_month_key(offset_months):
    now = datetime.now()
    y = now.year
    m = now.month - offset_months
    while m <= 0:
        m += 12
        y -= 1
    return f"{y}-{m:02d}"

DEMO_USER_ID = "usr_camila_restrepo"

def get_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_connection()
    cursor = conn.cursor()

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT,
        avatar_url TEXT,
        plan TEXT DEFAULT 'Plan Personal Activo',
        member_since TEXT,
        is_local_only INTEGER DEFAULT 1,
        monthly_salary REAL DEFAULT 5800000,
        initial_balance REAL DEFAULT 0,
        monthly_budget_limit REAL DEFAULT 5800000,
        budget_needs REAL DEFAULT 50,
        budget_wants REAL DEFAULT 30,
        budget_savings REAL DEFAULT 20,
        alert_80_percent INTEGER DEFAULT 1,
        auto_adjust_variable INTEGER DEFAULT 0,
        currency TEXT DEFAULT 'COP',
        quick_keypad INTEGER DEFAULT 1,
        reset_day INTEGER DEFAULT 1,
        smart_categorization INTEGER DEFAULT 1
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL, -- 'gasto' or 'ingreso'
        amount REAL NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        date TEXT NOT NULL, -- YYYY-MM-DD
        time TEXT NOT NULL,
        account_method TEXT,
        is_recurring INTEGER DEFAULT 0,
        fixed_obligation_id TEXT,
        created_at INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS fixed_obligations (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        amount REAL NOT NULL,
        due_day INTEGER NOT NULL,
        category TEXT NOT NULL,
        status TEXT NOT NULL, -- 'paid' or 'pending'
        paid_date TEXT,
        reminder_days_before INTEGER DEFAULT 3,
        is_automatic INTEGER DEFAULT 0,
        notes TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS savings_goals (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        target_amount REAL NOT NULL,
        current_amount REAL NOT NULL,
        deadline TEXT,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        category TEXT,
        image_url TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS goal_contributions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        goal_id TEXT NOT NULL,
        goal_name TEXT NOT NULL,
        amount REAL NOT NULL,
        date TEXT NOT NULL,
        type TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS category_budgets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        category TEXT NOT NULL,
        limit_amount REAL NOT NULL,
        icon TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)

    cursor.execute("""
    CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)

    conn.commit()
    conn.close()

    # Seed demo user if table is empty
    ensure_demo_user()

def ensure_demo_user():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE id = ?", (DEMO_USER_ID,))
    row = cursor.fetchone()
    conn.close()

    if not row:
        seed_demo_user_data()

def seed_demo_user_data():
    conn = get_connection()
    cursor = conn.cursor()

    cur_month = get_current_month_key()
    prev1 = get_relative_month_key(1)
    prev2 = get_relative_month_key(2)
    now_ts = int(time.time() * 1000)

    # Demo User
    cursor.execute("""
    INSERT OR REPLACE INTO users (
        id, name, email, password, avatar_url, plan, member_since, is_local_only,
        monthly_salary, initial_balance, monthly_budget_limit, budget_needs, budget_wants, budget_savings,
        alert_80_percent, auto_adjust_variable, currency, quick_keypad, reset_day, smart_categorization
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
    )
    """, (
        DEMO_USER_ID,
        "Camila Restrepo",
        "camila.restrepo@email.com",
        "demo",
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=256&q=80",
        "Plan Personal Activo",
        format_month_key_to_label(cur_month),
        1,
        5800000, 0, 5800000, 50, 30, 20,
        1, 0, "COP", 1, 1, 1
    ))

    # Category budgets
    initial_categories = [
        ('Alimentación', 700000, 'restaurant'),
        ('Transporte', 250000, 'directions_car'),
        ('Entretenimiento', 300000, 'sports_esports'),
        ('Salud', 200000, 'medical_services'),
        ('Compras', 350000, 'shopping_bag'),
        ('Servicios', 250000, 'bolt'),
        ('Educación', 200000, 'school'),
        ('Otros', 150000, 'more_horiz'),
    ]
    cursor.execute("DELETE FROM category_budgets WHERE user_id = ?", (DEMO_USER_ID,))
    for cat, limit_val, icon in initial_categories:
        cursor.execute("""
        INSERT INTO category_budgets (id, user_id, category, limit_amount, icon)
        VALUES (?, ?, ?, ?, ?)
        """, (f"cb_{DEMO_USER_ID}_{cat}", DEMO_USER_ID, cat, limit_val, icon))

    # Fixed obligations
    cursor.execute("DELETE FROM fixed_obligations WHERE user_id = ?", (DEMO_USER_ID,))
    fixed_data = [
        ('fix_1', DEMO_USER_ID, 'Arriendo Apartamento', 450000, 5, 'Vivienda', 'pending', None, 3, 0, 'Vence Día 5 del mes'),
        ('fix_2', DEMO_USER_ID, 'Internet Fibra Claro', 130000, 8, 'Internet y telefonía', 'pending', None, 3, 0, 'Vence Día 8 del mes'),
        ('fix_3', DEMO_USER_ID, 'Servicios Públicos EPM', 220000, 15, 'Servicios públicos', 'paid', '12 Oct', 3, 0, 'Corte Día 15 • Pagado el 12'),
        ('fix_4', DEMO_USER_ID, 'Crédito Bancolombia', 650000, 18, 'Deudas y créditos', 'paid', '16 Oct', 3, 0, 'Corte Día 18 • Cuota 14/36'),
        ('fix_5', DEMO_USER_ID, 'Netflix + Spotify', 75000, 20, 'Suscripciones y membresías', 'paid', '20 Oct', 3, 1, 'Débito Día 20 • Automático'),
        ('fix_6', DEMO_USER_ID, 'Plan Celular Tigo', 45000, 25, 'Internet y telefonía', 'paid', '23 Oct', 3, 0, 'Corte Día 25 • Ilimitado'),
        ('fix_7', DEMO_USER_ID, 'Seguro & Asistencia Médica', 280000, 28, 'Salud y seguros', 'paid', '24 Oct', 3, 0, 'Corte Día 28 • Débito automático'),
    ]
    cursor.executemany("""
    INSERT INTO fixed_obligations (id, user_id, name, amount, due_day, category, status, paid_date, reminder_days_before, is_automatic, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, fixed_data)

    # Savings goals
    cursor.execute("DELETE FROM savings_goals WHERE user_id = ?", (DEMO_USER_ID,))
    next_deadline_m = (datetime.now().month + 2) % 12
    next_deadline_y = datetime.now().year + (1 if datetime.now().month + 2 > 12 else 0)
    next_deadline_str = f"{SPANISH_MONTHS[next_deadline_m - 1]} {next_deadline_y}"

    goals_data = [
        ('goal_1', DEMO_USER_ID, 'Fondo de Emergencia', 4000000, 2400000, 'Enero 2025', 'security', '#006c49', 'Seguridad', ''),
        ('goal_2', DEMO_USER_ID, 'MacBook Pro M3', 5000000, 3200000, next_deadline_str, 'laptop', '#0058bc', 'Tecnología', ''),
        ('goal_3', DEMO_USER_ID, 'Vacaciones San Andrés', 2500000, 950000, 'Junio 2025', 'plane', '#00838f', 'Viajes', ''),
    ]
    cursor.executemany("""
    INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, icon, color, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, goals_data)

    # Goal contributions
    cursor.execute("DELETE FROM goal_contributions WHERE user_id = ?", (DEMO_USER_ID,))
    contribs_data = [
        ('contrib_1', DEMO_USER_ID, 'goal_1', 'Fondo de Emergencia', 200000, 'Ayer, 2:30 PM', 'Automático', now_ts - 86400000),
        ('contrib_2', DEMO_USER_ID, 'goal_2', 'MacBook Pro M3', 150000, '15 Oct', 'Manual', now_ts - 86400000 * 3),
        ('contrib_3', DEMO_USER_ID, 'goal_3', 'Vacaciones San Andrés', 45000, '12 Oct', 'Microahorro', now_ts - 86400000 * 6),
    ]
    cursor.executemany("""
    INSERT INTO goal_contributions (id, user_id, goal_id, goal_name, amount, date, type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, contribs_data)

    # Transactions
    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (DEMO_USER_ID,))

    txs_data = [
        # Prev Month 1 Incomes
        ('tx_hist_inc_1', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Primera Quincena', f"{prev1}-15", '8:30 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 40),
        ('tx_hist_inc_2', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Segunda Quincena', f"{prev1}-30", '9:00 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 25),
        # Prev Month 1 Expenses
        ('tx_hist_exp_1', DEMO_USER_ID, 'gasto', 1200000, 'Vivienda', 'Arriendo Apartamento', f"{prev1}-05", '10:00 AM', 'Transferencia Bancaria', 0, None, now_ts - 86400000 * 50),
        ('tx_hist_exp_2', DEMO_USER_ID, 'gasto', 460000, 'Alimentación', 'Supermercado Mensual Carulla', f"{prev1}-08", '5:30 PM', 'Tarjeta Débito', 0, None, now_ts - 86400000 * 47),
        ('tx_hist_exp_3', DEMO_USER_ID, 'gasto', 210000, 'Alimentación', 'Mercado de Plaza y Carnes', f"{prev1}-16", '11:00 AM', 'Nequi', 0, None, now_ts - 86400000 * 39),
        ('tx_hist_exp_4', DEMO_USER_ID, 'gasto', 175000, 'Alimentación', 'Cenas y Restaurantes Fin de Semana', f"{prev1}-22", '8:45 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 33),
        ('tx_hist_exp_5', DEMO_USER_ID, 'gasto', 168000, 'Servicios', 'Energía y Acueducto EPM', f"{prev1}-12", '2:15 PM', 'PSE Bancolombia', 0, None, now_ts - 86400000 * 43),
        ('tx_hist_exp_6', DEMO_USER_ID, 'gasto', 95000, 'Servicios', 'Internet Fibra Óptica Claro', f"{prev1}-14", '3:00 PM', 'Débito Automático', 0, None, now_ts - 86400000 * 41),
        ('tx_hist_exp_7', DEMO_USER_ID, 'gasto', 32900, 'Servicios', 'Spotify & Streaming Familiar', f"{prev1}-10", '9:00 AM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 45),
        ('tx_hist_exp_8', DEMO_USER_ID, 'gasto', 215000, 'Transporte', 'Gasolina y Estacionamiento', f"{prev1}-18", '6:30 PM', 'Bancolombia Débito', 0, None, now_ts - 86400000 * 37),
        ('tx_hist_exp_9', DEMO_USER_ID, 'gasto', 70000, 'Transporte', 'Recargas Tarjeta Metro', f"{prev1}-04", '8:00 AM', 'Efectivo', 0, None, now_ts - 86400000 * 51),
        ('tx_hist_exp_10', DEMO_USER_ID, 'gasto', 180000, 'Entretenimiento', 'Salida Cine y Concierto Local', f"{prev1}-20", '9:00 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 35),
        ('tx_hist_exp_11', DEMO_USER_ID, 'gasto', 95000, 'Salud', 'Medicamentos y Control Médico', f"{prev1}-25", '11:30 AM', 'Efectivo', 0, None, now_ts - 86400000 * 30),
        ('tx_hist_exp_12', DEMO_USER_ID, 'gasto', 140000, 'Compras', 'Artículos para el Hogar y Cocina', f"{prev1}-27", '4:20 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 28),

        # Prev Month 2
        ('tx_hist2_inc_1', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Primera Quincena', f"{prev2}-15", '8:30 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 70),
        ('tx_hist2_inc_2', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Segunda Quincena', f"{prev2}-30", '9:00 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 55),
        ('tx_hist2_inc_3', DEMO_USER_ID, 'ingreso', 750000, 'Honorarios', 'Asesoría y Proyecto Freelance', f"{prev2}-28", '4:00 PM', 'Nequi', 0, None, now_ts - 86400000 * 57),
        ('tx_hist2_exp_1', DEMO_USER_ID, 'gasto', 1200000, 'Vivienda', 'Arriendo Apartamento', f"{prev2}-05", '10:00 AM', 'Transferencia Bancaria', 0, None, now_ts - 86400000 * 80),
        ('tx_hist2_exp_2', DEMO_USER_ID, 'gasto', 680000, 'Alimentación', 'Mercado Mensual y Alimentos', f"{prev2}-10", '6:00 PM', 'Tarjeta Débito', 0, None, now_ts - 86400000 * 75),
        ('tx_hist2_exp_3', DEMO_USER_ID, 'gasto', 285000, 'Servicios', 'Servicios Públicos e Internet', f"{prev2}-14", '2:30 PM', 'PSE', 0, None, now_ts - 86400000 * 71),
        ('tx_hist2_exp_4', DEMO_USER_ID, 'gasto', 245000, 'Transporte', 'Gasolina y Mantenimiento Menor', f"{prev2}-19", '5:15 PM', 'Nequi', 0, None, now_ts - 86400000 * 66),
        ('tx_hist2_exp_5', DEMO_USER_ID, 'gasto', 450000, 'Entretenimiento', 'Paseo fin de semana y turismo local', f"{prev2}-21", '12:00 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 64),
        ('tx_hist2_exp_6', DEMO_USER_ID, 'gasto', 290000, 'Compras', 'Ropa y calzado deportivo', f"{prev2}-12", '4:30 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 73),

        # Current Month Incomes
        ('tx_income_1', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Quincenal', f"{cur_month}-15", '8:30 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 10),
        ('tx_income_2', DEMO_USER_ID, 'ingreso', 2900000, 'Nómina', 'Nómina Quincenal Segunda Parte', f"{cur_month}-30", '9:00 AM', 'Bancolombia', 0, None, now_ts - 86400000 * 2),

        # Current Month Occasional Expenses
        ('tx_exp_1', DEMO_USER_ID, 'gasto', 42500, 'Alimentación', 'Almuerzo Crepes & Waffles', f"{cur_month}-24", '1:24 PM', 'Bancolombia Débito', 0, None, now_ts - 3600000 * 2),
        ('tx_exp_2', DEMO_USER_ID, 'gasto', 65000, 'Transporte', 'Gasolina Terpel', f"{cur_month}-23", '6:45 PM', 'Nequi QR', 0, None, now_ts - 86400000),
        ('tx_exp_3', DEMO_USER_ID, 'gasto', 52000, 'Entretenimiento', 'Cine Colombia (2 Entradas)', f"{cur_month}-23", '8:10 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 + 3600000),
        ('tx_exp_4', DEMO_USER_ID, 'gasto', 38200, 'Salud', 'Droguería Cruz Verde', f"{cur_month}-22", '11:15 AM', 'Efectivo', 0, None, now_ts - 86400000 * 2),
        ('tx_exp_5', DEMO_USER_ID, 'gasto', 184500, 'Alimentación', 'Supermercado Carulla', f"{cur_month}-21", '6:15 PM', 'Tarjeta Débito', 0, None, now_ts - 86400000 * 3),
        ('tx_exp_6', DEMO_USER_ID, 'gasto', 22400, 'Transporte', 'Uber Rides', f"{cur_month}-20", '9:20 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 4),
        ('tx_exp_7', DEMO_USER_ID, 'gasto', 18900, 'Servicios', 'Spotify Premium', f"{cur_month}-12", '10:00 AM', 'Fijo Mensual', 0, None, now_ts - 86400000 * 12),
        ('tx_exp_8', DEMO_USER_ID, 'gasto', 313000, 'Alimentación', 'Mercado de plaza y frutas', f"{cur_month}-10", '11:30 AM', 'Bancolombia Débito', 0, None, now_ts - 86400000 * 14),
        ('tx_exp_9', DEMO_USER_ID, 'gasto', 92600, 'Transporte', 'Peajes y recarga tarjeta metro', f"{cur_month}-08", '7:45 AM', 'Nequi QR', 0, None, now_ts - 86400000 * 16),
        ('tx_exp_10', DEMO_USER_ID, 'gasto', 268000, 'Entretenimiento', 'Cena amigos y salida fin de semana', f"{cur_month}-05", '9:30 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 19),
        ('tx_exp_11', DEMO_USER_ID, 'gasto', 71800, 'Salud', 'Consulta odontológica preventiva', f"{cur_month}-04", '4:00 PM', 'Bancolombia Débito', 0, None, now_ts - 86400000 * 20),
        ('tx_exp_12', DEMO_USER_ID, 'gasto', 253100, 'Compras', 'Ropa básica y calzado deportivo', f"{cur_month}-03", '5:15 PM', 'Tarjeta Crédito', 0, None, now_ts - 86400000 * 21),
    ]

    cursor.executemany("""
    INSERT INTO transactions (id, user_id, type, amount, category, description, date, time, account_method, is_recurring, fixed_obligation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, txs_data)

    # Set active user in app_settings
    cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('current_user_id', ?)", (DEMO_USER_ID,))

    conn.commit()
    conn.close()

# Helper queries
def user_to_dict(row):
    if not row:
        return None
    return {
        "id": row["id"],
        "name": row["name"],
        "email": row["email"],
        "password": row["password"],
        "avatarUrl": row["avatar_url"],
        "plan": row["plan"],
        "memberSince": row["member_since"],
        "isLocalOnly": bool(row["is_local_only"]),
        "monthlySalary": row["monthly_salary"],
        "initialBalance": row["initial_balance"],
        "monthlyBudgetLimit": row["monthly_budget_limit"],
        "budgetRule": {
            "needs": row["budget_needs"],
            "wants": row["budget_wants"],
            "savings": row["budget_savings"]
        },
        "alert80Percent": bool(row["alert_80_percent"]),
        "autoAdjustVariable": bool(row["auto_adjust_variable"]),
        "currency": row["currency"],
        "quickKeypad": bool(row["quick_keypad"]),
        "resetDay": row["reset_day"],
        "smartCategorization": bool(row["smart_categorization"])
    }

def get_current_user_id():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT value FROM app_settings WHERE key = 'current_user_id'")
    row = cursor.fetchone()
    conn.close()
    return row["value"] if row else None

def set_current_user_id(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("INSERT OR REPLACE INTO app_settings (key, value) VALUES ('current_user_id', ?)", (user_id,))
    else:
        cursor.execute("DELETE FROM app_settings WHERE key = 'current_user_id'")
    conn.commit()
    conn.close()

def get_user_by_id(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return user_to_dict(row)

def get_user_by_email(email):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE LOWER(email) = LOWER(?)", (email.strip(),))
    row = cursor.fetchone()
    conn.close()
    return user_to_dict(row)

def create_user(name, email, password, monthly_salary=0, avatar_url=''):
    conn = get_connection()
    cursor = conn.cursor()
    user_id = f"usr_{int(time.time() * 1000)}"
    cur_month = get_current_month_key()

    cursor.execute("""
    INSERT INTO users (
        id, name, email, password, avatar_url, plan, member_since, is_local_only,
        monthly_salary, initial_balance, monthly_budget_limit, budget_needs, budget_wants, budget_savings,
        alert_80_percent, auto_adjust_variable, currency, quick_keypad, reset_day, smart_categorization
    ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?
    )
    """, (
        user_id,
        name.strip(),
        email.strip().lower(),
        password or "123456",
        avatar_url or "",
        "Plan Personal Activo",
        format_month_key_to_label(cur_month),
        1,
        monthly_salary or 0,
        0,
        monthly_salary or 0,
        50, 30, 20,
        1, 0, "COP", 1, 1, 1
    ))

    # Seed default category budgets for new user
    initial_categories = [
        ('Alimentación', 700000, 'restaurant'),
        ('Transporte', 250000, 'directions_car'),
        ('Entretenimiento', 300000, 'sports_esports'),
        ('Salud', 200000, 'medical_services'),
        ('Compras', 350000, 'shopping_bag'),
        ('Servicios', 250000, 'bolt'),
        ('Educación', 200000, 'school'),
        ('Otros', 150000, 'more_horiz'),
    ]
    for cat, limit_val, icon in initial_categories:
        cursor.execute("""
        INSERT INTO category_budgets (id, user_id, category, limit_amount, icon)
        VALUES (?, ?, ?, ?, ?)
        """, (f"cb_{user_id}_{cat}", user_id, cat, limit_val, icon))

    # If initial salary > 0, register initial salary income
    if monthly_salary > 0:
        today_iso = datetime.now().strftime("%Y-%m-%d")
        now_time = datetime.now().strftime("%I:%M %p")
        cursor.execute("""
        INSERT INTO transactions (id, user_id, type, amount, category, description, date, time, account_method, is_recurring, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """, (
            f"tx_sal_{int(time.time()*1000)}",
            user_id,
            "ingreso",
            monthly_salary,
            "Nómina",
            "Nómina / Ingreso mensual registrado",
            today_iso,
            now_time,
            "Cuenta Principal",
            0,
            int(time.time() * 1000)
        ))

    conn.commit()
    conn.close()
    set_current_user_id(user_id)
    return get_user_by_id(user_id)

def update_user(user_id, updates):
    conn = get_connection()
    cursor = conn.cursor()

    field_map = {
        "name": "name",
        "email": "email",
        "avatarUrl": "avatar_url",
        "monthlySalary": "monthly_salary",
        "initialBalance": "initial_balance",
        "monthlyBudgetLimit": "monthly_budget_limit",
        "alert80Percent": "alert_80_percent",
        "autoAdjustVariable": "auto_adjust_variable",
        "quickKeypad": "quick_keypad",
        "smartCategorization": "smart_categorization",
    }

    set_clauses = []
    values = []

    for k, v in updates.items():
        if k in field_map:
            set_clauses.append(f"{field_map[k]} = ?")
            values.append(v)
        elif k == "budgetRule" and isinstance(v, dict):
            if "needs" in v:
                set_clauses.append("budget_needs = ?")
                values.append(v["needs"])
            if "wants" in v:
                set_clauses.append("budget_wants = ?")
                values.append(v["wants"])
            if "savings" in v:
                set_clauses.append("budget_savings = ?")
                values.append(v["savings"])

    if set_clauses:
        values.append(user_id)
        query = f"UPDATE users SET {', '.join(set_clauses)} WHERE id = ?"
        cursor.execute(query, tuple(values))
        conn.commit()

    conn.close()
    return get_user_by_id(user_id)

def delete_user(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM fixed_obligations WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM savings_goals WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM goal_contributions WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM category_budgets WHERE user_id = ?", (user_id,))
    cursor.execute("DELETE FROM users WHERE id = ?", (user_id,))
    cursor.execute("DELETE FROM app_settings WHERE key = 'current_user_id' AND value = ?", (user_id,))
    conn.commit()
    conn.close()

def get_transactions(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC, created_at DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "userId": r["user_id"],
            "type": r["type"],
            "amount": r["amount"],
            "category": r["category"],
            "description": r["description"],
            "date": r["date"],
            "time": r["time"],
            "accountMethod": r["account_method"],
            "isRecurring": bool(r["is_recurring"]),
            "fixedObligationId": r["fixed_obligation_id"],
            "createdAt": r["created_at"]
        })
    return result

def add_transaction(user_id, tx):
    conn = get_connection()
    cursor = conn.cursor()
    tx_id = tx.get("id") or f"tx_{int(time.time() * 1000)}"
    created_at = tx.get("createdAt") or int(time.time() * 1000)

    cursor.execute("""
    INSERT INTO transactions (id, user_id, type, amount, category, description, date, time, account_method, is_recurring, fixed_obligation_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        tx_id,
        user_id,
        tx["type"],
        tx["amount"],
        tx["category"],
        tx["description"],
        tx["date"],
        tx["time"],
        tx.get("accountMethod", ""),
        1 if tx.get("isRecurring") else 0,
        tx.get("fixedObligationId"),
        created_at
    ))
    conn.commit()
    conn.close()
    return tx_id

def update_transaction(user_id, tx_id, updates):
    conn = get_connection()
    cursor = conn.cursor()

    field_map = {
        "description": "description",
    }

    set_clauses = []
    values = []
    for k, v in updates.items():
        if k in field_map:
            set_clauses.append(f"{field_map[k]} = ?")
            values.append(1 if v is True else (0 if v is False else v))

    if set_clauses:
        values.extend([tx_id, user_id])
        cursor.execute(f"UPDATE transactions SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?", tuple(values))
        conn.commit()
    conn.close()

def delete_transaction(user_id, tx_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user_id))
    conn.commit()
    conn.close()

# Fixed obligations
def get_fixed_obligations(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fixed_obligations WHERE user_id = ? ORDER BY due_day ASC", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "userId": r["user_id"],
            "name": r["name"],
            "amount": r["amount"],
            "dueDay": r["due_day"],
            "category": r["category"],
            "status": r["status"],
            "paidDate": r["paid_date"],
            "reminderDaysBefore": r["reminder_days_before"],
            "isAutomatic": bool(r["is_automatic"]),
            "notes": r["notes"]
        })
    return result

def add_fixed_obligation(user_id, item):
    conn = get_connection()
    cursor = conn.cursor()
    item_id = item.get("id") or f"fix_{int(time.time() * 1000)}"

    cursor.execute("""
    INSERT INTO fixed_obligations (id, user_id, name, amount, due_day, category, status, paid_date, reminder_days_before, is_automatic, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        item_id,
        user_id,
        item["name"],
        item["amount"],
        item["dueDay"],
        item["category"],
        item.get("status", "pending"),
        item.get("paidDate"),
        item.get("reminderDaysBefore", 3),
        1 if item.get("isAutomatic") else 0,
        item.get("notes", "")
    ))
    conn.commit()
    conn.close()
    return item_id

def update_fixed_obligation(user_id, item_id, updates):
    conn = get_connection()
    cursor = conn.cursor()

    field_map = {
        "name": "name",
        "amount": "amount",
        "dueDay": "due_day",
        "category": "category",
        "status": "status",
        "paidDate": "paid_date",
        "reminderDaysBefore": "reminder_days_before",
        "isAutomatic": "is_automatic",
        "notes": "notes"
    }

    set_clauses = []
    values = []
    for k, v in updates.items():
        if k in field_map:
            set_clauses.append(f"{field_map[k]} = ?")
            values.append(1 if v is True else (0 if v is False else v))

    if set_clauses:
        values.extend([item_id, user_id])
        cursor.execute(f"UPDATE fixed_obligations SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?", tuple(values))
        conn.commit()
    conn.close()

def delete_fixed_obligation(user_id, item_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM fixed_obligations WHERE id = ? AND user_id = ?", (item_id, user_id))
    # Also delete linked recurring transaction to avoid orphaned entries
    cursor.execute("DELETE FROM transactions WHERE fixed_obligation_id = ? AND user_id = ?", (item_id, user_id))
    conn.commit()
    conn.close()

def toggle_pay_fixed_obligation(user_id, item_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM fixed_obligations WHERE id = ? AND user_id = ?", (item_id, user_id))
    row = cursor.fetchone()
    if not row:
        conn.close()
        return None

    is_now_paid = (row["status"] != "paid")
    new_status = "paid" if is_now_paid else "pending"
    paid_date = datetime.now().strftime("Hoy, %d %b") if is_now_paid else None

    cursor.execute("""
    UPDATE fixed_obligations SET status = ?, paid_date = ? WHERE id = ? AND user_id = ?
    """, (new_status, paid_date, item_id, user_id))

    if is_now_paid:
        # Check if already in transactions
        cursor.execute("SELECT id FROM transactions WHERE fixed_obligation_id = ? AND user_id = ?", (item_id, user_id))
        existing_tx = cursor.fetchone()
        if not existing_tx:
            today_iso = datetime.now().strftime("%Y-%m-%d")
            now_time = datetime.now().strftime("%I:%M %p")
            tx_id = f"tx_fix_{item_id}_{int(time.time() * 1000)}"
            cursor.execute("""
            INSERT INTO transactions (id, user_id, type, amount, category, description, date, time, account_method, is_recurring, fixed_obligation_id, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                tx_id,
                user_id,
                "gasto",
                row["amount"],
                row["category"],
                f"{row['name']} (Gasto Fijo)",
                today_iso,
                now_time,
                "Fijo Mensual",
                1,
                item_id,
                int(time.time() * 1000)
            ))
    else:
        # Unmark -> remove linked transaction
        cursor.execute("DELETE FROM transactions WHERE fixed_obligation_id = ? AND user_id = ?", (item_id, user_id))

    conn.commit()
    conn.close()
    return {"status": new_status, "isPaid": is_now_paid}

# Savings goals
def get_savings_goals(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM savings_goals WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "userId": r["user_id"],
            "name": r["name"],
            "targetAmount": r["target_amount"],
            "currentAmount": r["current_amount"],
            "deadline": r["deadline"],
            "icon": r["icon"],
            "color": r["color"],
            "category": r["category"],
            "imageUrl": r["image_url"]
        })
    return result

def add_savings_goal(user_id, goal):
    conn = get_connection()
    cursor = conn.cursor()
    goal_id = goal.get("id") or f"goal_{int(time.time() * 1000)}"

    cursor.execute("""
    INSERT INTO savings_goals (id, user_id, name, target_amount, current_amount, deadline, icon, color, category, image_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        goal_id,
        user_id,
        goal["name"],
        goal["targetAmount"],
        goal.get("currentAmount", 0),
        goal.get("deadline", ""),
        goal.get("icon", "laptop"),
        goal.get("color", "#0058bc"),
        goal.get("category", ""),
        goal.get("imageUrl", "")
    ))
    conn.commit()
    conn.close()
    return goal_id

def update_savings_goal(user_id, goal_id, updates):
    conn = get_connection()
    cursor = conn.cursor()

    field_map = {
        "name": "name",
        "targetAmount": "target_amount",
        "currentAmount": "current_amount",
        "deadline": "deadline",
        "icon": "icon",
        "color": "color",
        "category": "category",
        "imageUrl": "image_url"
    }

    set_clauses = []
    values = []
    for k, v in updates.items():
        if k in field_map:
            set_clauses.append(f"{field_map[k]} = ?")
            values.append(v)

    if set_clauses:
        values.extend([goal_id, user_id])
        cursor.execute(f"UPDATE savings_goals SET {', '.join(set_clauses)} WHERE id = ? AND user_id = ?", tuple(values))
        conn.commit()
    conn.close()

def delete_savings_goal(user_id, goal_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    cursor.execute("DELETE FROM goal_contributions WHERE goal_id = ? AND user_id = ?", (goal_id, user_id))
    conn.commit()
    conn.close()

def contribute_to_goal(user_id, goal_id, amount, contribution_type="Manual"):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM savings_goals WHERE id = ? AND user_id = ?", (goal_id, user_id))
    goal = cursor.fetchone()
    if not goal:
        conn.close()
        return None

    new_amount = goal["current_amount"] + amount
    cursor.execute("UPDATE savings_goals SET current_amount = ? WHERE id = ? AND user_id = ?", (new_amount, goal_id, user_id))

    contrib_id = f"contrib_{int(time.time() * 1000)}"
    now_time = datetime.now().strftime("Hoy, %I:%M %p")
    cursor.execute("""
    INSERT INTO goal_contributions (id, user_id, goal_id, goal_name, amount, date, type, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        contrib_id,
        user_id,
        goal_id,
        goal["name"],
        amount,
        now_time,
        contribution_type,
        int(time.time() * 1000)
    ))

    conn.commit()
    conn.close()
    return {"goalId": goal_id, "newAmount": new_amount, "contributionId": contrib_id}

def get_goal_contributions(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM goal_contributions WHERE user_id = ? ORDER BY timestamp DESC", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "id": r["id"],
            "userId": r["user_id"],
            "goalId": r["goal_id"],
            "goalName": r["goal_name"],
            "amount": r["amount"],
            "date": r["date"],
            "type": r["type"],
            "timestamp": r["timestamp"]
        })
    return result

def get_category_budgets(user_id):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM category_budgets WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    conn.close()

    result = []
    for r in rows:
        result.append({
            "category": r["category"],
            "limit": r["limit_amount"],
            "icon": r["icon"]
        })
    return result

def update_category_budget(user_id, category, limit_amount):
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
    UPDATE category_budgets SET limit_amount = ? WHERE user_id = ? AND category = ?
    """, (limit_amount, user_id, category))
    conn.commit()
    conn.close()

def reset_user_data(user_id):
    if user_id == DEMO_USER_ID:
        seed_demo_user_data()
    else:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM transactions WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM fixed_obligations WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM savings_goals WHERE user_id = ?", (user_id,))
        cursor.execute("DELETE FROM goal_contributions WHERE user_id = ?", (user_id,))
        conn.commit()
        conn.close()
