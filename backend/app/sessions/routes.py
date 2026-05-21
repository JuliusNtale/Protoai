from datetime import datetime, timezone
import os

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.audit import log_audit
from app.extensions import db
from app.models import BehavioralLog, Exam, ExamSession, Question, SessionAnswer, User
from app.models import FacialImage

sessions_bp = Blueprint("sessions", __name__)
VALID_EVENTS = {"gaze_away", "head_turned", "face_absent", "tab_switch", "multiple_faces"}


def _password_change_required(user_id: int) -> bool:
    user = db.session.get(User, user_id)
    return bool(user and user.must_change_password)


def _student_profile_ready_for_verification(user: User) -> tuple[bool, str]:
    if not user:
        return False, "User not found"
    if not (user.full_name or "").strip():
        return False, "Complete your profile: full name is required."
    if not (user.reg_number or "").strip():
        return False, "Complete your profile: registration number is required."
    if not (user.email or "").strip():
        return False, "Complete your profile: email is required."
    if not (user.phone_number or "").strip():
        return False, "Complete your profile: phone number is required."
    if not (user.department or "").strip():
        return False, "Complete your profile: course/department is required."
    has_image = (
        FacialImage.query.filter_by(user_id=user.user_id)
        .order_by(FacialImage.captured_at.desc())
        .first()
        is not None
    )
    if not has_image:
        return False, "Upload your profile face image before starting an exam."
    return True, ""


@sessions_bp.post("/start")
@jwt_required()
def start_session():
    data = request.get_json(silent=True) or {}
    exam_id = data.get("exam_id")
    if not exam_id:
        return jsonify({"error": {"message": "exam_id is required"}}), 400

    exam = db.session.get(Exam, int(exam_id))
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if (exam.status or "").lower() not in {"scheduled", "live", "active"}:
        return jsonify({"error": {"message": "Exam is not open for session start"}}), 409
    if (exam.status or "").lower() == "scheduled" and exam.scheduled_at:
        now_utc = datetime.now(timezone.utc)
        scheduled_at = exam.scheduled_at
        if scheduled_at.tzinfo is None:
            scheduled_at = scheduled_at.replace(tzinfo=timezone.utc)
        if now_utc < scheduled_at:
            return jsonify({"error": {"message": "Exam has not started yet"}}), 409

    student_id = int(get_jwt_identity())
    student = db.session.get(User, student_id)
    ready, message = _student_profile_ready_for_verification(student)
    if not ready:
        return jsonify({"error": {"message": message}}), 409
    if _password_change_required(student_id):
        return jsonify({"error": {"message": "Password change required before exam start"}}), 403
    existing = ExamSession.query.filter_by(student_id=student_id, exam_id=exam.exam_id).first()
    if existing:
        if existing.session_status in {"active", "pending"} and not existing.submitted_at:
            existing.submitted_at = datetime.utcnow()
            existing.session_status = "completed"
            db.session.commit()
            return (
                jsonify(
                    {
                        "error": {
                            "message": "Existing in-progress session was auto-submitted and cannot be resumed."
                        },
                        "session_id": existing.session_id,
                        "auto_submitted": True,
                    }
                ),
                409,
            )
        return jsonify({"error": {"message": "Exam session already exists and cannot be resumed."}, "session_id": existing.session_id}), 409

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
    expected_token = os.getenv("AI_SERVICE_TOKEN", "").strip()
    provided_token = (request.headers.get("X-Internal-Token") or "").strip()
    if not expected_token or provided_token != expected_token:
        return jsonify({"error": {"message": "Unauthorized internal request"}}), 401

    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    match_value = data.get("match")
    confidence_value = data.get("confidence_score")
    method = str(data.get("verification_method") or "ai-face-embedding")[:50]
    model_version = data.get("model_version")

    if session_id is None or match_value is None or confidence_value is None:
        return jsonify({"error": {"message": "session_id, match, and confidence_score are required"}}), 400
    if not isinstance(match_value, bool):
        return jsonify({"error": {"message": "match must be a boolean"}}), 400

    try:
        confidence_score = float(confidence_value)
    except (TypeError, ValueError):
        return jsonify({"error": {"message": "confidence_score must be numeric"}}), 400
    if confidence_score < 0 or confidence_score > 1:
        return jsonify({"error": {"message": "confidence_score must be between 0 and 1"}}), 400

    session = db.session.get(ExamSession, int(session_id))
    if not session:
        return jsonify({"error": {"message": "Session not found"}}), 404

    threshold = 0.6
    is_verified = bool(match_value) and confidence_score >= threshold

    session.identity_verified = is_verified
    session.verification_score = confidence_score
    session.verification_method = method
    session.verification_details = {
        "match": bool(match_value),
        "threshold": threshold,
        "model_version": model_version,
    }
    if is_verified:
        session.verified_at = datetime.utcnow()

    db.session.add(
        BehavioralLog(
            session_id=session.session_id,
            event_type="identity_verification",
            event_data={
                "verified": is_verified,
                "match": bool(match_value),
                "confidence_score": round(confidence_score, 4),
                "threshold": threshold,
                "method": method,
                "model_version": model_version,
            },
        )
    )
    log_audit(
        action="session.identity_verification",
        actor_user_id=None,
        target_user_id=session.student_id,
        metadata={
            "session_id": session.session_id,
            "verified": is_verified,
            "confidence_score": round(confidence_score, 4),
            "threshold": threshold,
            "method": method,
            "model_version": model_version,
        },
    )
    db.session.commit()
    if not is_verified:
        return jsonify({"identity_verified": False, "message": "Face verification failed threshold check"}), 422
    return jsonify({"identity_verified": True, "confidence_score": round(confidence_score, 4), "verified_at": session.verified_at.isoformat() if session.verified_at else None}), 200


