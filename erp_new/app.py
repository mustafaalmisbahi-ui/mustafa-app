import os
import secrets
import sqlite3
from functools import wraps

from flask import (
    Flask,
    flash,
    g,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from werkzeug.security import check_password_hash, generate_password_hash


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, "erp.db")
ORDER_STATUS_CHOICES = [
    ("pricing", "التسعير"),
    ("design", "التصميم"),
    ("paper_purchase", "شراء الورق"),
    ("printing", "الطباعة"),
    ("external_finishing", "تشطيب خارجي"),
    ("internal_finishing", "تشطيب داخلي"),
    ("quality_check", "فحص الجودة"),
    ("ready_delivery", "جاهز للتسليم"),
    ("delivered", "تم التسليم"),
    ("cancelled", "ملغي"),
]
ORDER_STATUS_KEYS = {choice[0] for choice in ORDER_STATUS_CHOICES}
ROLE_CHOICES = {"admin", "sales", "production", "designer", "technician", "user"}
INVOICE_STATUS_CHOICES = {"draft", "sent", "partial", "paid", "overdue", "cancelled"}
PAYMENT_METHOD_CHOICES = {"cash", "bank_transfer", "check", "other"}


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("ERP_SECRET_KEY", "change-me-in-production")

    @app.after_request
    def apply_cors_headers(response):
        # Allow phone apps and web clients to call the API.
        response.headers["Access-Control-Allow-Origin"] = request.headers.get("Origin", "*")
        response.headers["Access-Control-Allow-Headers"] = "Content-Type, Authorization"
        response.headers["Access-Control-Allow-Methods"] = "GET, POST, PATCH, DELETE, OPTIONS"
        return response

    def get_db() -> sqlite3.Connection:
        if "db" not in g:
            conn = sqlite3.connect(DATABASE_PATH)
            conn.row_factory = sqlite3.Row
            g.db = conn
        return g.db

    @app.teardown_appcontext
    def close_db(_exception: Exception | None) -> None:
        db = g.pop("db", None)
        if db is not None:
            db.close()

    def init_db() -> None:
        db = get_db()
        db.executescript(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                full_name TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'admin',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                company TEXT,
                notes TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS orders (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                order_no TEXT UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                status TEXT NOT NULL DEFAULT 'pricing',
                total_amount REAL NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(customer_id) REFERENCES customers(id)
            );

            CREATE TABLE IF NOT EXISTS employees (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE,
                role TEXT NOT NULL DEFAULT 'user',
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS suppliers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                email TEXT,
                supplier_type TEXT DEFAULT 'other',
                notes TEXT,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS inventory_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                sku TEXT UNIQUE,
                category TEXT DEFAULT 'other',
                unit TEXT DEFAULT 'piece',
                quantity INTEGER NOT NULL DEFAULT 0,
                min_quantity INTEGER NOT NULL DEFAULT 0,
                unit_cost REAL NOT NULL DEFAULT 0,
                supplier_id INTEGER,
                active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(supplier_id) REFERENCES suppliers(id)
            );

            CREATE TABLE IF NOT EXISTS inventory_movements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                movement_type TEXT NOT NULL,
                quantity INTEGER NOT NULL,
                reason TEXT,
                created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(item_id) REFERENCES inventory_items(id),
                FOREIGN KEY(created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS invoices (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_no TEXT UNIQUE NOT NULL,
                customer_id INTEGER NOT NULL,
                order_id INTEGER,
                subtotal REAL NOT NULL DEFAULT 0,
                tax_amount REAL NOT NULL DEFAULT 0,
                total REAL NOT NULL DEFAULT 0,
                paid_amount REAL NOT NULL DEFAULT 0,
                status TEXT NOT NULL DEFAULT 'draft',
                due_date TEXT,
                notes TEXT,
                created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(customer_id) REFERENCES customers(id),
                FOREIGN KEY(order_id) REFERENCES orders(id),
                FOREIGN KEY(created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS payments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                invoice_id INTEGER NOT NULL,
                amount REAL NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'cash',
                reference_no TEXT,
                notes TEXT,
                created_by INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY(invoice_id) REFERENCES invoices(id),
                FOREIGN KEY(created_by) REFERENCES users(id)
            );

            CREATE TABLE IF NOT EXISTS api_tokens (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token TEXT UNIQUE NOT NULL,
                revoked INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                last_used_at TEXT,
                FOREIGN KEY(user_id) REFERENCES users(id)
            );
            """
        )
        db.commit()

        admin = db.execute("SELECT id FROM users WHERE username = ?", ("admin",)).fetchone()
        if admin is None:
            db.execute(
                """
                INSERT INTO users (username, password_hash, full_name, role, active)
                VALUES (?, ?, ?, ?, 1)
                """,
                ("admin", generate_password_hash("admin123"), "مدير النظام", "admin"),
            )
            db.commit()

    def next_invoice_no() -> str:
        db = get_db()
        row = db.execute("SELECT MAX(id) AS max_id FROM invoices").fetchone()
        next_id = (row["max_id"] or 0) + 1
        return f"INV-{next_id:04d}"

    def login_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if not session.get("user_id"):
                return redirect(url_for("login"))
            return view(*args, **kwargs)

        return wrapped

    def admin_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            if session.get("role") != "admin":
                flash("هذه العملية متاحة للمدير فقط", "error")
                return redirect(url_for("dashboard"))
            return view(*args, **kwargs)

        return wrapped

    def next_order_no() -> str:
        db = get_db()
        row = db.execute("SELECT MAX(id) AS max_id FROM orders").fetchone()
        next_id = (row["max_id"] or 0) + 1
        return f"ORD-{next_id:04d}"

    def row_to_dict(row: sqlite3.Row | None) -> dict | None:
        if row is None:
            return None
        return {k: row[k] for k in row.keys()}

    def json_error(message: str, status_code: int):
        return jsonify({"success": False, "error": message}), status_code

    @app.route("/api/<path:_rest>", methods=["OPTIONS"])
    def api_options(_rest: str):
        return ("", 204)

    def create_api_token(user_id: int) -> str:
        token = secrets.token_urlsafe(32)
        db = get_db()
        db.execute(
            "INSERT INTO api_tokens (user_id, token, revoked) VALUES (?, ?, 0)",
            (user_id, token),
        )
        db.commit()
        return token

    def get_api_user():
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return None, None

        token = auth_header.split(" ", 1)[1].strip()
        if not token:
            return None, None

        db = get_db()
        row = db.execute(
            """
            SELECT u.id, u.username, u.full_name, u.role, u.active, t.id AS token_id
            FROM api_tokens t
            JOIN users u ON u.id = t.user_id
            WHERE t.token = ? AND t.revoked = 0
            LIMIT 1
            """,
            (token,),
        ).fetchone()

        if row is None:
            return None, token
        if not row["active"]:
            return None, token

        db.execute(
            "UPDATE api_tokens SET last_used_at = CURRENT_TIMESTAMP WHERE id = ?",
            (row["token_id"],),
        )
        db.commit()
        return row, token

    def api_auth_required(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            user, token = get_api_user()
            if user is None:
                return json_error("Unauthorized", 401)
            g.api_user = user
            g.api_token = token
            return view(*args, **kwargs)

        return wrapped

    def api_admin_required(view):
        @wraps(view)
        @api_auth_required
        def wrapped(*args, **kwargs):
            if g.api_user["role"] != "admin":
                return json_error("Forbidden: admin only", 403)
            return view(*args, **kwargs)

        return wrapped

    @app.context_processor
    def inject_globals():
        return {
            "current_user_name": session.get("full_name"),
            "current_user_role": session.get("role"),
            "current_path": request.path,
            "order_status_choices": ORDER_STATUS_CHOICES,
        }

    @app.get("/init")
    def initialize():
        init_db()
        flash("تم تهيئة قاعدة البيانات بنجاح", "success")
        return redirect(url_for("login"))

    @app.get("/health")
    def health():
        return {"status": "ok"}, 200

    # -------------------- JSON API --------------------
    @app.get("/api/health")
    def api_health():
        return jsonify({"success": True, "status": "ok"})

    @app.post("/api/auth/login")
    def api_login():
        init_db()
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", ""))

        if not username or not password:
            return json_error("username and password are required", 400)

        db = get_db()
        user = db.execute(
            "SELECT id, username, password_hash, full_name, role, active FROM users WHERE username = ?",
            (username,),
        ).fetchone()

        if user is None or not check_password_hash(user["password_hash"], password):
            return json_error("Invalid credentials", 401)
        if not user["active"]:
            return json_error("Account is disabled", 403)

        token = create_api_token(user["id"])
        return jsonify(
            {
                "success": True,
                "token": token,
                "user": {
                    "id": user["id"],
                    "username": user["username"],
                    "full_name": user["full_name"],
                    "role": user["role"],
                },
            }
        )

    @app.post("/api/auth/logout")
    @api_auth_required
    def api_logout():
        db = get_db()
        db.execute("UPDATE api_tokens SET revoked = 1 WHERE token = ?", (g.api_token,))
        db.commit()
        return jsonify({"success": True})

    @app.get("/api/auth/me")
    @api_auth_required
    def api_me():
        return jsonify(
            {
                "success": True,
                "user": {
                    "id": g.api_user["id"],
                    "username": g.api_user["username"],
                    "full_name": g.api_user["full_name"],
                    "role": g.api_user["role"],
                },
            }
        )

    @app.get("/api/dashboard")
    @api_auth_required
    def api_dashboard():
        db = get_db()
        stats = {
            "customers": db.execute("SELECT COUNT(*) AS c FROM customers").fetchone()["c"],
            "orders": db.execute("SELECT COUNT(*) AS c FROM orders").fetchone()["c"],
            "employees": db.execute("SELECT COUNT(*) AS c FROM employees").fetchone()["c"],
            "revenue": db.execute("SELECT COALESCE(SUM(total_amount), 0) AS s FROM orders").fetchone()["s"],
            "suppliers": db.execute("SELECT COUNT(*) AS c FROM suppliers").fetchone()["c"],
            "inventory_items": db.execute("SELECT COUNT(*) AS c FROM inventory_items").fetchone()["c"],
            "low_stock_items": db.execute(
                "SELECT COUNT(*) AS c FROM inventory_items WHERE active = 1 AND quantity <= min_quantity"
            ).fetchone()["c"],
            "invoices": db.execute("SELECT COUNT(*) AS c FROM invoices").fetchone()["c"],
            "pending_invoices": db.execute(
                "SELECT COUNT(*) AS c FROM invoices WHERE status IN ('draft','sent','partial','overdue')"
            ).fetchone()["c"],
        }
        latest_orders = db.execute(
            """
            SELECT o.id, o.order_no, o.title, o.status, o.quantity, o.total_amount, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            ORDER BY o.id DESC
            LIMIT 10
            """
        ).fetchall()
        return jsonify(
            {
                "success": True,
                "stats": stats,
                "latest_orders": [row_to_dict(r) for r in latest_orders],
            }
        )

    @app.get("/api/bootstrap")
    @api_auth_required
    def api_bootstrap():
        db = get_db()
        customers = db.execute("SELECT * FROM customers ORDER BY id DESC LIMIT 30").fetchall()
        suppliers = db.execute("SELECT * FROM suppliers ORDER BY id DESC LIMIT 30").fetchall()
        inventory = db.execute("SELECT * FROM inventory_items ORDER BY id DESC LIMIT 50").fetchall()
        orders = db.execute(
            """
            SELECT o.*, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            ORDER BY o.id DESC
            LIMIT 30
            """
        ).fetchall()
        invoices = db.execute(
            """
            SELECT i.*, c.name AS customer_name
            FROM invoices i
            JOIN customers c ON c.id = i.customer_id
            ORDER BY i.id DESC
            LIMIT 30
            """
        ).fetchall()
        return jsonify(
            {
                "success": True,
                "data": {
                    "customers": [row_to_dict(r) for r in customers],
                    "suppliers": [row_to_dict(r) for r in suppliers],
                    "inventory_items": [row_to_dict(r) for r in inventory],
                    "orders": [row_to_dict(r) for r in orders],
                    "invoices": [row_to_dict(r) for r in invoices],
                },
            }
        )

    @app.get("/api/customers")
    @api_auth_required
    def api_customers_list():
        q = str(request.args.get("q", "")).strip()
        db = get_db()
        if q:
            rows = db.execute(
                """
                SELECT * FROM customers
                WHERE name LIKE ? OR phone LIKE ? OR company LIKE ?
                ORDER BY id DESC
                """,
                (f"%{q}%", f"%{q}%", f"%{q}%"),
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()
        return jsonify({"success": True, "customers": [row_to_dict(r) for r in rows]})

    @app.post("/api/customers")
    @api_auth_required
    def api_customers_create():
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return json_error("name is required", 400)

        phone = str(payload.get("phone", "")).strip() or None
        email = str(payload.get("email", "")).strip() or None
        company = str(payload.get("company", "")).strip() or None
        notes = str(payload.get("notes", "")).strip() or None

        db = get_db()
        cur = db.execute(
            """
            INSERT INTO customers (name, phone, email, company, notes)
            VALUES (?, ?, ?, ?, ?)
            """,
            (name, phone, email, company, notes),
        )
        db.commit()
        created = db.execute("SELECT * FROM customers WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify({"success": True, "customer": row_to_dict(created)}), 201

    @app.delete("/api/customers/<int:customer_id>")
    @api_auth_required
    def api_customers_delete(customer_id: int):
        db = get_db()
        linked = db.execute(
            "SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?", (customer_id,)
        ).fetchone()["c"]
        if linked:
            return json_error("Cannot delete customer linked to orders", 409)

        cur = db.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
        db.commit()
        if cur.rowcount == 0:
            return json_error("Customer not found", 404)
        return jsonify({"success": True})

    @app.get("/api/orders")
    @api_auth_required
    def api_orders_list():
        status = str(request.args.get("status", "")).strip()
        customer_id = str(request.args.get("customer_id", "")).strip()
        db = get_db()

        query = """
            SELECT o.*, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
        """
        params = []
        conditions = []
        if status:
            conditions.append("o.status = ?")
            params.append(status)
        if customer_id:
            conditions.append("o.customer_id = ?")
            params.append(int(customer_id))
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        query += " ORDER BY o.id DESC"

        rows = db.execute(query, tuple(params)).fetchall()
        return jsonify({"success": True, "orders": [row_to_dict(r) for r in rows]})

    @app.post("/api/orders")
    @api_auth_required
    def api_orders_create():
        payload = request.get_json(silent=True) or {}
        try:
            customer_id = int(payload.get("customer_id"))
            quantity = int(payload.get("quantity"))
            total_amount = float(payload.get("total_amount", 0))
        except (TypeError, ValueError):
            return json_error("customer_id, quantity, total_amount must be valid numbers", 400)

        title = str(payload.get("title", "")).strip()
        if not title:
            return json_error("title is required", 400)

        status = str(payload.get("status", "pricing")).strip() or "pricing"
        if status not in ORDER_STATUS_KEYS:
            return json_error("invalid status value", 400)

        db = get_db()
        exists = db.execute("SELECT id FROM customers WHERE id = ?", (customer_id,)).fetchone()
        if exists is None:
            return json_error("customer not found", 404)

        cur = db.execute(
            """
            INSERT INTO orders (order_no, customer_id, title, quantity, total_amount, status)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (next_order_no(), customer_id, title, quantity, total_amount, status),
        )
        db.commit()
        created = db.execute(
            """
            SELECT o.*, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            WHERE o.id = ?
            """,
            (cur.lastrowid,),
        ).fetchone()
        return jsonify({"success": True, "order": row_to_dict(created)}), 201

    @app.patch("/api/orders/<int:order_id>/status")
    @api_auth_required
    def api_orders_update_status(order_id: int):
        payload = request.get_json(silent=True) or {}
        status = str(payload.get("status", "")).strip()
        if status not in ORDER_STATUS_KEYS:
            return json_error("invalid status value", 400)

        db = get_db()
        cur = db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        db.commit()
        if cur.rowcount == 0:
            return json_error("order not found", 404)
        order = db.execute("SELECT * FROM orders WHERE id = ?", (order_id,)).fetchone()
        return jsonify({"success": True, "order": row_to_dict(order)})

    @app.get("/api/employees")
    @api_auth_required
    def api_employees_list():
        db = get_db()
        rows = db.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
        return jsonify({"success": True, "employees": [row_to_dict(r) for r in rows]})

    @app.post("/api/employees")
    @api_admin_required
    def api_employees_create():
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return json_error("name is required", 400)
        email = str(payload.get("email", "")).strip() or None
        role = str(payload.get("role", "user")).strip() or "user"
        if role not in ROLE_CHOICES:
            role = "user"

        db = get_db()
        try:
            cur = db.execute(
                "INSERT INTO employees (name, email, role, active) VALUES (?, ?, ?, 1)",
                (name, email, role),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return json_error("email already exists", 409)

        created = db.execute("SELECT * FROM employees WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify({"success": True, "employee": row_to_dict(created)}), 201

    @app.patch("/api/employees/<int:employee_id>/active")
    @api_admin_required
    def api_employees_toggle_active(employee_id: int):
        payload = request.get_json(silent=True) or {}
        if "active" not in payload:
            return json_error("active field is required", 400)
        active = 1 if bool(payload.get("active")) else 0

        db = get_db()
        cur = db.execute("UPDATE employees SET active = ? WHERE id = ?", (active, employee_id))
        db.commit()
        if cur.rowcount == 0:
            return json_error("employee not found", 404)

        employee = db.execute("SELECT * FROM employees WHERE id = ?", (employee_id,)).fetchone()
        return jsonify({"success": True, "employee": row_to_dict(employee)})

    @app.get("/api/users")
    @api_admin_required
    def api_users_list():
        db = get_db()
        rows = db.execute(
            "SELECT id, username, full_name, role, active, created_at FROM users ORDER BY id DESC"
        ).fetchall()
        return jsonify({"success": True, "users": [row_to_dict(r) for r in rows]})

    @app.post("/api/users")
    @api_admin_required
    def api_users_create():
        payload = request.get_json(silent=True) or {}
        username = str(payload.get("username", "")).strip()
        password = str(payload.get("password", "")).strip()
        full_name = str(payload.get("full_name", "")).strip()
        role = str(payload.get("role", "user")).strip() or "user"
        active = 1 if bool(payload.get("active", True)) else 0

        if not username or not password or not full_name:
            return json_error("username, password, full_name are required", 400)
        if role not in ROLE_CHOICES:
            role = "user"

        db = get_db()
        try:
            cur = db.execute(
                """
                INSERT INTO users (username, password_hash, full_name, role, active)
                VALUES (?, ?, ?, ?, ?)
                """,
                (username, generate_password_hash(password), full_name, role, active),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return json_error("username already exists", 409)

        created = db.execute(
            "SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?",
            (cur.lastrowid,),
        ).fetchone()
        return jsonify({"success": True, "user": row_to_dict(created)}), 201

    @app.patch("/api/users/<int:user_id>/active")
    @api_admin_required
    def api_users_update_active(user_id: int):
        payload = request.get_json(silent=True) or {}
        if "active" not in payload:
            return json_error("active field is required", 400)
        active = 1 if bool(payload.get("active")) else 0

        if g.api_user["id"] == user_id and active == 0:
            return json_error("cannot disable your own account", 400)

        db = get_db()
        cur = db.execute("UPDATE users SET active = ? WHERE id = ?", (active, user_id))
        db.commit()
        if cur.rowcount == 0:
            return json_error("user not found", 404)
        user = db.execute(
            "SELECT id, username, full_name, role, active, created_at FROM users WHERE id = ?",
            (user_id,),
        ).fetchone()
        return jsonify({"success": True, "user": row_to_dict(user)})

    @app.get("/api/suppliers")
    @api_auth_required
    def api_suppliers_list():
        db = get_db()
        q = str(request.args.get("q", "")).strip()
        if q:
            rows = db.execute(
                """
                SELECT * FROM suppliers
                WHERE name LIKE ? OR phone LIKE ? OR email LIKE ?
                ORDER BY id DESC
                """,
                (f"%{q}%", f"%{q}%", f"%{q}%"),
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM suppliers ORDER BY id DESC").fetchall()
        return jsonify({"success": True, "suppliers": [row_to_dict(r) for r in rows]})

    @app.post("/api/suppliers")
    @api_admin_required
    def api_suppliers_create():
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return json_error("name is required", 400)

        phone = str(payload.get("phone", "")).strip() or None
        email = str(payload.get("email", "")).strip() or None
        supplier_type = str(payload.get("supplier_type", "other")).strip() or "other"
        notes = str(payload.get("notes", "")).strip() or None
        active = 1 if bool(payload.get("active", True)) else 0

        db = get_db()
        cur = db.execute(
            """
            INSERT INTO suppliers (name, phone, email, supplier_type, notes, active)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (name, phone, email, supplier_type, notes, active),
        )
        db.commit()
        created = db.execute("SELECT * FROM suppliers WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify({"success": True, "supplier": row_to_dict(created)}), 201

    @app.patch("/api/suppliers/<int:supplier_id>/active")
    @api_admin_required
    def api_suppliers_set_active(supplier_id: int):
        payload = request.get_json(silent=True) or {}
        if "active" not in payload:
            return json_error("active field is required", 400)
        active = 1 if bool(payload.get("active")) else 0

        db = get_db()
        cur = db.execute("UPDATE suppliers SET active = ? WHERE id = ?", (active, supplier_id))
        db.commit()
        if cur.rowcount == 0:
            return json_error("supplier not found", 404)
        row = db.execute("SELECT * FROM suppliers WHERE id = ?", (supplier_id,)).fetchone()
        return jsonify({"success": True, "supplier": row_to_dict(row)})

    @app.get("/api/inventory")
    @api_auth_required
    def api_inventory_list():
        db = get_db()
        category = str(request.args.get("category", "")).strip()
        if category:
            rows = db.execute(
                "SELECT * FROM inventory_items WHERE category = ? ORDER BY id DESC",
                (category,),
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM inventory_items ORDER BY id DESC").fetchall()
        return jsonify({"success": True, "items": [row_to_dict(r) for r in rows]})

    @app.post("/api/inventory")
    @api_admin_required
    def api_inventory_create():
        payload = request.get_json(silent=True) or {}
        name = str(payload.get("name", "")).strip()
        if not name:
            return json_error("name is required", 400)

        sku = str(payload.get("sku", "")).strip() or None
        category = str(payload.get("category", "other")).strip() or "other"
        unit = str(payload.get("unit", "piece")).strip() or "piece"
        quantity = int(payload.get("quantity", 0) or 0)
        min_quantity = int(payload.get("min_quantity", 0) or 0)
        unit_cost = float(payload.get("unit_cost", 0) or 0)
        supplier_id = payload.get("supplier_id")
        supplier_id = int(supplier_id) if supplier_id is not None else None
        active = 1 if bool(payload.get("active", True)) else 0

        db = get_db()
        try:
            cur = db.execute(
                """
                INSERT INTO inventory_items (name, sku, category, unit, quantity, min_quantity, unit_cost, supplier_id, active)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (name, sku, category, unit, quantity, min_quantity, unit_cost, supplier_id, active),
            )
            db.commit()
        except sqlite3.IntegrityError:
            return json_error("sku already exists", 409)

        created = db.execute("SELECT * FROM inventory_items WHERE id = ?", (cur.lastrowid,)).fetchone()
        return jsonify({"success": True, "item": row_to_dict(created)}), 201

    @app.post("/api/inventory/<int:item_id>/movement")
    @api_auth_required
    def api_inventory_add_movement(item_id: int):
        payload = request.get_json(silent=True) or {}
        movement_type = str(payload.get("movement_type", "")).strip()
        if movement_type not in {"in", "out"}:
            return json_error("movement_type must be in or out", 400)
        quantity = int(payload.get("quantity", 0) or 0)
        if quantity <= 0:
            return json_error("quantity must be greater than zero", 400)
        reason = str(payload.get("reason", "")).strip() or None

        db = get_db()
        item = db.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,)).fetchone()
        if item is None:
            return json_error("item not found", 404)

        current_qty = int(item["quantity"] or 0)
        new_qty = current_qty + quantity if movement_type == "in" else current_qty - quantity
        if new_qty < 0:
            return json_error("insufficient stock", 409)

        db.execute(
            "INSERT INTO inventory_movements (item_id, movement_type, quantity, reason, created_by) VALUES (?, ?, ?, ?, ?)",
            (item_id, movement_type, quantity, reason, g.api_user["id"]),
        )
        db.execute("UPDATE inventory_items SET quantity = ? WHERE id = ?", (new_qty, item_id))
        db.commit()

        updated = db.execute("SELECT * FROM inventory_items WHERE id = ?", (item_id,)).fetchone()
        return jsonify({"success": True, "item": row_to_dict(updated)})

    @app.get("/api/inventory/movements")
    @api_auth_required
    def api_inventory_movements():
        item_id = request.args.get("item_id")
        db = get_db()
        if item_id:
            rows = db.execute(
                "SELECT * FROM inventory_movements WHERE item_id = ? ORDER BY id DESC LIMIT 200",
                (int(item_id),),
            ).fetchall()
        else:
            rows = db.execute("SELECT * FROM inventory_movements ORDER BY id DESC LIMIT 200").fetchall()
        return jsonify({"success": True, "movements": [row_to_dict(r) for r in rows]})

    @app.get("/api/invoices")
    @api_auth_required
    def api_invoices_list():
        status = str(request.args.get("status", "")).strip()
        db = get_db()
        query = """
            SELECT i.*, c.name AS customer_name
            FROM invoices i
            JOIN customers c ON c.id = i.customer_id
        """
        params = []
        if status:
            query += " WHERE i.status = ?"
            params.append(status)
        query += " ORDER BY i.id DESC"
        rows = db.execute(query, tuple(params)).fetchall()
        return jsonify({"success": True, "invoices": [row_to_dict(r) for r in rows]})

    @app.post("/api/invoices")
    @api_auth_required
    def api_invoices_create():
        payload = request.get_json(silent=True) or {}
        try:
            customer_id = int(payload.get("customer_id"))
            subtotal = float(payload.get("subtotal", 0) or 0)
            tax_amount = float(payload.get("tax_amount", 0) or 0)
            total = float(payload.get("total", 0) or 0)
        except (TypeError, ValueError):
            return json_error("customer_id, subtotal, tax_amount, total must be valid numbers", 400)

        order_id = payload.get("order_id")
        order_id = int(order_id) if order_id is not None else None
        status = str(payload.get("status", "draft")).strip() or "draft"
        if status not in INVOICE_STATUS_CHOICES:
            return json_error("invalid invoice status", 400)
        due_date = str(payload.get("due_date", "")).strip() or None
        notes = str(payload.get("notes", "")).strip() or None

        db = get_db()
        cust = db.execute("SELECT id FROM customers WHERE id = ?", (customer_id,)).fetchone()
        if cust is None:
            return json_error("customer not found", 404)
        if order_id is not None:
            ord_row = db.execute("SELECT id FROM orders WHERE id = ?", (order_id,)).fetchone()
            if ord_row is None:
                return json_error("order not found", 404)

        cur = db.execute(
            """
            INSERT INTO invoices (invoice_no, customer_id, order_id, subtotal, tax_amount, total, status, due_date, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                next_invoice_no(),
                customer_id,
                order_id,
                subtotal,
                tax_amount,
                total,
                status,
                due_date,
                notes,
                g.api_user["id"],
            ),
        )
        db.commit()
        created = db.execute(
            """
            SELECT i.*, c.name AS customer_name
            FROM invoices i
            JOIN customers c ON c.id = i.customer_id
            WHERE i.id = ?
            """,
            (cur.lastrowid,),
        ).fetchone()
        return jsonify({"success": True, "invoice": row_to_dict(created)}), 201

    @app.post("/api/invoices/<int:invoice_id>/payments")
    @api_auth_required
    def api_invoice_add_payment(invoice_id: int):
        payload = request.get_json(silent=True) or {}
        try:
            amount = float(payload.get("amount", 0) or 0)
        except (TypeError, ValueError):
            return json_error("amount must be a valid number", 400)
        if amount <= 0:
            return json_error("amount must be greater than zero", 400)

        payment_method = str(payload.get("payment_method", "cash")).strip() or "cash"
        if payment_method not in PAYMENT_METHOD_CHOICES:
            return json_error("invalid payment_method", 400)

        reference_no = str(payload.get("reference_no", "")).strip() or None
        notes = str(payload.get("notes", "")).strip() or None

        db = get_db()
        invoice = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
        if invoice is None:
            return json_error("invoice not found", 404)

        db.execute(
            """
            INSERT INTO payments (invoice_id, amount, payment_method, reference_no, notes, created_by)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (invoice_id, amount, payment_method, reference_no, notes, g.api_user["id"]),
        )

        new_paid = float(invoice["paid_amount"] or 0) + amount
        total = float(invoice["total"] or 0)
        if new_paid >= total:
            new_status = "paid"
        elif new_paid > 0:
            new_status = "partial"
        else:
            new_status = invoice["status"]

        db.execute(
            "UPDATE invoices SET paid_amount = ?, status = ? WHERE id = ?",
            (new_paid, new_status, invoice_id),
        )
        db.commit()

        updated = db.execute("SELECT * FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
        return jsonify({"success": True, "invoice": row_to_dict(updated)})

    @app.get("/api/invoices/<int:invoice_id>/payments")
    @api_auth_required
    def api_invoice_payments_list(invoice_id: int):
        db = get_db()
        invoice = db.execute("SELECT id FROM invoices WHERE id = ?", (invoice_id,)).fetchone()
        if invoice is None:
            return json_error("invoice not found", 404)
        rows = db.execute(
            "SELECT * FROM payments WHERE invoice_id = ? ORDER BY id DESC",
            (invoice_id,),
        ).fetchall()
        return jsonify({"success": True, "payments": [row_to_dict(r) for r in rows]})

    @app.errorhandler(404)
    def handle_404(_error):
        if request.path.startswith("/api/"):
            return json_error("Not found", 404)
        return render_template("base.html", content="404"), 404

    @app.route("/login", methods=["GET", "POST"])
    def login():
        init_db()
        if request.method == "POST":
            username = request.form.get("username", "").strip()
            password = request.form.get("password", "")
            db = get_db()
            user = db.execute(
                "SELECT id, username, password_hash, full_name, role, active FROM users WHERE username = ?",
                (username,),
            ).fetchone()

            if user is None or not check_password_hash(user["password_hash"], password):
                flash("بيانات الدخول غير صحيحة", "error")
                return render_template("login.html")

            if not user["active"]:
                flash("الحساب معطل، راجع المدير", "error")
                return render_template("login.html")

            session["user_id"] = user["id"]
            session["username"] = user["username"]
            session["full_name"] = user["full_name"]
            session["role"] = user["role"]
            flash("تم تسجيل الدخول بنجاح", "success")
            return redirect(url_for("dashboard"))

        return render_template("login.html")

    @app.get("/logout")
    def logout():
        session.clear()
        flash("تم تسجيل الخروج", "success")
        return redirect(url_for("login"))

    @app.get("/")
    @login_required
    def dashboard():
        db = get_db()
        stats = {
            "customers": db.execute("SELECT COUNT(*) AS c FROM customers").fetchone()["c"],
            "orders": db.execute("SELECT COUNT(*) AS c FROM orders").fetchone()["c"],
            "employees": db.execute("SELECT COUNT(*) AS c FROM employees").fetchone()["c"],
            "revenue": db.execute("SELECT COALESCE(SUM(total_amount), 0) AS s FROM orders").fetchone()["s"],
        }
        latest_orders = db.execute(
            """
            SELECT o.id, o.order_no, o.title, o.status, o.total_amount, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            ORDER BY o.id DESC
            LIMIT 8
            """
        ).fetchall()
        return render_template("dashboard.html", stats=stats, latest_orders=latest_orders)

    @app.route("/customers", methods=["GET", "POST"])
    @login_required
    def customers():
        db = get_db()
        if request.method == "POST":
            name = request.form.get("name", "").strip()
            phone = request.form.get("phone", "").strip()
            email = request.form.get("email", "").strip()
            company = request.form.get("company", "").strip()
            notes = request.form.get("notes", "").strip()

            if not name:
                flash("اسم العميل مطلوب", "error")
            else:
                db.execute(
                    """
                    INSERT INTO customers (name, phone, email, company, notes)
                    VALUES (?, ?, ?, ?, ?)
                    """,
                    (name, phone or None, email or None, company or None, notes or None),
                )
                db.commit()
                flash("تمت إضافة العميل", "success")
            return redirect(url_for("customers"))

        rows = db.execute("SELECT * FROM customers ORDER BY id DESC").fetchall()
        return render_template("customers.html", customers=rows)

    @app.post("/customers/<int:customer_id>/delete")
    @login_required
    def delete_customer(customer_id: int):
        db = get_db()
        linked = db.execute("SELECT COUNT(*) AS c FROM orders WHERE customer_id = ?", (customer_id,)).fetchone()["c"]
        if linked:
            flash("لا يمكن حذف عميل مرتبط بطلبات", "error")
        else:
            db.execute("DELETE FROM customers WHERE id = ?", (customer_id,))
            db.commit()
            flash("تم حذف العميل", "success")
        return redirect(url_for("customers"))

    @app.route("/orders", methods=["GET", "POST"])
    @login_required
    def orders():
        db = get_db()
        if request.method == "POST":
            customer_id = request.form.get("customer_id", "").strip()
            title = request.form.get("title", "").strip()
            quantity = request.form.get("quantity", "").strip()
            total_amount = request.form.get("total_amount", "").strip()

            if not customer_id or not title or not quantity:
                flash("الحقول المطلوبة: العميل + عنوان الطلب + الكمية", "error")
                return redirect(url_for("orders"))

            try:
                quantity_value = int(quantity)
                amount_value = float(total_amount or "0")
            except ValueError:
                flash("تحقق من صحة الكمية أو المبلغ", "error")
                return redirect(url_for("orders"))

            db.execute(
                """
                INSERT INTO orders (order_no, customer_id, title, quantity, total_amount, status)
                VALUES (?, ?, ?, ?, ?, 'pricing')
                """,
                (next_order_no(), int(customer_id), title, quantity_value, amount_value),
            )
            db.commit()
            flash("تم إنشاء الطلب", "success")
            return redirect(url_for("orders"))

        order_rows = db.execute(
            """
            SELECT o.*, c.name AS customer_name
            FROM orders o
            JOIN customers c ON c.id = o.customer_id
            ORDER BY o.id DESC
            """
        ).fetchall()
        customer_rows = db.execute("SELECT id, name FROM customers ORDER BY name ASC").fetchall()
        return render_template(
            "orders.html",
            orders=order_rows,
            customers=customer_rows,
            order_status_choices=ORDER_STATUS_CHOICES,
        )

    @app.post("/orders/<int:order_id>/status")
    @login_required
    def update_order_status(order_id: int):
        status = request.form.get("status", "pricing")
        valid = {
            "pricing",
            "design",
            "paper_purchase",
            "printing",
            "external_finishing",
            "internal_finishing",
            "quality_check",
            "ready_delivery",
            "delivered",
            "cancelled",
        }
        if status not in valid:
            flash("الحالة غير صحيحة", "error")
            return redirect(url_for("orders"))
        db = get_db()
        db.execute("UPDATE orders SET status = ? WHERE id = ?", (status, order_id))
        db.commit()
        flash("تم تحديث حالة الطلب", "success")
        return redirect(url_for("orders"))

    @app.route("/employees", methods=["GET", "POST"])
    @login_required
    def employees():
        db = get_db()
        if request.method == "POST":
            if session.get("role") != "admin":
                flash("إضافة الموظف متاحة للمدير فقط", "error")
                return redirect(url_for("employees"))

            name = request.form.get("name", "").strip()
            email = request.form.get("email", "").strip()
            role = request.form.get("role", "user").strip()
            if not name:
                flash("اسم الموظف مطلوب", "error")
                return redirect(url_for("employees"))

            if role not in {"admin", "sales", "production", "designer", "technician", "user"}:
                role = "user"

            try:
                db.execute(
                    "INSERT INTO employees (name, email, role, active) VALUES (?, ?, ?, 1)",
                    (name, email or None, role),
                )
                db.commit()
                flash("تمت إضافة الموظف", "success")
            except sqlite3.IntegrityError:
                flash("البريد الإلكتروني مستخدم مسبقًا", "error")
            return redirect(url_for("employees"))

        rows = db.execute("SELECT * FROM employees ORDER BY id DESC").fetchall()
        return render_template("employees.html", employees=rows)

    @app.post("/employees/<int:employee_id>/toggle")
    @login_required
    @admin_required
    def toggle_employee(employee_id: int):
        db = get_db()
        row = db.execute("SELECT active FROM employees WHERE id = ?", (employee_id,)).fetchone()
        if row is None:
            flash("الموظف غير موجود", "error")
            return redirect(url_for("employees"))
        new_active = 0 if row["active"] else 1
        db.execute("UPDATE employees SET active = ? WHERE id = ?", (new_active, employee_id))
        db.commit()
        flash("تم تحديث حالة الموظف", "success")
        return redirect(url_for("employees"))

    with app.app_context():
        init_db()

    return app


app = create_app()


if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)
