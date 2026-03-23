from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt

from app.models.expense import Expense, ExpenseCategory
from app.utils.db import db

expense_bp = Blueprint("expense_bp", __name__)


def is_admin():
    claims = get_jwt()
    return claims.get("role") == "admin"


@expense_bp.route("/categories", methods=["GET"])
@jwt_required()
def get_categories():
    categories = ExpenseCategory.query.order_by(ExpenseCategory.name.asc()).all()
    return jsonify([{"id": c.id, "name": c.name} for c in categories]), 200


@expense_bp.route("/", methods=["GET"])
@jwt_required()
def get_expenses():
    month = request.args.get("month")
    year = request.args.get("year")

    query = Expense.query
    if month and year:
        query = query.filter(
            db.extract("month", Expense.expense_date) == int(month),
            db.extract("year", Expense.expense_date) == int(year)
        )

    expenses = query.order_by(Expense.expense_date.desc()).all()

    result = []
    for e in expenses:
        result.append({
            "id": e.id,
            "title": e.title,
            "category_id": e.category_id,
            "category_name": e.category.name if e.category else "-",
            "amount": float(e.amount),
            "expense_date": str(e.expense_date),
        })
    return jsonify(result), 200


@expense_bp.route("/", methods=["POST"])
@jwt_required()
def create_expense():
    if not is_admin():
        return jsonify({"message": "Unauthorized"}), 403

    try:
        data = request.get_json()

        expense = Expense(
            title=data.get("title"),
            category_id=data.get("category_id"),
            amount=data.get("amount"),
            expense_date=datetime.strptime(data.get("expense_date"), "%Y-%m-%d").date(),
        )
        db.session.add(expense)
        db.session.commit()

        return jsonify({"message": "Expense added successfully"}), 201

    except Exception as e:
        print("EXPENSE CREATE ERROR:", e)
        return jsonify({"message": str(e)}), 500