@sessions_bp.post("/log")
@jwt_required()
def log_event():
    data = request.get_json(silent=True) or {}
    session_id = data.get("session_id")
    event_type = data.get("event_type")
    event_data = data.get("event_data") or {}

    if not session_id or event_type not in VALID_EVENTS:
        return jsonify({"error": {"message": "Invalid session_id or event_type"}}), 400

    session = db.session.get(ExamSession, int(session_id))
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
    session = db.session.get(ExamSession, session_id)
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
    session = db.session.get(ExamSession, session_id)
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
    user_id = int(get_jwt_identity())

    sessions = (
        db.session.query(ExamSession, Exam, User)
        .join(Exam, Exam.exam_id == ExamSession.exam_id)
        .join(User, User.user_id == ExamSession.student_id)
        .order_by(ExamSession.session_id.desc())
    )
    if role == "lecturer":
        sessions = sessions.filter(Exam.lecturer_id == user_id)
    elif role == "student":
        sessions = sessions.filter(ExamSession.student_id == user_id)
    elif role != "admin":
        return jsonify({"error": {"message": "Forbidden"}}), 403
    sessions = sessions.all()

    payload = []
    for session, exam, student in sessions:
        if session.warning_count >= 3:
            risk_level = "high"
        elif session.warning_count > 1:
            risk_level = "medium"
        else:
            risk_level = "low"
        payload.append(
            {
                "session_id": session.session_id,
                "student_name": student.full_name,
                "student_id": session.student_id,
                "registration_number": student.reg_number,
                "student_email": student.email,
                "exam_title": exam.title,
                "exam_id": exam.exam_id,
                "course_code": exam.course_code,
                "scheduled_at": exam.scheduled_at.isoformat() if exam.scheduled_at else None,
                "session_status": session.session_status,
                "score": float(session.score) if session.score is not None else None,
                "warning_count": session.warning_count,
                "risk_level": risk_level,
            }
        )

    return jsonify({"sessions": payload}), 200
