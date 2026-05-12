import base64
import os
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.audit import log_audit
from app.extensions import db
from app.models import FacialImage, User

images_bp = Blueprint("images", __name__)


@images_bp.get("/<int:user_id>")
@jwt_required()
def get_user_image(user_id):
    role = get_jwt().get("role")
    if role != "admin":
        return jsonify({"error": "Forbidden"}), 403

    image = FacialImage.query.filter_by(user_id=user_id).order_by(FacialImage.captured_at.desc()).first()
    if not image:
        return jsonify({"error": {"message": "Image not found"}}), 404
    if not os.path.isfile(image.file_path):
        return jsonify({"error": {"message": "Stored image file is missing"}}), 404

    return send_file(image.file_path, mimetype="image/jpeg")


@images_bp.post("/<int:user_id>")
@jwt_required()
def upload_user_image(user_id):
    role = get_jwt().get("role")
    if role != "admin":
        return jsonify({"error": {"message": "Forbidden"}}), 403

    user = db.session.get(User, user_id)
    if not user:
        return jsonify({"error": {"message": "User not found"}}), 404
    if user.role != "student":
        return jsonify({"error": {"message": "Baseline image is only required for students"}}), 400

    upload = request.files.get("image")
    if not upload:
        return jsonify({"error": {"message": "Missing image file in form-data field `image`"}}), 400

    content_type = (upload.content_type or "").lower()
    if content_type not in {"image/jpeg", "image/jpg", "image/png"}:
        return jsonify({"error": {"message": "Only JPG or PNG images are allowed"}}), 400

    raw = upload.read()
    if not raw:
        return jsonify({"error": {"message": "Uploaded image is empty"}}), 400
    if len(raw) > 5 * 1024 * 1024:
        return jsonify({"error": {"message": "Image must be 5MB or less"}}), 400

    storage_dir = os.path.join("storage", "faces")
    os.makedirs(storage_dir, exist_ok=True)
    ext = ".png" if content_type == "image/png" else ".jpg"
    file_name = f"{user.user_id}_{uuid4().hex}{ext}"
    file_path = os.path.join(storage_dir, file_name)
    with open(file_path, "wb") as face_file:
        face_file.write(raw)

    image = FacialImage(user_id=user.user_id, file_path=file_path, captured_at=datetime.utcnow())
    db.session.add(image)
    db.session.flush()
    log_audit(
        action="admin.student_baseline_uploaded",
        actor_user_id=int(get_jwt_identity()),
        target_user_id=user.user_id,
        metadata={"image_id": image.image_id, "content_type": content_type},
    )
    db.session.commit()

    return (
        jsonify(
            {
                "message": "Baseline image uploaded",
                "image": {
                    "image_id": image.image_id,
                    "user_id": image.user_id,
                    "captured_at": image.captured_at.isoformat() if image.captured_at else None,
                },
            }
        ),
        201,
    )


@images_bp.get("/internal/<int:user_id>/baseline")
def get_user_image_internal(user_id):
    expected_token = os.getenv("AI_SERVICE_TOKEN", "").strip()
    header_token = (request.headers.get("X-Internal-Token") or "").strip()

    if not expected_token or header_token != expected_token:
        return jsonify({"error": {"message": "Unauthorized internal request"}}), 401

    image = FacialImage.query.filter_by(user_id=user_id).order_by(FacialImage.captured_at.desc()).first()
    if not image:
        return jsonify({"error": {"message": "Baseline facial image not found"}}), 404
    if not os.path.isfile(image.file_path):
        return jsonify({"error": {"message": "Stored image file is missing"}}), 404

    with open(image.file_path, "rb") as file:
        encoded = base64.b64encode(file.read()).decode("ascii")

    return jsonify(
        {
            "user_id": user_id,
            "image_base64": encoded,
            "captured_at": image.captured_at.isoformat() if image.captured_at else None,
            "source": "facial_images",
        }
    ), 200
