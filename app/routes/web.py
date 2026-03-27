import csv
from io import StringIO

from flask import Blueprint, flash, redirect, render_template, request, url_for
from flask import Response

from app.extensions import db
from app.models import Debt, Purchase, Sale
from app.services import calculate_dashboard_metrics, debt_summary

web_bp = Blueprint("web", __name__)


def _parse_amount(value: str | None) -> float:
    try:
        return max(float(value or 0), 0.0)
    except (TypeError, ValueError):
        return 0.0


@web_bp.route("/")
def dashboard():
    sales = Sale.query.order_by(Sale.created_at.desc()).limit(5).all()
    purchases = Purchase.query.order_by(Purchase.created_at.desc()).limit(5).all()
    metrics = calculate_dashboard_metrics()
    debt_totals = debt_summary()
    return render_template(
        "dashboard.html",
        metrics=metrics,
        recent_sales=sales,
        recent_purchases=purchases,
        debt_totals=debt_totals,
    )


@web_bp.route("/sales", methods=["GET", "POST"])
def sales():
    if request.method == "POST":
        customer_name = (request.form.get("customer_name") or "").strip()
        if not customer_name:
            flash("اسم العميل مطلوب.", "error")
            return redirect(url_for("web.sales"))

        amount = _parse_amount(request.form.get("amount"))
        paid_amount = _parse_amount(request.form.get("paid_amount"))
        paid_amount = min(paid_amount, amount)

        sale = Sale(
            customer_name=customer_name,
            description=(request.form.get("description") or "").strip() or None,
            amount=amount,
            paid_amount=paid_amount,
        )
        db.session.add(sale)
        db.session.commit()
        flash("تمت إضافة عملية البيع بنجاح.", "success")
        return redirect(url_for("web.sales"))

    sales_rows = Sale.query.order_by(Sale.created_at.desc()).all()
    return render_template("sales.html", sales=sales_rows)


@web_bp.route("/purchases", methods=["GET", "POST"])
def purchases():
    if request.method == "POST":
        supplier_name = (request.form.get("supplier_name") or "").strip()
        if not supplier_name:
            flash("اسم المورد مطلوب.", "error")
            return redirect(url_for("web.purchases"))

        amount = _parse_amount(request.form.get("amount"))
        paid_amount = _parse_amount(request.form.get("paid_amount"))
        paid_amount = min(paid_amount, amount)

        purchase = Purchase(
            supplier_name=supplier_name,
            description=(request.form.get("description") or "").strip() or None,
            amount=amount,
            paid_amount=paid_amount,
        )
        db.session.add(purchase)
        db.session.commit()
        flash("تمت إضافة عملية الشراء بنجاح.", "success")
        return redirect(url_for("web.purchases"))

    purchase_rows = Purchase.query.order_by(Purchase.created_at.desc()).all()
    return render_template("purchases.html", purchases=purchase_rows)


@web_bp.route("/debts", methods=["GET", "POST"])
def debts():
    if request.method == "POST":
        party_name = (request.form.get("party_name") or "").strip()
        party_type = (request.form.get("party_type") or "").strip().lower()
        if not party_name or party_type not in {"customer", "supplier"}:
            flash("الاسم ونوع الطرف (عميل/مورد) مطلوبان.", "error")
            return redirect(url_for("web.debts"))

        total_amount = _parse_amount(request.form.get("total_amount"))
        paid_amount = _parse_amount(request.form.get("paid_amount"))
        paid_amount = min(paid_amount, total_amount)

        debt = Debt(
            party_name=party_name,
            party_type=party_type,
            total_amount=total_amount,
            paid_amount=paid_amount,
            note=(request.form.get("note") or "").strip() or None,
        )
        db.session.add(debt)
        db.session.commit()
        flash("تم تسجيل الدين بنجاح.", "success")
        return redirect(url_for("web.debts"))

    debt_rows = Debt.query.order_by(Debt.created_at.desc()).all()
    return render_template("debts.html", debts=debt_rows)


@web_bp.route("/reports")
def reports():
    return render_template("reports.html", metrics=calculate_dashboard_metrics())


def _csv_response(filename: str, headers: list[str], rows: list[list[str]]) -> Response:
    buffer = StringIO()
    writer = csv.writer(buffer)
    writer.writerow(headers)
    writer.writerows(rows)
    return Response(
        buffer.getvalue(),
        mimetype="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@web_bp.route("/reports/export/sales.csv")
def export_sales_csv():
    sales_rows = Sale.query.order_by(Sale.created_at.desc()).all()
    rows = [
        [
            row.customer_name,
            row.description or "",
            f"{row.amount:.2f}",
            f"{row.paid_amount:.2f}",
            f"{row.remaining:.2f}",
            row.created_at.strftime("%Y-%m-%d"),
        ]
        for row in sales_rows
    ]
    return _csv_response(
        "sales_report.csv",
        ["customer_name", "description", "amount", "paid_amount", "remaining", "date"],
        rows,
    )


@web_bp.route("/reports/export/purchases.csv")
def export_purchases_csv():
    purchase_rows = Purchase.query.order_by(Purchase.created_at.desc()).all()
    rows = [
        [
            row.supplier_name,
            row.description or "",
            f"{row.amount:.2f}",
            f"{row.paid_amount:.2f}",
            f"{row.remaining:.2f}",
            row.created_at.strftime("%Y-%m-%d"),
        ]
        for row in purchase_rows
    ]
    return _csv_response(
        "purchases_report.csv",
        ["supplier_name", "description", "amount", "paid_amount", "remaining", "date"],
        rows,
    )


@web_bp.route("/reports/export/debts.csv")
def export_debts_csv():
    debt_rows = Debt.query.order_by(Debt.created_at.desc()).all()
    rows = [
        [
            row.party_name,
            row.party_type,
            f"{row.total_amount:.2f}",
            f"{row.paid_amount:.2f}",
            f"{row.remaining:.2f}",
            row.note or "",
            row.created_at.strftime("%Y-%m-%d"),
        ]
        for row in debt_rows
    ]
    return _csv_response(
        "debts_report.csv",
        ["party_name", "party_type", "total_amount", "paid_amount", "remaining", "note", "date"],
        rows,
    )


@web_bp.route("/reports/export/dashboard.csv")
def export_dashboard_csv():
    metrics = calculate_dashboard_metrics()
    rows = [
        ["total_sales", f"{metrics['total_sales']:.2f}"],
        ["total_purchases", f"{metrics['total_purchases']:.2f}"],
        ["net_profit", f"{metrics['net_profit']:.2f}"],
        ["customer_debts", f"{metrics['customer_debts']:.2f}"],
        ["supplier_debts", f"{metrics['supplier_debts']:.2f}"],
        ["open_debts_total", f"{metrics['open_debts_total']:.2f}"],
    ]
    return _csv_response("dashboard_summary.csv", ["metric", "value"], rows)
