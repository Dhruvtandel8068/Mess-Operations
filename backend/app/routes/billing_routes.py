import os
from uuid import uuid4

from flask import Blueprint, jsonify, request, current_app, send_from_directory
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity
from sqlalchemy import extract
from app.helpers.notifications import create_notification
from app.models.user import User
from app.models.attendance import Attendance
from app.models.bill import Bill
from app.models.payment import Payment
from app.models.notification import Notification
from app.utils.db import db

billing_bp = Blueprint("billing_bp", __name__)


def is_admin():
    return get_jwt().get("role") == "admin"


def create_notification(title, message, user_id=None, role_target=None, notification_type="general", action_url=None):
    row = Notification(
        user_id=user_id,
        title=title,
        message=message,
        role_target=role_target,
        notification_type=notification_type,
        action_url=action_url,
    )
    db.session.add(row)


def bill_with_payments_dict(bill):
    user = bill.user if hasattr(bill, "user") else User.query.get(bill.user_id)
    payments = [payment.to_dict() for payment in bill.payments] if hasattr(bill, "payments") else []
    return {
        **bill.to_dict(),
        "user_name": user.full_name if user else "-",
        "user_email": user.email if user else "-",
        "payments": payments,
    }


@billing_bp.route("/", methods=["GET"])
@jwt_required()
def list_bills():
    try:
        current_user_id = int(get_jwt_identity())
        month = request.args.get("month")
        year = request.args.get("year")
        status = (request.args.get("status") or "").strip()

        query = Bill.query
        if is_admin():
            pass
        else:
            query = query.filter_by(user_id=current_user_id)

        if month:
            query = query.filter(Bill.month == int(month))
        if year:
            query = query.filter(Bill.year == int(year))
        if status:
            query = query.filter(Bill.status == status)

        rows = query.order_by(Bill.created_at.desc()).all()
        return jsonify([bill_with_payments_dict(bill) for bill in rows]), 200

    except Exception as e:
        print("BILL LIST ERROR:", str(e))
        return jsonify({"message": f"Failed to load bills: {str(e)}"}), 500


@billing_bp.route("/summary", methods=["GET"])
@jwt_required()
def bill_summary():
    try:
        current_user_id = int(get_jwt_identity())
        month = request.args.get("month")
        year = request.args.get("year")

        query = Bill.query
        if not is_admin():
            query = query.filter_by(user_id=current_user_id)

        if month:
            query = query.filter(Bill.month == int(month))
        if year:
            query = query.filter(Bill.year == int(year))

        rows = query.all()

        return jsonify({
            "total_bills": len(rows),
            "paid_bills": sum(1 for b in rows if b.status == "Paid"),
            "unpaid_bills": sum(1 for b in rows if b.status == "Unpaid"),
            "pending_approval": sum(1 for b in rows if b.status == "Pending Approval"),
            "total_amount": round(sum(float(b.total_amount or 0) for b in rows), 2),
        }), 200

    except Exception as e:
        print("BILL SUMMARY ERROR:", str(e))
        return jsonify({"message": f"Failed to load bill summary: {str(e)}"}), 500


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
            return jsonify({"message": "Valid month, year and per_meal_cost are required"}), 400

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
                if bill.status != "Paid":
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

            create_notification(
                title="Bill Generated",
                message=f"Your bill for {month:02d}/{year} has been generated. Amount: ₹{total_amount}",
                user_id=user.id,
                notification_type="bill_generated",
                action_url="/billing",
            )

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

        if not proof or not proof.filename:
            return jsonify({"message": "Payment screenshot/proof is required"}), 400

        allowed_extensions = {".jpg", ".jpeg", ".png", ".pdf"}
        ext = os.path.splitext(proof.filename)[1].lower()
        if ext not in allowed_extensions:
            return jsonify({"message": "Only JPG, JPEG, PNG, PDF files are allowed"}), 400

        filename = f"payment_{bill_id}_{uuid4().hex}{ext}"
        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        os.makedirs(upload_folder, exist_ok=True)
        proof.save(os.path.join(upload_folder, filename))

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

        create_notification(
            title="New Payment Submitted",
            message=f"Payment proof submitted for bill {bill.period}. Please review.",
            role_target="admin",
            notification_type="payment_submitted",
            action_url="/payment-approval",
        )

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
        create_notification(
            title="Payment Approved",
            message=f"Your payment for bill {payment.bill.period} has been approved.",
            user_id=payment.bill.user_id,
            notification_type="payment_approved",
            action_url="/billing",
        )

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
        create_notification(
            title="Payment Rejected",
            message=f"Your payment for bill {payment.bill.period} was rejected. Remark: {payment.admin_remark or 'No remark'}",
            user_id=payment.bill.user_id,
            notification_type="payment_rejected",
            action_url="/billing",
        )

    db.session.commit()

    return jsonify({"message": "Payment rejected successfully"}), 200


@billing_bp.route("/payments/<int:payment_id>", methods=["GET"])
@jwt_required()
def get_payment(payment_id):
    payment = Payment.query.get_or_404(payment_id)

    if not is_admin():
        bill = payment.bill
        if not bill or bill.user_id != int(get_jwt_identity()):
            return jsonify({"message": "Not allowed"}), 403

    bill = payment.bill
    user = bill.user if bill else None

    return jsonify({
        **payment.to_dict(),
        "bill": bill.to_dict() if bill else None,
        "user_name": user.full_name if user else "-",
        "user_email": user.email if user else "-",
    }), 200


@billing_bp.route("/payments/<int:payment_id>", methods=["DELETE"])
@jwt_required()
def delete_payment(payment_id):
    if not is_admin():
        return jsonify({"message": "Only admin can delete payment entries"}), 403

    payment = Payment.query.get_or_404(payment_id)
    proof_filename = payment.proof_filename

    if payment.bill and payment.status != "Approved":
        payment.bill.status = "Unpaid"

    db.session.delete(payment)
    db.session.commit()

    if proof_filename:
        upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
        file_path = os.path.join(upload_folder, proof_filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception:
                pass

    return jsonify({"message": "Payment record deleted successfully"}), 200


@billing_bp.route("/uploads/<path:filename>", methods=["GET"])
def get_uploaded_file(filename):
    upload_folder = current_app.config.get("UPLOAD_FOLDER", "uploads")
    return send_from_directory(upload_folder, filename)