import csv
import json
from datetime import datetime, time
from io import StringIO
from pathlib import Path

from flask import Blueprint, Response, current_app, flash, redirect, render_template, request, url_for
from sqlalchemy import or_

from app.extensions import db
from app.models import Debt, Purchase, Sale
from app.services import calculate_dashboard_metrics, debt_summary

web_bp = Blueprint("web", __name__)


def _parse_amount(value: str | None) -> float:
    try:
        return max(float(value or 0), 0.0)
    except (TypeError, ValueError):
        return 0.0


def _parse_date(value: str | None):
    if not value:
        return None
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        return None


def _parse_datetime(value: str | None) -> datetime:
    if not value:
        return datetime.utcnow()


def _parse_bool(value: str | None) -> bool:
    return (value or "").strip().lower() in {"1", "true", "yes", "on"}


def _normalize_sort(value: str | None) -> str:
    allowed = {
        "date_desc",
        "date_asc",
        "amount_desc",
        "amount_asc",
        "remaining_desc",
        "remaining_asc",
    }
    selected = (value or "date_desc").strip().lower()
    return selected if selected in allowed else "date_desc"


def _apply_sort(query, model, sort_key: str, remaining_expr):
    if sort_key == "date_asc":
        return query.order_by(model.created_at.asc())
    if sort_key == "amount_desc":
        return query.order_by(model.amount.desc(), model.created_at.desc())
    if sort_key == "amount_asc":
        return query.order_by(model.amount.asc(), model.created_at.desc())
    if sort_key == "remaining_desc":
        return query.order_by(remaining_expr.desc(), model.created_at.desc())
    if sort_key == "remaining_asc":
        return query.order_by(remaining_expr.asc(), model.created_at.desc())
    return query.order_by(model.created_at.desc())
    try:
        return datetime.fromisoformat(value)
    except ValueError:
        return datetime.utcnow()


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

    include_settled = _parse_bool(request.args.get("include_settled"))
    sort_key = _normalize_sort(request.args.get("sort"))
    sales_query = Sale.query
    if not include_settled:
        sales_query = sales_query.filter(Sale.amount > Sale.paid_amount)
    sales_rows = _apply_sort(sales_query, Sale, sort_key, Sale.amount - Sale.paid_amount).all()
    return render_template(
        "sales.html",
        sales=sales_rows,
        filters={"include_settled": include_settled, "sort": sort_key},
    )


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

    include_settled = _parse_bool(request.args.get("include_settled"))
    sort_key = _normalize_sort(request.args.get("sort"))
    purchase_query = Purchase.query
    if not include_settled:
        purchase_query = purchase_query.filter(Purchase.amount > Purchase.paid_amount)
    purchase_rows = _apply_sort(
        purchase_query, Purchase, sort_key, Purchase.amount - Purchase.paid_amount
    ).all()
    return render_template(
        "purchases.html",
        purchases=purchase_rows,
        filters={"include_settled": include_settled, "sort": sort_key},
    )


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

    include_settled = _parse_bool(request.args.get("include_settled"))
    sort_key = _normalize_sort(request.args.get("sort"))
    debt_query = Debt.query
    if not include_settled:
        debt_query = debt_query.filter(Debt.total_amount > Debt.paid_amount)

    if sort_key == "date_asc":
        debt_query = debt_query.order_by(Debt.created_at.asc())
    elif sort_key == "amount_desc":
        debt_query = debt_query.order_by(Debt.total_amount.desc(), Debt.created_at.desc())
    elif sort_key == "amount_asc":
        debt_query = debt_query.order_by(Debt.total_amount.asc(), Debt.created_at.desc())
    elif sort_key == "remaining_desc":
        debt_query = debt_query.order_by(
            (Debt.total_amount - Debt.paid_amount).desc(), Debt.created_at.desc()
        )
    elif sort_key == "remaining_asc":
        debt_query = debt_query.order_by(
            (Debt.total_amount - Debt.paid_amount).asc(), Debt.created_at.desc()
        )
    else:
        debt_query = debt_query.order_by(Debt.created_at.desc())

    debt_rows = debt_query.all()
    return render_template(
        "debts.html",
        debts=debt_rows,
        filters={"include_settled": include_settled, "sort": sort_key},
    )


