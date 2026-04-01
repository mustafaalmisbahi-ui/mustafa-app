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


def create_app() -> Flask:
    app = Flask(__name__)
    app.config["SECRET_KEY"] = os.environ.get("ERP_SECRET_KEY", "change-me-in-production")

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
