import os
import sqlite3
from functools import wraps

from flask import Flask, flash, g, redirect, render_template, request, session, url_for
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
