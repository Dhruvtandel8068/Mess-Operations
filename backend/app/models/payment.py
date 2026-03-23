from app.utils.db import db


class Payment(db.Model):
    __tablename__ = "payments"

    id = db.Column(db.Integer, primary_key=True)
    bill_id = db.Column(db.Integer, db.ForeignKey("bills.id", ondelete="CASCADE"), nullable=False)
    mode = db.Column(db.String(20), nullable=False)
    proof_filename = db.Column(db.String(255), nullable=True)
    receipt_no = db.Column(db.String(60), nullable=True)
    note = db.Column(db.String(255), nullable=True)
    paid_at = db.Column(db.DateTime, server_default=db.func.now())

    bill = db.relationship("Bill", backref="payments")

    def to_dict(self):
        return {
            "id": self.id,
            "bill_id": self.bill_id,
            "mode": self.mode,
            "proof_filename": self.proof_filename,
            "proof_url": f"/api/uploads/{self.proof_filename}" if self.proof_filename else None,
            "receipt_no": self.receipt_no,
            "note": self.note,
            "paid_at": str(self.paid_at) if self.paid_at else None,
        }