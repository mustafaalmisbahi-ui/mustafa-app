from sqlalchemy import func

from app.extensions import db
from app.models import Debt, Purchase, Sale


def calculate_dashboard_metrics():
    total_sales = db.session.query(func.coalesce(func.sum(Sale.amount), 0.0)).scalar() or 0.0
    total_purchases = (
        db.session.query(func.coalesce(func.sum(Purchase.amount), 0.0)).scalar() or 0.0
    )
    net_profit = total_sales - total_purchases

    customer_debts = (
        db.session.query(func.coalesce(func.sum(Debt.total_amount - Debt.paid_amount), 0.0))
        .filter(Debt.party_type == "customer")
        .scalar()
        or 0.0
    )
    supplier_debts = (
        db.session.query(func.coalesce(func.sum(Debt.total_amount - Debt.paid_amount), 0.0))
        .filter(Debt.party_type == "supplier")
        .scalar()
        or 0.0
    )

    return {
        "total_sales": round(total_sales, 2),
        "total_purchases": round(total_purchases, 2),
        "net_profit": round(net_profit, 2),
        "customer_debts": round(customer_debts, 2),
        "supplier_debts": round(supplier_debts, 2),
        "open_debts_total": round(customer_debts + supplier_debts, 2),
    }


def debt_summary():
    customer_total = (
        db.session.query(func.coalesce(func.sum(Debt.total_amount - Debt.paid_amount), 0.0))
        .filter(Debt.party_type == "customer")
        .scalar()
        or 0.0
    )
    supplier_total = (
        db.session.query(func.coalesce(func.sum(Debt.total_amount - Debt.paid_amount), 0.0))
        .filter(Debt.party_type == "supplier")
        .scalar()
        or 0.0
    )
    return {
        "customer_total": round(customer_total, 2),
        "supplier_total": round(supplier_total, 2),
        "total_open": round(customer_total + supplier_total, 2),
    }
