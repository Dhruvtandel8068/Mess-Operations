from datetime import datetime, timedelta
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash

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


@auth_bp.route("/change-password", methods=["POST"])
@jwt_required()
def change_password():
    data = request.get_json() or {}

    current_password = data.get("current_password")
    new_password = data.get("new_password")

    if not current_password or not new_password:
        return jsonify({"message": "Current password and new password are required"}), 400

    user_id = get_jwt_identity()
    user = User.query.get(user_id)

    if not user:
        return jsonify({"message": "User not found"}), 404

    if not check_password_hash(user.password, current_password):
        return jsonify({"message": "Current password is incorrect"}), 400

    user.password = generate_password_hash(new_password)
    db.session.commit()

    return jsonify({"message": "Password changed successfully"}), 200

    return _inner()