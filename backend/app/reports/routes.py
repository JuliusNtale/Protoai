import csv
import io

from flask import Blueprint, Response, jsonify
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.extensions import db
from app.models import BehavioralLog, Exam, ExamSession, Report, User

reports_bp = Blueprint("reports", __name__)


def _can_view_session(user_role, user_id, session_row, exam_row):
    if user_role == "admin":
        return True
    if user_role == "lecturer" and exam_row.lecturer_id == user_id:
        return True
    return False


def _build_report_snapshot(session_row):
    logs = BehavioralLog.query.filter_by(session_id=session_row.session_id).all()
    counts = {
        "gaze_away": 0,
        "head_turned": 0,
        "tab_switch": 0,
        "face_absent": 0,
        "multiple_faces": 0,
    }
    for log in logs:
        if log.event_type in counts:
            counts[log.event_type] += 1

    total_anomalies = sum(counts.values())
    if total_anomalies > 10 or (session_row.warning_count or 0) >= 3:
        risk_level = "high"
    elif total_anomalies > 5:
        risk_level = "medium"
    else:
        risk_level = "low"

    return counts, total_anomalies, risk_level, logs


@reports_bp.get("/<int:session_id>")
@jwt_required()
def get_report(session_id):
    claims = get_jwt()
    user_role = claims.get("role")
    user_id = int(get_jwt_identity())
    if user_role not in {"admin", "lecturer"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    joined = (
        db.session.query(ExamSession, Exam, User)
        .join(Exam, Exam.exam_id == ExamSession.exam_id)
        .join(User, User.user_id == ExamSession.student_id)
        .filter(ExamSession.session_id == session_id)
        .first()
    )
    if not joined:
        return jsonify({"error": {"message": "Session not found"}}), 404

    session_row, exam_row, student_row = joined
    if not _can_view_session(user_role, user_id, session_row, exam_row):
        return jsonify({"error": {"message": "Forbidden"}}), 403

    counts, total_anomalies, risk_level, logs = _build_report_snapshot(session_row)
    report = Report.query.filter_by(session_id=session_row.session_id).first()
    if not report:
        report = Report(
            session_id=session_row.session_id,
            gaze_away_count=counts["gaze_away"],
            head_turned_count=counts["head_turned"],
            tab_switch_count=counts["tab_switch"],
            face_absent_count=counts["face_absent"],
            multiple_faces_count=counts["multiple_faces"],
            total_anomalies=total_anomalies,
            risk_level=risk_level,
        )
        db.session.add(report)
        db.session.commit()

    return (
        jsonify(
            {
                "report": {
                    "session_id": session_row.session_id,
                    "student": {
                        "user_id": student_row.user_id,
                        "full_name": student_row.full_name,
                        "reg_number": student_row.reg_number,
                        "email": student_row.email,
                    },
                    "exam": {
                        "exam_id": exam_row.exam_id,
                        "title": exam_row.title,
                        "course_code": exam_row.course_code,
                    },
                    "gaze_away_count": report.gaze_away_count,
                    "head_turned_count": report.head_turned_count,
                    "tab_switch_count": report.tab_switch_count,
                    "face_absent_count": report.face_absent_count,
                    "multiple_faces_count": report.multiple_faces_count,
                    "total_anomalies": report.total_anomalies,
                    "risk_level": report.risk_level,
                    "logs": [
                        {
                            "log_id": log.log_id,
                            "event_type": log.event_type,
                            "event_data": log.event_data or {},
                            "logged_at": log.logged_at.isoformat() if log.logged_at else None,
                        }
                        for log in logs
                    ],
                }
            }
        ),
        200,
    )


@reports_bp.get("/my")
@jwt_required()
def my_reports():
    user_role = get_jwt().get("role")
    user_id = int(get_jwt_identity())
    if user_role != "student":
        return jsonify({"error": {"message": "Forbidden"}}), 403

    rows = (
        db.session.query(ExamSession, Exam)
        .join(Exam, Exam.exam_id == ExamSession.exam_id)
        .filter(ExamSession.student_id == user_id)
        .order_by(ExamSession.session_id.desc())
        .all()
    )

    payload = []
    for session_row, exam_row in rows:
        counts, total_anomalies, risk_level, _ = _build_report_snapshot(session_row)
        payload.append(
            {
                "session_id": session_row.session_id,
                "exam_id": exam_row.exam_id,
                "exam_title": exam_row.title,
                "course_code": exam_row.course_code,
                "score": float(session_row.score) if session_row.score is not None else None,
                "warning_count": session_row.warning_count or 0,
                "risk_level": risk_level,
                "total_anomalies": total_anomalies,
                "gaze_away_count": counts["gaze_away"],
                "head_turned_count": counts["head_turned"],
                "tab_switch_count": counts["tab_switch"],
                "face_absent_count": counts["face_absent"],
                "multiple_faces_count": counts["multiple_faces"],
                "session_status": session_row.session_status,
            }
        )

    return jsonify({"reports": payload}), 200


@reports_bp.get("/export/<int:exam_id>")
@jwt_required()
def export_exam_reports(exam_id):
    claims = get_jwt()
    user_role = claims.get("role")
    user_id = int(get_jwt_identity())
    if user_role not in {"admin", "lecturer"}:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    exam = Exam.query.get(exam_id)
    if not exam:
        return jsonify({"error": {"message": "Exam not found"}}), 404
    if user_role == "lecturer" and exam.lecturer_id != user_id:
        return jsonify({"error": {"message": "Forbidden"}}), 403

    rows = (
        db.session.query(ExamSession, User)
        .join(User, User.user_id == ExamSession.student_id)
        .filter(ExamSession.exam_id == exam_id)
        .all()
    )

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "session_id",
            "student_name",
            "reg_number",
            "score",
            "warning_count",
            "risk_level",
            "status",
        ]
    )

    for session_row, user_row in rows:
        _, total_anomalies, risk_level, _ = _build_report_snapshot(session_row)
        writer.writerow(
            [
                session_row.session_id,
                user_row.full_name,
                user_row.reg_number,
                float(session_row.score or 0),
                session_row.warning_count,
                risk_level if total_anomalies > 0 else "low",
                session_row.session_status,
            ]
        )

    csv_data = output.getvalue()
    output.close()
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f'attachment; filename="exam_report_{exam_id}.csv"'},
    )
