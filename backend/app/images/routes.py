import os

from flask import Blueprint, jsonify, send_file
from flask_jwt_extended import get_jwt, jwt_required

from app.models import FacialImage

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
