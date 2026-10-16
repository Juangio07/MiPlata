import os
import io
import csv
from flask import Flask, request, jsonify, send_from_directory, send_file, make_response
import database as db

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FRONTEND_DIR = os.path.join(BASE_DIR, "frontend")

app = Flask(__name__, static_folder=FRONTEND_DIR)

# Initialize database schema and ensure demo user exists
db.init_db()

@app.after_request
def add_cors_headers(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET, POST, PUT, DELETE, OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization, X-User-Id"
    return response

def get_current_user_id_from_req():
    user_id = request.headers.get("X-User-Id")
    if not user_id:
        user_id = db.get_current_user_id()
    return user_id

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
    return jsonify({"status": "ok", "app": "MiPlata Python Backend", "version": "1.0.0"})

@app.route("/api/auth/demo", methods=["POST"])
def auth_demo():
    db.ensure_demo_user()
    db.set_current_user_id(db.DEMO_USER_ID)
    user = db.get_user_by_id(db.DEMO_USER_ID)
    return jsonify({"user": user, "message": "Sesión iniciada con la cuenta de Camila Restrepo"})

@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    data = request.get_json() or {}
    email = data.get("email", "")
    password = data.get("password")
    user = db.get_user_by_email(email)
    if user and (not password or user.get("password") == password):
        db.set_current_user_id(user["id"])
        return jsonify({"user": user, "message": f"¡Bienvenido de nuevo, {user['name'].split()[0]}!"})
    return jsonify({"error": "Correo o contraseña incorrectos"}), 401

@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "123456")
    monthly_salary = data.get("monthlySalary", 0)
    avatar_url = data.get("avatarUrl", "")

    if not name:
        return jsonify({"error": "El nombre es requerido"}), 400

    existing = db.get_user_by_email(email)
    if existing:
        return jsonify({"error": "Ya existe una cuenta con este correo"}), 409

    user = db.create_user(name, email, password, monthly_salary, avatar_url)
    return jsonify({"user": user, "message": f"¡Bienvenido a MiPlata, {user['name'].split()[0]}! Todo listo y limpio en 0 para comenzar."})

@app.route("/api/auth/logout", methods=["POST"])
def auth_logout():
    db.set_current_user_id(None)
    return jsonify({"message": "Sesión cerrada correctamente"})

@app.route("/api/user", methods=["GET"])
def get_user():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"user": None}), 200
    user = db.get_user_by_id(user_id)
    return jsonify({"user": user})

@app.route("/api/user/profile", methods=["PUT"])
def update_profile():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
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
    return jsonify({"message": "Datos reiniciados al estado por defecto"})

@app.route("/api/user", methods=["DELETE"])
def delete_account():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    db.delete_user(user_id)
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

@app.route("/api/transactions/<tx_id>", methods=["DELETE"])
def delete_transaction(tx_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    db.delete_transaction(user_id, tx_id)
    return jsonify({"message": "Registro eliminado"})

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
    goal_id = db.add_savings_goal(user_id, data)
    return jsonify({"id": goal_id, "message": f"Meta \"{data.get('name')}\" creada con éxito"})

@app.route("/api/savings-goals/<goal_id>", methods=["PUT"])
def update_savings_goal(goal_id):
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401
    data = request.get_json() or {}
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
    amount = float(data.get("amount", 0))
    contrib_type = data.get("type", "Manual")
    if amount <= 0:
        return jsonify({"error": "El monto debe ser mayor a 0"}), 400

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
    category = data.get("category")
    limit_amount = float(data.get("limit", 0))
    db.update_category_budget(user_id, category, limit_amount)
    return jsonify({"message": f"Presupuesto para {category} actualizado"})

# --- Export CSV Endpoint ---
@app.route("/api/export/csv", methods=["GET"])
def export_csv():
    user_id = get_current_user_id_from_req()
    if not user_id:
        return jsonify({"error": "No autorizado"}), 401

    user = db.get_user_by_id(user_id)
    txs = db.get_transactions(user_id)
    month_key = request.args.get("month", db.get_current_month_key())
    month_label = db.format_month_key_to_label(month_key)

    month_txs = [t for t in txs if t.get("date", "").startswith(month_key)]
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
    writer.writerow(["Fecha", "Tipo", "Categoría", "Descripción", "Método", "Monto COP"])

    for t in month_txs:
        amt = t["amount"] if t["type"] == "ingreso" else -t["amount"]
        writer.writerow([t["date"], t["type"].capitalize(), t["category"], t["description"], t.get("accountMethod", "Efectivo"), amt])

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
    app.run(host="0.0.0.0", port=port, debug=True)
