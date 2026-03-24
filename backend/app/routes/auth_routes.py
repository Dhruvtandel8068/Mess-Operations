from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash, check_password_hash

from app.models.user import User
from app.utils.db import db
auth_bp = Blueprint("auth_bp", __name__)


def build_token(user):
    return create_access_token(
        identity=str(user.id),
        additional_claims={"role": user.role, "email": user.email},
        expires_delta=timedelta(days=7),
    )
@auth_bp.post("/register")
def register():
    data = request.get_json() or {}
    full_name = (data.get("full_name") or "").strip()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""
    contact = (data.get("contact") or "").strip()
    room_no = (data.get("room_no") or "").strip()

    if not full_name or not email or not password:
        return jsonify({"message": "Full name, email and password are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"message": "Email already registered"}), 409

    user = User(
        full_name=full_name,
        email=email,
        password_hash=generate_password_hash(password),
        role="user",
        contact=contact or None,
        room_no=room_no or None,
        must_change_password=False,
    )
    db.session.add(user)
    db.session.commit()

    token = build_token(user)
    return jsonify({"message": "Registration successful", "token": token, "user": user.to_dict()}), 201

@auth_bp.post("/login")
def login():
    data = request.get_json() or {}
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"message": "Invalid email or password"}), 401

    token = build_token(user)
    return jsonify({"message": "Login successful", "token": token, "user": user.to_dict()})


@auth_bp.route("/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    try:
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)

        if not user:
            return jsonify({"message": "User not found"}), 404

        data = request.get_json() or {}
        old_password = (data.get("old_password") or "").strip()
        new_password = (data.get("new_password") or "").strip()
        confirm_password = (data.get("confirm_password") or "").strip()

        if not old_password or not new_password or not confirm_password:
            return jsonify({"message": "All password fields are required"}), 400

        if not check_password_hash(user.password_hash, old_password):
            return jsonify({"message": "Old password is incorrect"}), 400

        if new_password != confirm_password:
            return jsonify({"message": "New password and confirm password do not match"}), 400

        if len(new_password) < 6:
            return jsonify({"message": "New password must be at least 6 characters"}), 400

        user.password_hash = generate_password_hash(new_password)
        user.must_change_password = False

        db.session.commit()

        return jsonify({"message": "Password changed successfully"}), 200

    except Exception as e:
        db.session.rollback()
        print("CHANGE PASSWORD ERROR:", str(e))
        return jsonify({"message": f"Failed to change password: {str(e)}"}), 500
    return _inner()