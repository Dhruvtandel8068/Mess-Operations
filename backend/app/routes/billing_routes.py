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
    try:
        current_user_id = int(get_jwt_identity())

        if is_admin():
            rows = Bill.query.order_by(Bill.created_at.desc()).all()
        else:
            rows = Bill.query.filter_by(
                user_id=current_user_id
            ).order_by(Bill.created_at.desc()).all()

        result = []
        for bill in rows:
            result.append(
                {
                    **bill.to_dict(),
                    "payments": [payment.to_dict() for payment in bill.payments],
                }
            )

        return jsonify(result), 200

    except Exception as e:
        print("BILL LIST ERROR:", str(e))
        return jsonify({"message": f"Failed to load bills: {str(e)}"}), 500


@billing_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_monthly_bills():
    if not is_admin():
        return jsonify({"message": "Only admin can generate bills"}), 403

    try:
        data = request.get_json() or {}

        month = int(data.get("month") or 0)
        year = int(data.get("year") or 0)
        per_meal_cost = float(data.get("per_meal_cost") or 0)
        billing_type = (data.get("billing_type") or "all").strip().lower()
        user_id = data.get("user_id")

        if not month or not year or per_meal_cost <= 0:
            return jsonify(
                {"message": "Valid month, year and per_meal_cost are required"}
            ), 400

        if month < 1 or month > 12:
            return jsonify({"message": "Month must be between 1 and 12"}), 400

        users_query = User.query.filter_by(role="user")

        if billing_type == "single":
            if not user_id:
                return jsonify({"message": "Please select a user"}), 400

            selected_user = users_query.filter_by(id=int(user_id)).first()
            if not selected_user:
                return jsonify({"message": "Selected user not found"}), 404

            users = [selected_user]
        else:
            users = users_query.all()

        created_count = 0
        updated_count = 0

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
                bill.status = "Unpaid"
                updated_count += 1
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
                created_count += 1

        db.session.commit()

        return jsonify({
            "message": f"Bill generation completed. Created: {created_count}, Updated: {updated_count}"
        }), 200

    except Exception as e:
        db.session.rollback()
        print("BILL GENERATE ERROR:", str(e))
        return jsonify({"message": f"Failed to generate bills: {str(e)}"}), 500


@billing_bp.route("/<int:bill_id>/pay", methods=["POST"])
@jwt_required()
def upload_payment(bill_id):
    try:
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
            status="Pending",
        )

        bill.status = "Pending Approval"

        db.session.add(payment)
        db.session.commit()

        return jsonify({
            "message": "Payment submitted successfully",
            "payment": payment.to_dict(),
            "bill": bill.to_dict(),
        }), 200

    except Exception as e:
        db.session.rollback()
        print("PAYMENT ERROR:", str(e))
        return jsonify({"message": f"Failed to submit payment: {str(e)}"}), 500


@billing_bp.route("/payments/pending", methods=["GET"])
@jwt_required()
def list_pending_payments():
    if not is_admin():
        return jsonify({"message": "Only admin can view pending payments"}), 403

    payments = Payment.query.filter_by(status="Pending").order_by(Payment.created_at.desc()).all()

    result = []
    for payment in payments:
        bill = payment.bill
        user = bill.user if bill else None

        result.append({
            **payment.to_dict(),
            "bill": bill.to_dict() if bill else None,
            "user_name": user.full_name if user else "-",
            "user_email": user.email if user else "-",
        })

    return jsonify(result), 200


@billing_bp.route("/payments/<int:payment_id>/approve", methods=["PUT"])
@jwt_required()
def approve_payment(payment_id):
    if not is_admin():
        return jsonify({"message": "Only admin can approve payments"}), 403

    payment = Payment.query.get_or_404(payment_id)
    data = request.get_json() or {}
    admin_remark = (data.get("admin_remark") or "").strip()

    payment.status = "Approved"
    payment.admin_remark = admin_remark or None

    if payment.bill:
        payment.bill.status = "Paid"

    db.session.commit()

    return jsonify({"message": "Payment approved successfully"}), 200


@billing_bp.route("/payments/<int:payment_id>/reject", methods=["PUT"])
@jwt_required()
def reject_payment(payment_id):
    if not is_admin():
        return jsonify({"message": "Only admin can reject payments"}), 403

    payment = Payment.query.get_or_404(payment_id)
    data = request.get_json() or {}
    admin_remark = (data.get("admin_remark") or "").strip()

    payment.status = "Rejected"
    payment.admin_remark = admin_remark or None

    if payment.bill:
        payment.bill.status = "Unpaid"

    db.session.commit()

    return jsonify({"message": "Payment rejected successfully"}), 200