from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt, get_jwt_identity

from app.models.complaint import Complaint
from app.utils.db import db

complaint_bp = Blueprint("complaint_bp", __name__)


def is_admin():
    return get_jwt().get("role") == "admin"


@complaint_bp.route("/", methods=["GET"])
@jwt_required()
def list_complaints():
    if is_admin():
        rows = Complaint.query.order_by(Complaint.created_at.desc()).all()
    else:
        rows = Complaint.query.filter_by(user_id=int(get_jwt_identity())).order_by(Complaint.created_at.desc()).all()
    return jsonify([row.to_dict() for row in rows])


@complaint_bp.route("/", methods=["POST"])
@jwt_required()
def create_complaint():
    data = request.get_json() or {}
    complaint_type = (data.get("complaint_type") or "General").strip()
    message = (data.get("message") or "").strip()

    if not message:
        return jsonify({"message": "Complaint message is required"}), 400

    row = Complaint(
        user_id=int(get_jwt_identity()),
        complaint_type=complaint_type,
        message=message,
    )
    db.session.add(row)
    db.session.commit()
    return jsonify({"message": "Complaint submitted successfully", "complaint": row.to_dict()}), 201


@complaint_bp.route("/<int:complaint_id>/status", methods=["PUT"])
@jwt_required()
def update_status(complaint_id):
    if not is_admin():
        return jsonify({"message": "Only admin can update complaint status"}), 403

    row = Complaint.query.get_or_404(complaint_id)
    data = request.get_json() or {}
    row.status = (data.get("status") or row.status).strip()
    db.session.commit()
    return jsonify({"message": "Complaint status updated", "complaint": row.to_dict()})