@web_bp.route("/search")
def search():
    q = (request.args.get("q") or "").strip()
    entity = (request.args.get("entity") or "all").strip().lower()
    min_amount = _parse_amount(request.args.get("min_amount")) if request.args.get("min_amount") else None
    max_amount = _parse_amount(request.args.get("max_amount")) if request.args.get("max_amount") else None
    date_from = _parse_date(request.args.get("date_from"))
    date_to = _parse_date(request.args.get("date_to"))

    if date_from and date_to and date_from > date_to:
        date_from, date_to = date_to, date_from

    results = []
    stats = {"sales": 0, "purchases": 0, "debts": 0}
    from_dt = datetime.combine(date_from, time.min) if date_from else None
    to_dt = datetime.combine(date_to, time.max) if date_to else None

    if entity in {"all", "sales"}:
        sales_query = Sale.query
        if q:
            sales_query = sales_query.filter(
                or_(Sale.customer_name.ilike(f"%{q}%"), Sale.description.ilike(f"%{q}%"))
            )
        if min_amount is not None:
            sales_query = sales_query.filter(Sale.amount >= min_amount)
        if max_amount is not None:
            sales_query = sales_query.filter(Sale.amount <= max_amount)
        if from_dt:
            sales_query = sales_query.filter(Sale.created_at >= from_dt)
        if to_dt:
            sales_query = sales_query.filter(Sale.created_at <= to_dt)

        sales_rows = sales_query.order_by(Sale.created_at.desc()).all()
        stats["sales"] = len(sales_rows)
        for row in sales_rows:
            results.append(
                {
                    "entry_type": "sale",
                    "entry_type_ar": "بيع",
                    "party_name": row.customer_name,
                    "description": row.description or "-",
                    "amount": row.amount,
                    "paid_amount": row.paid_amount,
                    "remaining": row.remaining,
                    "created_at": row.created_at,
                }
            )

    if entity in {"all", "purchases"}:
        purchases_query = Purchase.query
        if q:
            purchases_query = purchases_query.filter(
                or_(Purchase.supplier_name.ilike(f"%{q}%"), Purchase.description.ilike(f"%{q}%"))
            )
        if min_amount is not None:
            purchases_query = purchases_query.filter(Purchase.amount >= min_amount)
        if max_amount is not None:
            purchases_query = purchases_query.filter(Purchase.amount <= max_amount)
        if from_dt:
            purchases_query = purchases_query.filter(Purchase.created_at >= from_dt)
        if to_dt:
            purchases_query = purchases_query.filter(Purchase.created_at <= to_dt)

        purchases_rows = purchases_query.order_by(Purchase.created_at.desc()).all()
        stats["purchases"] = len(purchases_rows)
        for row in purchases_rows:
            results.append(
                {
                    "entry_type": "purchase",
                    "entry_type_ar": "شراء",
                    "party_name": row.supplier_name,
                    "description": row.description or "-",
                    "amount": row.amount,
                    "paid_amount": row.paid_amount,
                    "remaining": row.remaining,
                    "created_at": row.created_at,
                }
            )

    if entity in {"all", "debts"}:
        debts_query = Debt.query
        if q:
            debts_query = debts_query.filter(or_(Debt.party_name.ilike(f"%{q}%"), Debt.note.ilike(f"%{q}%")))
        if min_amount is not None:
            debts_query = debts_query.filter(Debt.total_amount >= min_amount)
        if max_amount is not None:
            debts_query = debts_query.filter(Debt.total_amount <= max_amount)
        if from_dt:
            debts_query = debts_query.filter(Debt.created_at >= from_dt)
        if to_dt:
            debts_query = debts_query.filter(Debt.created_at <= to_dt)

        debt_rows = debts_query.order_by(Debt.created_at.desc()).all()
        stats["debts"] = len(debt_rows)
        for row in debt_rows:
            results.append(
                {
                    "entry_type": "debt",
                    "entry_type_ar": "دين",
                    "party_name": row.party_name,
                    "description": row.note or ("عميل" if row.party_type == "customer" else "مورد"),
                    "amount": row.total_amount,
                    "paid_amount": row.paid_amount,
                    "remaining": row.remaining,
                    "created_at": row.created_at,
                }
            )

    results.sort(key=lambda item: item["created_at"], reverse=True)
    return render_template(
        "search.html",
        results=results,
        stats=stats,
        filters={
            "q": q,
            "entity": entity,
            "min_amount": request.args.get("min_amount", ""),
            "max_amount": request.args.get("max_amount", ""),
            "date_from": request.args.get("date_from", ""),
            "date_to": request.args.get("date_to", ""),
        },
    )


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


def _build_backup_payload() -> dict:
    return {
        "app_name": "دفتر الحسابات المنتظم",
        "backup_version": 1,
        "generated_at": datetime.utcnow().isoformat(),
        "sales": [
            {
                "customer_name": row.customer_name,
                "description": row.description or "",
                "amount": row.amount,
                "paid_amount": row.paid_amount,
                "created_at": row.created_at.isoformat(),
            }
            for row in Sale.query.order_by(Sale.created_at.asc()).all()
        ],
        "purchases": [
            {
                "supplier_name": row.supplier_name,
                "description": row.description or "",
                "amount": row.amount,
                "paid_amount": row.paid_amount,
                "created_at": row.created_at.isoformat(),
            }
            for row in Purchase.query.order_by(Purchase.created_at.asc()).all()
        ],
        "debts": [
            {
                "party_name": row.party_name,
                "party_type": row.party_type,
                "total_amount": row.total_amount,
                "paid_amount": row.paid_amount,
                "note": row.note or "",
                "created_at": row.created_at.isoformat(),
            }
            for row in Debt.query.order_by(Debt.created_at.asc()).all()
        ],
    }


