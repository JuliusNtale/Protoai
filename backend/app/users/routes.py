import random
import string
from datetime import timedelta, timezone
from zoneinfo import ZoneInfo
from zoneinfo import ZoneInfoNotFoundError

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.audit import log_audit
from app.extensions import db
from app.models import AuditLog, FacialImage, User

users_bp = Blueprint("users", __name__)

try:
    EAT_TZ = ZoneInfo("Africa/Nairobi")
except ZoneInfoNotFoundError:
    EAT_TZ = timezone(timedelta(hours=3), name="EAT")


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
    full_name = (data.get("full_name") or "").strip()
    reg_number = (data.get("registration_number") or data.get("reg_number") or "").strip()
    academic_year = (data.get("academic_year") or "").strip()
    year_enrolled_raw = data.get("year_enrolled")
    confirm_profile = bool(data.get("confirm_profile"))

    if email and "@" not in email:
        return jsonify({"error": {"message": "Invalid email format"}}), 400
    if full_name and len(full_name) < 3:
        return jsonify({"error": {"message": "Full name is too short"}}), 400

    if email and email != user.email and User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": "Email already exists"}}), 409
    if reg_number and reg_number != user.reg_number and User.query.filter_by(reg_number=reg_number).first():
        return jsonify({"error": {"message": "Registration number already exists"}}), 409

    year_enrolled = None
    if year_enrolled_raw not in (None, ""):
        try:
            year_enrolled = int(year_enrolled_raw)
        except (TypeError, ValueError):
            return jsonify({"error": {"message": "year_enrolled must be a valid year"}}), 400
        if year_enrolled < 1990 or year_enrolled > 2100:
            return jsonify({"error": {"message": "year_enrolled must be between 1990 and 2100"}}), 400

    phone_number = (data.get("phone_number") or "").strip()
    department = (data.get("department") or "").strip()
    is_student = user.role == "student"
    student_profile_locked = bool(
        (user.full_name or "").strip()
        and (user.reg_number or "").strip()
        and (user.department or "").strip()
        and (user.academic_year or "").strip()
        and (user.year_enrolled is not None)
    )

    if is_student and student_profile_locked:
        if full_name and full_name != (user.full_name or ""):
            return jsonify({"error": {"message": "Full name is locked. Contact admin for corrections."}}), 403
        if reg_number and reg_number != (user.reg_number or ""):
            return jsonify({"error": {"message": "Registration number is locked. Contact admin for corrections."}}), 403
        if department and department != (user.department or ""):
            return jsonify({"error": {"message": "Degree program is locked after onboarding."}}), 403
        if year_enrolled is not None and year_enrolled != user.year_enrolled:
            return jsonify({"error": {"message": "Year enrolled is locked after onboarding."}}), 403

    before_complete = bool(
        (user.full_name or "").strip()
        and (user.reg_number or "").strip()
        and (user.department or "").strip()
        and (user.academic_year or "").strip()
        and (user.year_enrolled is not None)
    )

    if email:
        user.email = email
    if full_name:
        user.full_name = full_name
    if reg_number:
        user.reg_number = reg_number
    user.phone_number = phone_number or None
    user.department = department or None
    user.academic_year = academic_year or None
    user.year_enrolled = year_enrolled

    after_complete = bool(
        (user.full_name or "").strip()
        and (user.reg_number or "").strip()
        and (user.department or "").strip()
        and (user.academic_year or "").strip()
        and (user.year_enrolled is not None)
    )
    if is_student and confirm_profile:
        if not after_complete:
            return jsonify({"error": {"message": "Complete all required onboarding fields before confirming profile."}}), 400
        has_image = (
            FacialImage.query.filter_by(user_id=user.user_id)
            .order_by(FacialImage.captured_at.desc())
            .first()
            is not None
        )
        if not has_image:
            return jsonify({"error": {"message": "Upload baseline image before confirming profile."}}), 400
        user.student_profile_confirmed = True

    log_audit(
        action="user.profile_updated",
        actor_user_id=user.user_id,
        target_user_id=user.user_id,
        metadata={
            "email_changed": bool(email),
            "phone_changed": True,
            "department_changed": True,
            "name_changed": bool(full_name),
            "registration_number_changed": bool(reg_number),
            "academic_year_changed": True,
            "year_enrolled_changed": True,
        },
    )
    if is_student and not before_complete and after_complete:
        log_audit(
            action="student.onboarding_submitted",
            actor_user_id=user.user_id,
            target_user_id=user.user_id,
            metadata={
                "registration_number": user.reg_number,
                "degree_program": user.department,
                "academic_year": user.academic_year,
                "year_enrolled": user.year_enrolled,
            },
        )
    if is_student and confirm_profile and user.student_profile_confirmed:
        log_audit(
            action="student.profile_confirmed",
            actor_user_id=user.user_id,
            target_user_id=user.user_id,
            metadata={"confirmed": True},
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
                    "created_at_eat": (
                        audit.created_at.replace(tzinfo=timezone.utc).astimezone(EAT_TZ).isoformat()
                        if audit.created_at
                        else None
                    ),
                }
                for audit, actor in rows
            ],
            "limit": limit,
            "offset": offset,
            "count": len(rows),
        }
    ), 200
