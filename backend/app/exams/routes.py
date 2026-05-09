from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Exam

exams_bp = Blueprint("exams", __name__)


@exams_bp.get("")
@jwt_required()
def list_exams():
    status_filter = request.args.get("status")
    query = Exam.query
    if status_filter:
        query = query.filter_by(status=status_filter)

    exams = query.order_by(Exam.created_at.desc()).all()
    return jsonify(
        {
            "exams": [
                {
                    "id": exam.exam_id,
                    "exam_id": exam.exam_id,
                    "title": exam.title,
                    "course_code": exam.course_code,
                    "duration_min": exam.duration_min,
                    "scheduled_at": exam.scheduled_at.isoformat() if exam.scheduled_at else None,
                    "status": exam.status,
                }
                for exam in exams
            ]
        }
    ), 200


@exams_bp.post("")
@jwt_required()
def create_exam():
    role = get_jwt().get("role")
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    course_code = (data.get("course_code") or "").strip()
    duration_min = data.get("duration_min")
    scheduled_raw = data.get("scheduled_at")

    if not title or not course_code or not duration_min:
        return jsonify({"error": {"message": "Missing required fields"}}), 400

    scheduled_at = None
    if scheduled_raw:
        try:
            scheduled_at = datetime.fromisoformat(scheduled_raw.replace("Z", "+00:00"))
        except ValueError:
            return jsonify({"error": {"message": "Invalid scheduled_at format"}}), 400

    exam = Exam(
        title=title,
        course_code=course_code,
        lecturer_id=int(get_jwt_identity()),
        duration_min=int(duration_min),
        scheduled_at=scheduled_at,
        status="draft",
    )
    db.session.add(exam)
    db.session.commit()

    return jsonify({"exam_id": exam.exam_id, "id": exam.exam_id}), 201
