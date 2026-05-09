from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import User

users_bp = Blueprint("users", __name__)


@users_bp.put("/profile")
@jwt_required()
def update_profile():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if email and "@" not in email:
        return jsonify({"error": {"message": "Invalid email format"}}), 400

    if email and email != user.email and User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": "Email already exists"}}), 409

    if email:
        user.email = email

    db.session.commit()

    response_user = user.to_auth_user()
    response_user["phone_number"] = None
    return jsonify({"message": "Profile updated successfully", "user": response_user}), 200
