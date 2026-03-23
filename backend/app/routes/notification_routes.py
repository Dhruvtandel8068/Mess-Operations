from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.models.notification import Notification
from app.utils.db import db

notification_bp = Blueprint("notification_bp", __name__)


def is_admin():
    return get_jwt().get("role") == "admin"


@notification_bp.route("/", methods=["GET"])
@jwt_required()
def list_notifications():
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    rows = Notification.query.filter(
        (Notification.user_id.is_(None) & ((Notification.role_target == role) | Notification.role_target.is_(None))) |
        (Notification.user_id == user_id)
    ).order_by(Notification.created_at.desc()).all()
    return jsonify([row.to_dict() for row in rows])


@notification_bp.route("/", methods=["POST"])
@jwt_required()
def create_notification():
    if not is_admin():
        return jsonify({"message": "Only admin can create notifications"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    role_target = (data.get("role_target") or "user").strip()

    if not title or not message:
        return jsonify({"message": "Title and message are required"}), 400

    row = Notification(title=title, message=message, role_target=role_target)
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Notification created", "notification": row.to_dict()}), 201