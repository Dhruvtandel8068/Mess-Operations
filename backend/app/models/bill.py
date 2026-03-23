from app.utils.db import db


class Bill(db.Model):
    __tablename__ = "bills"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    month = db.Column(db.Integer, nullable=True)
    year = db.Column(db.Integer, nullable=True)
    period = db.Column(db.String(30), nullable=True)
    bill_type = db.Column(db.String(20), nullable=False, default="monthly")
    total_meals = db.Column(db.Integer, nullable=True)
    per_meal_cost = db.Column(db.Float, nullable=True)
    total_amount = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(20), nullable=False, default="Unpaid")
    created_at = db.Column(db.DateTime, server_default=db.func.now())

    user = db.relationship("User", backref="bills")

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else "-",
            "month": self.month,
            "year": self.year,
            "period": self.period,
            "bill_type": self.bill_type,
            "total_meals": self.total_meals,
            "per_meal_cost": self.per_meal_cost,
            "total_amount": self.total_amount,
            "status": self.status,
            "created_at": str(self.created_at) if self.created_at else None,
        }