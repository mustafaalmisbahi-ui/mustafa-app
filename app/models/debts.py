from datetime import datetime

from app.extensions import db


class Debt(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    party_name = db.Column(db.String(120), nullable=False)
    party_type = db.Column(db.String(20), nullable=False)  # customer | supplier
    total_amount = db.Column(db.Float, nullable=False, default=0.0)
    paid_amount = db.Column(db.Float, nullable=False, default=0.0)
    note = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @property
    def remaining(self):
        return max(self.total_amount - self.paid_amount, 0.0)