def _write_auto_backup_snapshot() -> str | None:
    payload = _build_backup_payload()
    backups_dir = Path(current_app.instance_path) / "backups"
    backups_dir.mkdir(parents=True, exist_ok=True)
    filename = f"pre_restore_backup_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    backup_path = backups_dir / filename
    backup_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return filename


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


@web_bp.route("/reports/backup/export.json")
def export_backup_json():
    payload = _build_backup_payload()
    return Response(
        json.dumps(payload, ensure_ascii=False, indent=2),
        mimetype="application/json; charset=utf-8",
        headers={"Content-Disposition": 'attachment; filename="accounting_backup.json"'},
    )


@web_bp.route("/reports/backup/import", methods=["POST"])
def import_backup_json():
    backup_file = request.files.get("backup_file")
    import_mode = (request.form.get("import_mode") or "append").strip().lower()
    if import_mode not in {"append", "replace"}:
        import_mode = "append"

    if not backup_file or not backup_file.filename:
        flash("يرجى اختيار ملف نسخ احتياطي بصيغة JSON.", "error")
        return redirect(url_for("web.reports"))

    try:
        payload = json.load(backup_file.stream)
    except json.JSONDecodeError:
        flash("الملف غير صالح. الرجاء رفع ملف JSON صحيح.", "error")
        return redirect(url_for("web.reports"))

    sales_data = payload.get("sales", [])
    purchases_data = payload.get("purchases", [])
    debts_data = payload.get("debts", [])
    if not all(isinstance(bucket, list) for bucket in (sales_data, purchases_data, debts_data)):
        flash("بنية ملف النسخ الاحتياطي غير صحيحة.", "error")
        return redirect(url_for("web.reports"))

    auto_backup_name = None
    try:
        auto_backup_name = _write_auto_backup_snapshot()
    except Exception:
        auto_backup_name = None

    if import_mode == "replace":
        db.session.query(Sale).delete()
        db.session.query(Purchase).delete()
        db.session.query(Debt).delete()

    added_counts = {"sales": 0, "purchases": 0, "debts": 0}
    try:
        for item in sales_data:
            amount = _parse_amount(item.get("amount"))
            paid_amount = min(_parse_amount(item.get("paid_amount")), amount)
            db.session.add(
                Sale(
                    customer_name=(item.get("customer_name") or "غير محدد").strip(),
                    description=(item.get("description") or "").strip() or None,
                    amount=amount,
                    paid_amount=paid_amount,
                    created_at=_parse_datetime(item.get("created_at")),
                )
            )
            added_counts["sales"] += 1

        for item in purchases_data:
            amount = _parse_amount(item.get("amount"))
            paid_amount = min(_parse_amount(item.get("paid_amount")), amount)
            db.session.add(
                Purchase(
                    supplier_name=(item.get("supplier_name") or "غير محدد").strip(),
                    description=(item.get("description") or "").strip() or None,
                    amount=amount,
                    paid_amount=paid_amount,
                    created_at=_parse_datetime(item.get("created_at")),
                )
            )
            added_counts["purchases"] += 1

        for item in debts_data:
            total_amount = _parse_amount(item.get("total_amount"))
            paid_amount = min(_parse_amount(item.get("paid_amount")), total_amount)
            party_type = (item.get("party_type") or "customer").strip().lower()
            if party_type not in {"customer", "supplier"}:
                party_type = "customer"

            db.session.add(
                Debt(
                    party_name=(item.get("party_name") or "غير محدد").strip(),
                    party_type=party_type,
                    total_amount=total_amount,
                    paid_amount=paid_amount,
                    note=(item.get("note") or "").strip() or None,
                    created_at=_parse_datetime(item.get("created_at")),
                )
            )
            added_counts["debts"] += 1

        db.session.commit()
    except Exception:
        db.session.rollback()
        flash("حدث خطأ أثناء استيراد النسخة الاحتياطية.", "error")
        return redirect(url_for("web.reports"))

    mode_label = "استبدال كامل" if import_mode == "replace" else "إضافة على البيانات الحالية"
    flash(
        f"تم الاستيراد بنجاح ({mode_label}) - مبيعات: {added_counts['sales']}، "
        f"مشتريات: {added_counts['purchases']}، ديون: {added_counts['debts']}"
        + (f" | نسخة أمان تلقائية: {auto_backup_name}" if auto_backup_name else ""),
        "success",
    )
    return redirect(url_for("web.reports"))
