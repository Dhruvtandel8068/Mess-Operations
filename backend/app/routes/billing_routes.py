import os
from uuid import uuid4

from flask import Blueprint, jsonify, request, current_app
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import extract

from app.models.user import User
from app.models.attendance import Attendance
from app.models.bill import Bill
from app.models.payment import Payment
from app.utils.db import db

billing_bp = Blueprint("billing_bp", __name__)


def is_admin():
    return get_jwt().get("role") == "admin"


@billing_bp.route("/", methods=["GET"])
@jwt_required()
def list_bills():
    if is_admin():
        rows = Bill.query.order_by(Bill.created_at.desc()).all()
    else:
        rows = Bill.query.filter_by(
            user_id=int(get_jwt_identity())
        ).order_by(Bill.created_at.desc()).all()

    result = []
    for bill in rows:
        result.append(
            {
                **bill.to_dict(),
                "payments": [payment.to_dict() for payment in bill.payments],
            }
        )

    return jsonify(result)


@billing_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_monthly_bills():
    if not is_admin():
        return jsonify({"message": "Only admin can generate bills"}), 403

    data = request.get_json() or {}

    month = int(data.get("month") or 0)
    year = int(data.get("year") or 0)
    per_meal_cost = float(data.get("per_meal_cost") or 0)

    if not month or not year or per_meal_cost <= 0:
        return jsonify(
            {"message": "Valid month, year and per_meal_cost are required"}
        ), 400

    users = User.query.filter_by(role="user").all()
    created = 0

    for user in users:
        attendance_rows = Attendance.query.filter(
            Attendance.user_id == user.id,
            extract("month", Attendance.date) == month,
            extract("year", Attendance.date) == year,
        ).all()

        total_meals = sum(
            int(bool(a.breakfast)) + int(bool(a.lunch)) + int(bool(a.dinner))
            for a in attendance_rows
        )
        total_amount = round(total_meals * per_meal_cost, 2)

        bill = Bill.query.filter_by(user_id=user.id, month=month, year=year).first()

        if bill:
            bill.total_meals = total_meals
            bill.per_meal_cost = per_meal_cost
            bill.total_amount = total_amount
            bill.period = f"{month:02d}/{year}"
            bill.bill_type = "monthly"
        else:
            bill = Bill(
                user_id=user.id,
                month=month,
                year=year,
                period=f"{month:02d}/{year}",
                bill_type="monthly",
                total_meals=total_meals,
                per_meal_cost=per_meal_cost,
                total_amount=total_amount,
                status="Unpaid",
            )
            db.session.add(bill)
            created += 1

    db.session.commit()

    return jsonify(
        {"message": f"Bills generated successfully. New bills created: {created}"}
    )


@billing_bp.route("/<int:bill_id>/pay", methods=["POST"])
@jwt_required()
def upload_payment(bill_id):
    bill = Bill.query.get_or_404(bill_id)

    if not is_admin() and bill.user_id != int(get_jwt_identity()):
        return jsonify({"message": "Not allowed"}), 403

    mode = request.form.get("mode", "UPI").strip()
    receipt_no = request.form.get("receipt_no", "").strip()
    note = request.form.get("note", "").strip()
    proof = request.files.get("proof")

    filename = None
    if proof and proof.filename:
        ext = os.path.splitext(proof.filename)[1]
        filename = f"payment_{bill_id}_{uuid4().hex}{ext}"
        proof.save(os.path.join(current_app.config["UPLOAD_FOLDER"], filename))

    payment = Payment(
        bill_id=bill.id,
        mode=mode,
        proof_filename=filename,
        receipt_no=receipt_no or None,
        note=note or None,
    )

    bill.status = "Paid"

    db.session.add(payment)
    db.session.commit()

    return jsonify(
        {
            "message": "Payment submitted successfully",
            "payment": payment.to_dict(),
            "bill": bill.to_dict(),
        }
    )