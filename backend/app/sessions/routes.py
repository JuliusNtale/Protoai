from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import BehavioralLog, Exam, ExamSession, Question, SessionAnswer

sessions_bp = Blueprint("sessions", __name__)
VALID_EVENTS = {"gaze_away", "head_turned", "face_absent", "tab_switch", "multiple_faces"}


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


@sessions_bp.post("/verify")
def verify_session_identity():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    confidence_score = float(data.get("confidence_score") or 0)

    if not session_id:
        return jsonify({"error": {"message": "session_id is required"}}), 400

    session = ExamSession.query.get(int(session_id))
    if not session:
        return jsonify({"error": {"message": "Session not found"}}), 404

    if confidence_score < 0.6:
        return jsonify({"identity_verified": False, "message": "Score below threshold"}), 422

    session.identity_verified = True
    db.session.commit()
    return jsonify({"identity_verified": True}), 200


@sessions_bp.post("/log")
@jwt_required()
def log_event():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    event_type = data.get("event_type")
    event_data = data.get("event_data") or {}

    if not session_id or event_type not in VALID_EVENTS:
        return jsonify({"error": {"message": "Invalid session_id or event_type"}}), 400

    session = ExamSession.query.get(int(session_id))
    if not session:
        return jsonify({"error": {"message": "Session not found"}}), 404

    if session.student_id != int(get_jwt_identity()):
        return jsonify({"error": {"message": "Forbidden"}}), 403

    db.session.add(
        BehavioralLog(
            session_id=session.session_id,
            event_type=event_type,
            event_data=event_data if isinstance(event_data, dict) else {},
        )
    )
    session.warning_count = (session.warning_count or 0) + 1

    response = {"warning_count": session.warning_count}
    if session.warning_count >= 3:
        session.session_status = "locked"
        if not session.submitted_at:
            session.submitted_at = datetime.utcnow()
        response["auto_submitted"] = True

    db.session.commit()
    return jsonify(response), 200


@sessions_bp.post("/<int:session_id>/submit")
@jwt_required()
def submit_session(session_id):
    session = ExamSession.query.get(session_id)
    if not session:
        return jsonify({"error": {"message": "Session not found"}}), 404
    if session.student_id != int(get_jwt_identity()):
        return jsonify({"error": {"message": "Forbidden"}}), 403

    data = request.get_json(silent=True) or {}
    raw_answers = data.get("answers") or {}

    # Frontend currently sends a question-number -> option-index map;
    # contract also allows list payloads, so support both formats.
    answer_map = {}
    if isinstance(raw_answers, list):
        for entry in raw_answers:
            qid = entry.get("question_id")
            selected = entry.get("selected_answer")
            if qid is not None and selected is not None:
                answer_map[str(qid)] = str(selected)
    elif isinstance(raw_answers, dict):
        answer_map = {str(k): str(v) for k, v in raw_answers.items()}

    exam_questions = Question.query.filter_by(exam_id=session.exam_id).all()
    by_qid = {str(question.question_id): question for question in exam_questions}

    SessionAnswer.query.filter_by(session_id=session.session_id).delete()

    score = 0.0
    for key, selected in answer_map.items():
        question = by_qid.get(key)
        if not question:
            continue
        is_correct = str(question.correct_answer).upper() == str(selected).upper()
        db.session.add(
            SessionAnswer(
                session_id=session.session_id,
                question_id=question.question_id,
                selected_answer=str(selected),
                is_correct=is_correct,
            )
        )
        if is_correct:
            score += float(question.marks or 1)

    session.score = score
    session.session_status = "completed" if session.session_status != "locked" else "locked"
    session.submitted_at = datetime.utcnow()
    db.session.commit()

    return jsonify({"score": float(score), "session_id": session.session_id}), 200


@sessions_bp.get("/<int:session_id>/answers")
@jwt_required()
def get_session_answers(session_id):
    session = ExamSession.query.get(session_id)
    if not session:
        return jsonify({"error": {"message": "Session not found"}}), 404
    if session.student_id != int(get_jwt_identity()):
        return jsonify({"error": {"message": "Forbidden"}}), 403

    stored = SessionAnswer.query.filter_by(session_id=session.session_id).all()
    return (
        jsonify(
            {
                "session_id": session.session_id,
                "answers": [
                    {
                        "question_id": row.question_id,
                        "selected_answer": row.selected_answer,
                        "is_correct": row.is_correct,
                        "answered_at": row.answered_at.isoformat() if row.answered_at else None,
                    }
                    for row in stored
                ],
            }
        ),
        200,
    )


@sessions_bp.get("")
@jwt_required()
def list_sessions():
    role = get_jwt().get("role")
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    sessions = (
        db.session.query(ExamSession, Exam)
        .join(Exam, Exam.exam_id == ExamSession.exam_id)
        .order_by(ExamSession.session_id.desc())
        .all()
    )

    payload = []
    for session, exam in sessions:
        if session.warning_count >= 3:
            risk_level = "high"
        elif session.warning_count > 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        payload.append(
            {
                "session_id": session.session_id,
                "student_name": f"Student #{session.student_id}",
                "exam_title": exam.title,
                "warning_count": session.warning_count,
                "risk_level": risk_level,
            }
        )

    return jsonify({"sessions": payload}), 200
