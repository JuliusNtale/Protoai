import random
import string

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.audit import log_audit
from app.extensions import db
from app.models import AuditLog, User

users_bp = Blueprint("users", __name__)


def _is_admin() -> bool:
    return (get_jwt() or {}).get("role") == "admin"


def _generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def _password_change_required(user_id: int) -> bool:
    user = db.session.get(User, user_id)
    return bool(user and user.must_change_password)


@users_bp.put("/profile")
@jwt_required()
def update_profile():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404

    data = request.get_json(silent=True) or {}
    email = (data.get("email") or "").strip().lower()

    if email and "@" not in email:
        return jsonify({"error": {"message": "Invalid email format"}}), 400

    if email and email != user.email and User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": "Email already exists"}}), 409

    phone_number = (data.get("phone_number") or "").strip()

    if email:
        user.email = email
    user.phone_number = phone_number or None

    log_audit(
        action="user.profile_updated",
        actor_user_id=user.user_id,
        target_user_id=user.user_id,
        metadata={"email_changed": bool(email), "phone_changed": True},
    )
    db.session.commit()

    response_user = user.to_auth_user()
    return jsonify({"message": "Profile updated successfully", "user": response_user}), 200


@users_bp.get("")
@jwt_required()
def list_users():
    if not _is_admin():
        return jsonify({"error": {"message": "Forbidden"}}), 403
    if _password_change_required(int(get_jwt_identity())):
        return jsonify({"error": {"message": "Password change required before admin actions"}}), 403

    role = (request.args.get("role") or "").strip().lower()
    query = (request.args.get("query") or "").strip().lower()
    active = (request.args.get("active") or "").strip().lower()

    users_query = User.query.order_by(User.created_at.desc())
    if role in {"student", "lecturer", "admin"}:
        users_query = users_query.filter(User.role == role)
    if active in {"true", "false"}:
        users_query = users_query.filter(User.is_active.is_(active == "true"))
    if query:
        like = f"%{query}%"
        users_query = users_query.filter(
            (User.full_name.ilike(like))
            | (User.email.ilike(like))
            | (User.reg_number.ilike(like))
            | (User.username.ilike(like))
        )

    users = users_query.limit(500).all()
    return jsonify({"users": [u.to_auth_user() | {"is_active": u.is_active} for u in users]}), 200


@users_bp.patch("/<int:user_id>/status")
@jwt_required()
def update_user_status(user_id: int):
    if not _is_admin():
        return jsonify({"error": {"message": "Forbidden"}}), 403
    actor_user_id = int(get_jwt_identity())
    if _password_change_required(actor_user_id):
        return jsonify({"error": {"message": "Password change required before admin actions"}}), 403

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    if user.role == "admin":
        return jsonify({"error": {"message": "Admin account status cannot be modified here"}}), 400

    data = request.get_json(silent=True) or {}
    is_active = data.get("is_active")
    if not isinstance(is_active, bool):
        return jsonify({"error": {"message": "is_active must be boolean"}}), 400

    user.is_active = is_active
    log_audit(
        action="admin.user_status_updated",
        actor_user_id=actor_user_id,
        target_user_id=user.user_id,
        metadata={"is_active": user.is_active},
    )
    db.session.commit()
    return jsonify({"message": "User status updated", "user": user.to_auth_user() | {"is_active": user.is_active}}), 200


@users_bp.post("/<int:user_id>/reset-credentials")
@jwt_required()
def reset_credentials(user_id: int):
    if not _is_admin():
        return jsonify({"error": {"message": "Forbidden"}}), 403
    actor_user_id = int(get_jwt_identity())
    if _password_change_required(actor_user_id):
        return jsonify({"error": {"message": "Password change required before admin actions"}}), 403

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    if user.role == "admin":
        return jsonify({"error": {"message": "Admin credentials cannot be reset here"}}), 400

    temp_password = _generate_temp_password()
    user.set_password(temp_password)
    user.must_change_password = True
    log_audit(
        action="admin.user_credentials_reset",
        actor_user_id=actor_user_id,
        target_user_id=user.user_id,
        metadata={"login_id": user.username or user.reg_number},
    )
    db.session.commit()

    return jsonify(
        {
            "message": "Temporary credentials generated",
            "user": user.to_auth_user() | {"is_active": user.is_active},
            "login_id": user.username or user.reg_number,
            "temporary_password": temp_password,
        }
    ), 200


@users_bp.get("/audit-logs")
@jwt_required()
def list_audit_logs():
    if not _is_admin():
        return jsonify({"error": {"message": "Forbidden"}}), 403
    if _password_change_required(int(get_jwt_identity())):
        return jsonify({"error": {"message": "Password change required before admin actions"}}), 403

    action_filter = (request.args.get("action") or "").strip().lower()
    query_text = (request.args.get("query") or "").strip().lower()
    try:
        limit = int(request.args.get("limit") or 100)
        offset = int(request.args.get("offset") or 0)
    except ValueError:
        return jsonify({"error": {"message": "limit and offset must be integers"}}), 400
    limit = max(1, min(limit, 500))
    offset = max(0, offset)

    query = (
        db.session.query(AuditLog, User)
        .outerjoin(User, User.user_id == AuditLog.actor_user_id)
        .order_by(AuditLog.created_at.desc())
    )
    if action_filter:
        query = query.filter(AuditLog.action.ilike(f"%{action_filter}%"))
    if query_text:
        query = query.filter(
            (AuditLog.action.ilike(f"%{query_text}%"))
            | (User.full_name.ilike(f"%{query_text}%"))
            | (User.email.ilike(f"%{query_text}%"))
        )

    rows = query.offset(offset).limit(limit).all()
    return jsonify(
        {
            "audit_logs": [
                {
                    "audit_id": audit.audit_id,
                    "action": audit.action,
                    "actor_user_id": audit.actor_user_id,
                    "actor_name": actor.full_name if actor else None,
                    "target_user_id": audit.target_user_id,
                    "ip_address": audit.ip_address,
                    "user_agent": audit.user_agent,
                    "metadata": audit.details or {},
                    "created_at": audit.created_at.isoformat() if audit.created_at else None,
                }
                for audit, actor in rows
            ],
            "limit": limit,
            "offset": offset,
            "count": len(rows),
        }
    ), 200
