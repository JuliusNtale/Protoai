from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Exam, ExamSession

sessions_bp = Blueprint("sessions", __name__)


@sessions_bp.post("/start")
@jwt_required()
def start_session():
    data = request.get_json(silent=True) or {}
    exam_id = data.get("exam_id")
    if not exam_id:
        return jsonify({"error": {"message": "exam_id is required"}}), 400

    exam = Exam.query.get(int(exam_id))
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404

    student_id = int(get_jwt_identity())
    existing = ExamSession.query.filter_by(student_id=student_id, exam_id=exam.exam_id).first()
    if existing:
        return jsonify({"error": "Session already exists for this exam", "session_id": existing.session_id}), 409

    session = ExamSession(
        student_id=student_id,
        exam_id=exam.exam_id,
        started_at=datetime.utcnow(),
        session_status="active",
        identity_verified=False,
        warning_count=0,
    )
    db.session.add(session)
    db.session.commit()

    return (
        jsonify(
            {
                "session_id": session.session_id,
                "exam": {
                    "exam_id": exam.exam_id,
                    "title": exam.title,
                    "duration_min": exam.duration_min,
                    "questions": [],
                },
            }
        ),
        201,
    )
