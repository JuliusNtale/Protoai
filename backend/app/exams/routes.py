from datetime import datetime

from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import Exam, ExamSession, Question, User

exams_bp = Blueprint("exams", __name__)


@exams_bp.get("")
@jwt_required()
def list_exams():
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    status_filter = request.args.get("status")
    query = Exam.query
    if role == "lecturer":
        query = query.filter_by(lecturer_id=user_id)
    if role == "student":
        query = query.filter(Exam.status.in_(["scheduled", "live", "completed"]))
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
                    "lecturer_id": exam.lecturer_id,
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


@exams_bp.patch("/<int:exam_id>/status")
@jwt_required()
def update_exam_status(exam_id):
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if role == "lecturer" and exam.lecturer_id != user_id:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    data = request.get_json(silent=True) or {}
    status = (data.get("status") or "").strip().lower()
    if status not in {"draft", "scheduled", "live", "completed"}:
        return jsonify({"error": {"message": "Invalid status"}}), 400
    exam.status = status
    db.session.commit()
    return jsonify({"message": "Exam status updated", "status": exam.status}), 200


@exams_bp.get("/<int:exam_id>")
@jwt_required()
def get_exam(exam_id):
    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404

    claims = get_jwt()
    can_view_answers = claims.get("role") in {"lecturer", "admin"}
    questions = Question.query.filter_by(exam_id=exam.exam_id).order_by(Question.order_num.asc()).all()

    payload_questions = []
    for question in questions:
        question_payload = {
            "question_id": question.question_id,
            "question_text": question.question_text,
            "option_a": question.option_a,
            "option_b": question.option_b,
            "option_c": question.option_c,
            "option_d": question.option_d,
            "question_type": question.question_type,
            "marks": question.marks,
            "order_num": question.order_num,
        }
        if can_view_answers:
            question_payload["correct_answer"] = question.correct_answer
        payload_questions.append(question_payload)

    return (
        jsonify(
            {
                "exam": {
                    "exam_id": exam.exam_id,
                    "title": exam.title,
                    "course_code": exam.course_code,
                    "duration_min": exam.duration_min,
                    "scheduled_at": exam.scheduled_at.isoformat() if exam.scheduled_at else None,
                    "status": exam.status,
                },
                "questions": payload_questions,
            }
        ),
        200,
    )


@exams_bp.post("/<int:exam_id>/questions")
@jwt_required()
def create_question(exam_id):
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if role == "lecturer" and exam.lecturer_id != user_id:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    data = request.get_json(silent=True) or {}
    question_text = (data.get("question_text") or "").strip()
    question_type = (data.get("question_type") or "mcq").strip().lower()
    correct_answer = (data.get("correct_answer") or "").strip().upper()
    marks = int(data.get("marks") or 1)
    order_num = int(data.get("order_num") or 0)

    if not question_text or question_type not in {"mcq", "true_false"}:
        return jsonify({"error": {"message": "question_text and valid question_type are required"}}), 400
    if not correct_answer:
        return jsonify({"error": {"message": "correct_answer is required"}}), 400

    question = Question(
        exam_id=exam.exam_id,
        question_text=question_text,
        question_type=question_type,
        option_a=(data.get("option_a") or "").strip() or None,
        option_b=(data.get("option_b") or "").strip() or None,
        option_c=(data.get("option_c") or "").strip() or None,
        option_d=(data.get("option_d") or "").strip() or None,
        correct_answer=correct_answer,
        marks=marks,
        order_num=order_num,
    )
    db.session.add(question)
    db.session.commit()
    return jsonify({"question_id": question.question_id}), 201


@exams_bp.delete("/<int:exam_id>/questions/<int:question_id>")
@jwt_required()
def delete_question(exam_id, question_id):
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if role == "lecturer" and exam.lecturer_id != user_id:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    question = Question.query.filter_by(exam_id=exam_id, question_id=question_id).first()
    if not question:
        return jsonify({"error": {"message": "Question not found"}}), 404
    db.session.delete(question)
    db.session.commit()
    return jsonify({"message": "Question deleted"}), 200


@exams_bp.get("/<int:exam_id>/students")
@jwt_required()
def list_exam_students(exam_id):
    role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    if role not in {"lecturer", "admin"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if role == "lecturer" and exam.lecturer_id != user_id:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    rows = (
        db.session.query(ExamSession, User)
        .join(User, User.user_id == ExamSession.student_id)
        .filter(ExamSession.exam_id == exam_id)
        .order_by(User.full_name.asc())
        .all()
    )

    return jsonify(
        {
            "students": [
                {
                    "user_id": user.user_id,
                    "full_name": user.full_name,
                    "registration_number": user.reg_number,
                    "email": user.email,
                    "session_id": session.session_id,
                    "session_status": session.session_status,
                    "score": float(session.score) if session.score is not None else None,
                    "warning_count": session.warning_count or 0,
                }
                for session, user in rows
            ]
        }
    ), 200
