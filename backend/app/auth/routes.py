import base64
import os
import random
import string
from datetime import datetime, timedelta
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import create_access_token, get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import or_

from app.extensions import db
from app.audit import log_audit
from app.models import FacialImage, User

auth_bp = Blueprint("auth", __name__)

# Lightweight in-process brute-force guard.
_LOGIN_ATTEMPTS = {}
_MAX_FAILED_ATTEMPTS = 5
_LOCKOUT_MINUTES = 10


def _normalize_role(role):
    if not role:
        return "student"
    lower = role.lower()
    return "admin" if lower == "administrator" else lower


def _generate_temp_password(length=12):
    alphabet = string.ascii_letters + string.digits
    return "".join(random.choice(alphabet) for _ in range(length))


def _attempt_key(login_id: str, ip: str) -> str:
    return f"{(login_id or '').lower()}|{ip or ''}"


def _ip_from_request() -> str:
    return (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()


def _is_locked_out(login_id: str, ip: str) -> tuple[bool, int]:
    key = _attempt_key(login_id, ip)
    entry = _LOGIN_ATTEMPTS.get(key)
    if not entry:
        return False, 0
    lockout_until = entry.get("lockout_until")
    if lockout_until and datetime.utcnow() < lockout_until:
        remaining = int((lockout_until - datetime.utcnow()).total_seconds())
        return True, max(1, remaining)
    if lockout_until and datetime.utcnow() >= lockout_until:
        _LOGIN_ATTEMPTS.pop(key, None)
    return False, 0


def _register_failed_attempt(login_id: str, ip: str) -> None:
    key = _attempt_key(login_id, ip)
    entry = _LOGIN_ATTEMPTS.get(key) or {"count": 0, "lockout_until": None, "last_attempt": None}
    entry["count"] += 1
    entry["last_attempt"] = datetime.utcnow()
    if entry["count"] >= _MAX_FAILED_ATTEMPTS:
        entry["lockout_until"] = datetime.utcnow() + timedelta(minutes=_LOCKOUT_MINUTES)
    _LOGIN_ATTEMPTS[key] = entry


def _clear_attempts(login_id: str, ip: str) -> None:
    _LOGIN_ATTEMPTS.pop(_attempt_key(login_id, ip), None)


@auth_bp.post("/register")
def register():
    if not current_app.config.get("ALLOW_PUBLIC_REGISTRATION", False):
        return jsonify({"error": {"message": "Public registration is disabled. Contact administrator."}}), 403

    data = request.get_json(silent=True) or {}
    full_name = (data.get("full_name") or data.get("name") or "").strip()
    reg_number = (data.get("reg_number") or data.get("registration_number") or "").strip()
    email = (data.get("email") or f"{reg_number.lower()}@student.udom.ac.tz").strip().lower()
    department = (data.get("department") or "").strip() or None
    password = data.get("password") or ""
    face_image = data.get("face_image_base64") or data.get("face_image")

    fields = []
    if not full_name:
        fields.append({"field": "full_name", "message": "Full name is required"})
    if not reg_number:
        fields.append({"field": "reg_number", "message": "Registration number is required"})
    if len(password) < 8:
        fields.append({"field": "password", "message": "Password must be at least 8 characters"})
    if fields:
        return jsonify({"error": "Validation error", "fields": fields}), 400

    if User.query.filter_by(reg_number=reg_number).first():
        return jsonify({"error": "Registration number already exists"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already exists"}), 409

    user = User(
        full_name=full_name,
        reg_number=reg_number,
        email=email,
        department=department,
        phone_number=(data.get("phone_number") or "").strip() or None,
        role=_normalize_role(data.get("role")),
        credential_source="self_register",
        must_change_password=False,
    )
    user.set_password(password)
    db.session.add(user)
    db.session.flush()

    if face_image:
        encoded = face_image.split(",", 1)[1] if "," in face_image else face_image
        try:
            raw = base64.b64decode(encoded)
            storage_dir = os.path.join("storage", "faces")
            os.makedirs(storage_dir, exist_ok=True)
            file_name = f"{user.user_id}_{uuid4().hex}.jpg"
            file_path = os.path.join(storage_dir, file_name)
            with open(file_path, "wb") as face_file:
                face_file.write(raw)
            db.session.add(FacialImage(user_id=user.user_id, file_path=file_path))
        except Exception:
            db.session.rollback()
            return jsonify({"error": "Validation error", "fields": [{"field": "face_image", "message": "Invalid face image"}]}), 400

    db.session.commit()
    token = create_access_token(identity=str(user.user_id), additional_claims={"role": user.role})
    return jsonify({"user_id": user.user_id, "message": "Registration successful", "token": token, "user": user.to_auth_user()}), 201


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    login_id = (data.get("login_id") or data.get("reg_number") or data.get("registration_number") or "").strip()
    password = data.get("password") or ""
    requested_role = _normalize_role(data.get("role")) if data.get("role") else None
    ip = _ip_from_request()

    locked, remaining_seconds = _is_locked_out(login_id, ip)
    if locked:
        return jsonify({"error": {"message": f"Too many failed attempts. Try again in {remaining_seconds} seconds"}}), 429

    user = User.query.filter(
        or_(User.reg_number == login_id, User.email == login_id.lower(), User.username == login_id)
    ).first()
    if not user or not user.verify_password(password) or not user.is_active or (requested_role and requested_role != user.role):
        _register_failed_attempt(login_id, ip)
        log_audit(
            action="auth.login_failed",
            target_user_id=user.user_id if user else None,
            metadata={"login_id": login_id, "requested_role": requested_role, "ip": ip},
        )
        db.session.commit()
        return jsonify({"error": "Invalid credentials"}), 401

    _clear_attempts(login_id, ip)
    token = create_access_token(identity=str(user.user_id), additional_claims={"role": user.role})
    log_audit(
        action="auth.login_succeeded",
        actor_user_id=user.user_id,
        target_user_id=user.user_id,
        metadata={"login_id": login_id, "role": user.role, "ip": ip},
    )
    db.session.commit()
    return jsonify({"token": token, "user": user.to_auth_user()}), 200


@auth_bp.post("/reset-password")
def reset_password():
    return jsonify({"message": "Reset link sent if email exists"}), 200


@auth_bp.post("/lookup")
def lookup():
    data = request.get_json(silent=True) or {}
    reg_number = (data.get("reg_number") or data.get("registration_number") or "").strip()
    if not reg_number:
        return jsonify({"error": {"message": "Registration number is required"}}), 400

    user = User.query.filter_by(reg_number=reg_number).first()
    if not user:
        # Keep account lookup behavior safe; frontend will show generic follow-up.
        return jsonify({"email": None, "phone": None}), 200

    return jsonify({"email": user.email, "phone": None}), 200


@auth_bp.put("/change-password")
@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    current_password = data.get("current_password") or ""
    new_password = data.get("new_password") or ""

    if not current_password or not new_password:
        return jsonify({"error": {"message": "Current and new password are required"}}), 400
    if len(new_password) < 8:
        return jsonify({"error": {"message": "New password must be at least 8 characters"}}), 400

    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    if not user.verify_password(current_password):
        return jsonify({"error": {"message": "Current password is incorrect"}}), 401

    user.set_password(new_password)
    user.must_change_password = False
    log_audit(action="auth.password_changed", actor_user_id=user.user_id, target_user_id=user.user_id)
    db.session.commit()
    return jsonify({"message": "Password updated successfully"}), 200


@auth_bp.post("/provision-credentials")
@jwt_required()
def provision_credentials():
    role = get_jwt().get("role")
    if role != "admin":
        return jsonify({"error": {"message": "Forbidden"}}), 403

    data = request.get_json(silent=True) or {}
    target_role = _normalize_role(data.get("role"))
    full_name = (data.get("full_name") or "").strip()
    reg_number = (data.get("reg_number") or data.get("registration_number") or "").strip()
    email = (data.get("email") or "").strip().lower()
    username = (data.get("username") or "").strip()

    if target_role not in {"student", "lecturer"}:
        return jsonify({"error": {"message": "Role must be student or lecturer"}}), 400
    if not full_name or not reg_number or not email:
        return jsonify({"error": {"message": "full_name, reg_number and email are required"}}), 400
    if target_role == "lecturer" and not username:
        return jsonify({"error": {"message": "username is required for lecturer credentials"}}), 400
    if User.query.filter_by(reg_number=reg_number).first():
        return jsonify({"error": {"message": "Registration number already exists"}}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": {"message": "Email already exists"}}), 409
    if username and User.query.filter_by(username=username).first():
        return jsonify({"error": {"message": "Username already exists"}}), 409

    temp_password = _generate_temp_password()
    actor_user_id = int(get_jwt_identity())
    user = User(
        full_name=full_name,
        reg_number=reg_number,
        email=email,
        department=(data.get("department") or "").strip() or None,
        phone_number=(data.get("phone_number") or "").strip() or None,
        role=target_role,
        username=username or None,
        credential_source="admin_provisioned",
        must_change_password=True,
    )
    user.set_password(temp_password)
    db.session.add(user)
    db.session.flush()
    log_audit(
        action="admin.user_provisioned",
        actor_user_id=actor_user_id,
        target_user_id=user.user_id,
        metadata={"role": user.role, "registration_number": user.reg_number, "username": user.username},
    )
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Credentials provisioned",
                "user": user.to_auth_user(),
                "login_id": user.username or user.reg_number,
                "temporary_password": temp_password,
                "delivery_channel": "admin_out_of_band",
            }
        ),
        201,
    )


@auth_bp.post("/provision-bulk")
@jwt_required()
def provision_bulk_credentials():
    role = get_jwt().get("role")
    if role != "admin":
        return jsonify({"error": {"message": "Forbidden"}}), 403

    actor_user_id = int(get_jwt_identity())
    data = request.get_json(silent=True) or {}
    rows = data.get("users") or []
    if not isinstance(rows, list) or not rows:
        return jsonify({"error": {"message": "users must be a non-empty array"}}), 400

    created = []
    errors = []
    seen_reg_numbers = set()
    seen_emails = set()
    seen_usernames = set()
    for idx, row in enumerate(rows):
        target_role = _normalize_role((row or {}).get("role"))
        full_name = ((row or {}).get("full_name") or "").strip()
        reg_number = ((row or {}).get("reg_number") or (row or {}).get("registration_number") or "").strip()
        email = ((row or {}).get("email") or "").strip().lower()
        username = ((row or {}).get("username") or "").strip()

        if target_role not in {"student", "lecturer"}:
            errors.append({"index": idx, "message": "Role must be student or lecturer"})
            continue
        if not full_name or not reg_number or not email:
            errors.append({"index": idx, "message": "full_name, reg_number and email are required"})
            continue
        if target_role == "lecturer" and not username:
            errors.append({"index": idx, "message": "username is required for lecturer"})
            continue
        if reg_number in seen_reg_numbers:
            errors.append({"index": idx, "message": f"Duplicate registration number in request: {reg_number}"})
            continue
        if email in seen_emails:
            errors.append({"index": idx, "message": f"Duplicate email in request: {email}"})
            continue
        if username and username in seen_usernames:
            errors.append({"index": idx, "message": f"Duplicate username in request: {username}"})
            continue
        if User.query.filter_by(reg_number=reg_number).first():
            errors.append({"index": idx, "message": f"Registration number already exists: {reg_number}"})
            continue
        if User.query.filter_by(email=email).first():
            errors.append({"index": idx, "message": f"Email already exists: {email}"})
            continue
        if username and User.query.filter_by(username=username).first():
            errors.append({"index": idx, "message": f"Username already exists: {username}"})
            continue
        seen_reg_numbers.add(reg_number)
        seen_emails.add(email)
        if username:
            seen_usernames.add(username)

        temp_password = _generate_temp_password()
        user = User(
            full_name=full_name,
            reg_number=reg_number,
            email=email,
            department=((row or {}).get("department") or "").strip() or None,
            phone_number=((row or {}).get("phone_number") or "").strip() or None,
            role=target_role,
            username=username or None,
            credential_source="admin_provisioned",
            must_change_password=True,
        )
        user.set_password(temp_password)
        db.session.add(user)
        db.session.flush()
        log_audit(
            action="admin.user_provisioned_bulk",
            actor_user_id=actor_user_id,
            target_user_id=user.user_id,
            metadata={"role": user.role, "registration_number": user.reg_number, "username": user.username},
        )
        created.append(
            {
                "user": user.to_auth_user(),
                "login_id": user.username or user.reg_number,
                "temporary_password": temp_password,
            }
        )

    db.session.commit()
    return jsonify({"created": created, "errors": errors, "created_count": len(created), "error_count": len(errors)}), 200


@auth_bp.get("/me")
@jwt_required()
def me():
    user = db.session.get(User, int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": user.to_auth_user(), "server_time": datetime.utcnow().isoformat()}), 200
