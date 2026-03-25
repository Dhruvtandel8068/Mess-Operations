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
        (Notification.user_id.is_(None) & ((Notification.role_target == role) | Notification.role_target.is_(None)))
        | (Notification.user_id == user_id)
    ).order_by(Notification.created_at.desc()).all()

    return jsonify([row.to_dict() for row in rows]), 200


@notification_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())

    count = Notification.query.filter(
        (
            (Notification.user_id.is_(None) & ((Notification.role_target == role) | Notification.role_target.is_(None)))
            | (Notification.user_id == user_id)
        ),
        Notification.is_read.is_(False)
    ).count()

    return jsonify({"unread_count": count}), 200


@notification_bp.route("/", methods=["POST"])
@jwt_required()
def create_notification():
    if not is_admin():
        return jsonify({"message": "Only admin can create notifications"}), 403

    data = request.get_json() or {}
    title = (data.get("title") or "").strip()
    message = (data.get("message") or "").strip()
    role_target = (data.get("role_target") or "user").strip()
    notification_type = (data.get("notification_type") or "general").strip()
    action_url = (data.get("action_url") or "").strip()
    user_id = data.get("user_id")

    if not title or not message:
        return jsonify({"message": "Title and message are required"}), 400

    row = Notification(
        title=title,
        message=message,
        role_target=role_target if not user_id else None,
        user_id=int(user_id) if user_id else None,
        notification_type=notification_type,
        action_url=action_url or None,
    )
    db.session.add(row)
    db.session.commit()

    return jsonify({"message": "Notification created", "notification": row.to_dict()}), 201


@notification_bp.route("/<int:notification_id>/read", methods=["PATCH"])
@jwt_required()
def mark_as_read(notification_id):
    row = Notification.query.get_or_404(notification_id)
    user_id = int(get_jwt_identity())

    if row.user_id is not None and row.user_id != user_id and not is_admin():
        return jsonify({"message": "Not allowed"}), 403

    row.is_read = True
    db.session.commit()
    return jsonify({"message": "Notification marked as read", "notification": row.to_dict()}), 200


@notification_bp.route("/read-all", methods=["PATCH"])
@jwt_required()
def mark_all_as_read():
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())

    rows = Notification.query.filter(
        (
            (Notification.user_id.is_(None) & ((Notification.role_target == role) | Notification.role_target.is_(None)))
            | (Notification.user_id == user_id)
        ),
        Notification.is_read.is_(False)
    ).all()

    for row in rows:
        row.is_read = True

    db.session.commit()
    return jsonify({"message": "All notifications marked as read"}), 200


@notification_bp.route("/<int:notification_id>", methods=["DELETE"])
@jwt_required()
def delete_notification(notification_id):
    row = Notification.query.get_or_404(notification_id)
    user_id = int(get_jwt_identity())

    if row.user_id is not None and row.user_id != user_id and not is_admin():
        return jsonify({"message": "Not allowed"}), 403

    db.session.delete(row)
    db.session.commit()
    return jsonify({"message": "Notification deleted successfully"}), 200