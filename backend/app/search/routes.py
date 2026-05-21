from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from sqlalchemy import cast, or_, String

from app.extensions import db
from app.models import AuditLog, Exam, ExamSession, Question, User


search_bp = Blueprint("search", __name__)


def _append_result(results, seen, item):
    key = (item.get("type"), item.get("id"))
    if key in seen:
        return
    seen.add(key)
    results.append(item)


def _href_for(role: str, item_type: str) -> str:
    if role == "admin":
        if item_type == "user":
            return "/admin/users"
        if item_type == "log":
            return "/admin/system-logs"
        return "/admin"
    if role == "lecturer":
        mapping = {
            "exam": "/lecturer?tab=exams",
            "question": "/lecturer?tab=questions",
            "session": "/lecturer?tab=results",
            "user": "/lecturer?tab=students",
            "log": "/lecturer?tab=dashboard",
        }
        return mapping.get(item_type, "/lecturer")
    mapping = {
        "exam": "/dashboard?tab=exams",
        "session": "/dashboard?tab=sessions",
        "user": "/dashboard?tab=profile",
        "log": "/dashboard?tab=reports",
    }
    return mapping.get(item_type, "/dashboard")


@search_bp.get("")
@jwt_required()
def global_search():
    query = (request.args.get("q") or "").strip()
    if len(query) < 2:
        return jsonify({"results": []}), 200

    limit = min(max(int(request.args.get("limit", 20)), 1), 50)
    user_id = int(get_jwt_identity())
    role = (get_jwt() or {}).get("role")
    pattern = f"%{query}%"

    results = []
    seen = set()

    if role == "admin":
        users = (
            User.query.filter(
                or_(
                    User.full_name.ilike(pattern),
                    User.reg_number.ilike(pattern),
                    User.email.ilike(pattern),
                    User.username.ilike(pattern),
                    User.department.ilike(pattern),
                )
            )
            .order_by(User.created_at.desc())
            .limit(limit)
            .all()
        )
        for user in users:
            _append_result(
                results,
                seen,
                {
                    "type": "user",
                    "id": user.user_id,
                    "title": user.full_name,
                    "subtitle": f"{user.role} • {user.reg_number} • {user.email}",
                    "href": _href_for(role, "user"),
                },
            )

    if role in {"admin", "lecturer", "student"}:
        exams_query = Exam.query
        if role == "lecturer":
            exams_query = exams_query.filter(Exam.lecturer_id == user_id)
        elif role == "student":
            exams_query = exams_query.filter(Exam.status.in_(["scheduled", "active", "live"]))

        exams = (
            exams_query.filter(
                or_(
                    Exam.title.ilike(pattern),
                    Exam.course_code.ilike(pattern),
                    Exam.status.ilike(pattern),
                )
            )
            .order_by(Exam.created_at.desc())
            .limit(limit)
            .all()
        )
        for exam in exams:
            _append_result(
                results,
                seen,
                {
                    "type": "exam",
                    "id": exam.exam_id,
                    "title": exam.title,
                    "subtitle": f"{exam.course_code} • {exam.status}",
                    "href": _href_for(role, "exam"),
                },
            )

    if role in {"admin", "lecturer"}:
        question_query = (
            db.session.query(Question, Exam)
            .join(Exam, Exam.exam_id == Question.exam_id)
            .filter(Question.question_text.ilike(pattern))
        )
        if role == "lecturer":
            question_query = question_query.filter(Exam.lecturer_id == user_id)
        question_rows = question_query.order_by(Question.question_id.desc()).limit(limit).all()
        for question, exam in question_rows:
            _append_result(
                results,
                seen,
                {
                    "type": "question",
                    "id": question.question_id,
                    "title": question.question_text[:120],
                    "subtitle": f"{exam.title} • {exam.course_code}",
                    "href": _href_for(role, "question"),
                },
            )

    if role in {"admin", "lecturer", "student"}:
        sessions_query = (
            db.session.query(ExamSession, Exam, User)
            .join(Exam, Exam.exam_id == ExamSession.exam_id)
            .join(User, User.user_id == ExamSession.student_id)
        )
        if role == "lecturer":
            sessions_query = sessions_query.filter(Exam.lecturer_id == user_id)
        elif role == "student":
            sessions_query = sessions_query.filter(ExamSession.student_id == user_id)

        sessions = (
            sessions_query.filter(
                or_(
                    Exam.title.ilike(pattern),
                    Exam.course_code.ilike(pattern),
                    User.full_name.ilike(pattern),
                    User.reg_number.ilike(pattern),
                    ExamSession.session_status.ilike(pattern),
                    cast(ExamSession.session_id, String).ilike(pattern),
                )
            )
            .order_by(ExamSession.started_at.desc())
            .limit(limit)
            .all()
        )
        for session, exam, student in sessions:
            _append_result(
                results,
                seen,
                {
                    "type": "session",
                    "id": session.session_id,
                    "title": f"Session #{session.session_id} • {exam.title}",
                    "subtitle": f"{student.full_name} • {session.session_status}",
                    "href": _href_for(role, "session"),
                },
            )

    if role == "admin":
        logs = (
            AuditLog.query.filter(
                or_(
                    AuditLog.action.ilike(pattern),
                    cast(AuditLog.details, String).ilike(pattern),
                )
            )
            .order_by(AuditLog.created_at.desc())
            .limit(limit)
            .all()
        )
        for log in logs:
            _append_result(
                results,
                seen,
                {
                    "type": "log",
                    "id": log.audit_id,
                    "title": log.action.replace("_", " "),
                    "subtitle": f"audit #{log.audit_id}",
                    "href": _href_for(role, "log"),
                },
            )

    return jsonify({"results": results[:limit]}), 200
