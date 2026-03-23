from datetime import date
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required
from sqlalchemy import extract

from app.models.user import User
from app.models.attendance import Attendance
from app.models.expense import Expense
from app.models.complaint import Complaint
from app.models.bill import Bill
from app.models.inventory import Inventory
from app.utils.db import db

report_bp = Blueprint("report_bp", __name__)


@report_bp.route("/summary", methods=["GET"])
@jwt_required()
def get_summary():
    today = date.today()
    month = int(request.args.get("month", today.month))
    year = int(request.args.get("year", today.year))

    total_users = User.query.count()

    total_expense = db.session.query(db.func.sum(Expense.amount)).filter(
        extract("month", Expense.expense_date) == month,
        extract("year", Expense.expense_date) == year,
    ).scalar() or 0

    attendance_rows = Attendance.query.filter(
        extract("month", Attendance.date) == month,
        extract("year", Attendance.date) == year,
    ).all()

    total_meals = 0
    meals_today = 0
    for r in attendance_rows:
        count = int(bool(r.breakfast)) + int(bool(r.lunch)) + int(bool(r.dinner))
        total_meals += count
        if r.date == today:
            meals_today += count

    pending_complaints = Complaint.query.filter(
        Complaint.status.in_(["Open", "In Progress", "Pending"])
    ).count()

    unpaid_bills = Bill.query.filter(Bill.status == "Unpaid").count()

    low_stock_items = Inventory.query.filter(Inventory.qty <= Inventory.low_limit).count()

    recent_expenses = Expense.query.order_by(Expense.expense_date.desc()).limit(5).all()
    recent_attendance = Attendance.query.order_by(Attendance.date.desc()).limit(5).all()
    recent_complaints = Complaint.query.order_by(Complaint.created_at.desc()).limit(5).all()

    return jsonify({
        "total_users": total_users,
        "total_expense": float(total_expense),
        "total_attendance": total_meals,
        "meals_today": meals_today,
        "pending_complaints": pending_complaints,
        "unpaid_bills": unpaid_bills,
        "low_stock_items": low_stock_items,
        "recent_expenses": [
            {
                "title": e.title,
                "amount": float(e.amount),
                "expense_date": str(e.expense_date)
            } for e in recent_expenses
        ],
        "recent_attendance": [
            {
                "user_id": a.user_id,
                "date": str(a.date),
                "breakfast": a.breakfast,
                "lunch": a.lunch,
                "dinner": a.dinner
            } for a in recent_attendance
        ],
        "recent_complaints": [
            {
                "id": c.id,
                "type": c.complaint_type,
                "message": c.message,
                "status": c.status,
                "created_at": str(c.created_at) if c.created_at else None
            } for c in recent_complaints
        ]
    }), 200