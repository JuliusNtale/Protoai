"""
Exam Lab dev-only bootstrap endpoints.

These exist so the exam module can be developed and re-tested repeatedly
without manually logging in, creating an exam, and completing facial
identity verification every time. They are NOT a shortcut around any
production security check: the endpoints below seed real rows in the
same tables the normal flow uses (User, Exam, Question,
ExamStudentAssignment, ExamSession), including a genuinely
`identity_verified=True` ExamSession row - so the real, unmodified
`GET /sessions/<id>/status` check on the /exam page still passes
honestly rather than being bypassed.

This entire blueprint is only registered by create_app() when
Config.ENABLE_DEV_TOOLS is true, which itself requires BOTH
ENABLE_DEV_TOOLS=true AND FLASK_ENV=development (see app/config.py) -
so it does not exist at all unless explicitly enabled in local dev.
_require_dev_tools() re-checks the same flag inside each route as
defense in depth.
"""

import base64
import os
from datetime import datetime

from flask import Blueprint, current_app, jsonify
from flask_jwt_extended import create_access_token

from app.extensions import db
from app.models import (
    BehavioralLog,
    DegreeProgram,
    Exam,
    ExamSession,
    ExamStudentAssignment,
    FacialImage,
    Question,
    SessionAnswer,
    User,
)

devtools_bp = Blueprint("devtools", __name__)

DEV_LECTURER_REG_NUMBER = "DEV-LEC-0001"
DEV_LECTURER_EMAIL = "dev.lecturer@examlab.local"
DEV_LECTURER_USERNAME = "dev.lecturer"
DEV_STUDENT_REG_NUMBER = "DEV-STU-0001"
DEV_STUDENT_EMAIL = "dev.student@examlab.local"
DEV_PASSWORD = "ExamLabDev123!"
DEV_PROGRAM_NAME = "Exam Lab Sandbox Program"
DEV_EXAM_TITLE = "Exam Lab Sandbox Exam"
DEV_EXAM_COURSE_CODE = "DEVLAB101"

# 1x1 black pixel JPEG - only used as a placeholder baseline image row so
# the dev student's profile looks complete. Exam Lab never runs real face
# matching against it; it seeds identity_verified=True directly on the
# session it creates instead.
_PLACEHOLDER_JPEG_B64 = (
    "/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0a"
    "HBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIy"
    "MjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIA"
    "AhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAn/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEB"
    "AQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX"
    "/9k="
)


def _dev_tools_enabled() -> bool:
    return bool(current_app.config.get("ENABLE_DEV_TOOLS"))


def _require_dev_tools():
    if not _dev_tools_enabled():
        return jsonify({"error": {"message": "Exam Lab dev tools are disabled"}}), 404
    return None


@devtools_bp.get("/exam-lab/status")
def exam_lab_status():
    return jsonify({"enabled": _dev_tools_enabled()}), 200


@devtools_bp.post("/exam-lab/bootstrap")
def exam_lab_bootstrap():
    blocked = _require_dev_tools()
    if blocked:
        return blocked

    program = DegreeProgram.query.filter_by(name=DEV_PROGRAM_NAME).first()
    if not program:
        program = DegreeProgram(name=DEV_PROGRAM_NAME)
        db.session.add(program)
        db.session.flush()

    lecturer = User.query.filter_by(reg_number=DEV_LECTURER_REG_NUMBER).first()
    if not lecturer:
        lecturer = User(
            full_name="Exam Lab Dev Lecturer",
            reg_number=DEV_LECTURER_REG_NUMBER,
            email=DEV_LECTURER_EMAIL,
            username=DEV_LECTURER_USERNAME,
            role="lecturer",
            department=program.name,
            credential_source="dev_bootstrap",
            lecturer_profile_confirmed=True,
            is_active=True,
        )
        lecturer.set_password(DEV_PASSWORD)
        db.session.add(lecturer)
        db.session.flush()

    student = User.query.filter_by(reg_number=DEV_STUDENT_REG_NUMBER).first()
    if not student:
        student = User(
            full_name="Exam Lab Dev Student",
            reg_number=DEV_STUDENT_REG_NUMBER,
            email=DEV_STUDENT_EMAIL,
            role="student",
            department=program.name,
            phone_number="+255000000000",
            academic_year="1",
            year_enrolled=datetime.utcnow().year,
            credential_source="dev_bootstrap",
            student_profile_confirmed=True,
            is_active=True,
        )
        student.set_password(DEV_PASSWORD)
        db.session.add(student)
        db.session.flush()

    if not FacialImage.query.filter_by(user_id=student.user_id).first():
        storage_dir = os.path.join("storage", "faces")
        os.makedirs(storage_dir, exist_ok=True)
        file_name = f"{student.user_id}_examlab_placeholder.jpg"
        file_path = os.path.join(storage_dir, file_name)
        with open(file_path, "wb") as face_file:
            face_file.write(base64.b64decode(_PLACEHOLDER_JPEG_B64))
        db.session.add(FacialImage(user_id=student.user_id, file_path=file_path))

    exam = Exam.query.filter_by(course_code=DEV_EXAM_COURSE_CODE, lecturer_id=lecturer.user_id).first()
    if not exam:
        exam = Exam(
            title=DEV_EXAM_TITLE,
            course_code=DEV_EXAM_COURSE_CODE,
            lecturer_id=lecturer.user_id,
            duration_min=30,
            status="live",
            programs=[program],
        )
        db.session.add(exam)
        db.session.flush()
    elif exam.status != "live":
        exam.status = "live"

    if not ExamStudentAssignment.query.filter_by(exam_id=exam.exam_id, student_id=student.user_id).first():
        db.session.add(
            ExamStudentAssignment(exam_id=exam.exam_id, student_id=student.user_id, added_by=lecturer.user_id)
        )

    if Question.query.filter_by(exam_id=exam.exam_id).count() == 0:
        seed_questions = [
            ("What is the time complexity of binary search on a sorted array?", "B", "O(n)", "O(log n)", "O(n log n)", "O(1)"),
            ("Which layer of the OSI model is responsible for routing?", "C", "Data Link", "Transport", "Network", "Session"),
            ("In SQL, which statement removes rows from a table?", "B", "DROP", "DELETE", "TRUNCATE", "REMOVE"),
            ("A stack follows which access order?", "D", "FIFO", "Random", "Priority", "LIFO"),
            ("Which of these is NOT a valid HTTP method?", "A", "FETCH", "GET", "POST", "DELETE"),
        ]
        for order_num, (text, correct, a, b, c, d) in enumerate(seed_questions, start=1):
            db.session.add(
                Question(
                    exam_id=exam.exam_id,
                    question_text=text,
                    question_type="mcq",
                    option_a=a,
                    option_b=b,
                    option_c=c,
                    option_d=d,
                    correct_answer=correct,
                    marks=1,
                    order_num=order_num,
                )
            )

    db.session.flush()

    session = ExamSession.query.filter_by(student_id=student.user_id, exam_id=exam.exam_id).first()
    now = datetime.utcnow()
    if session:
        SessionAnswer.query.filter_by(session_id=session.session_id).delete(synchronize_session=False)
        BehavioralLog.query.filter_by(session_id=session.session_id).delete(synchronize_session=False)
        session.session_status = "active"
        session.identity_verified = True
        session.verification_score = 1.0
        session.verification_method = "exam-lab-dev-bootstrap"
        session.verification_details = {"source": "exam_lab_bootstrap"}
        session.verified_at = now
        session.started_at = now
        session.warning_count = 0
        session.score = None
        session.submitted_at = None
        session.termination_reason = None
        session.terminated_by = None
    else:
        session = ExamSession(
            student_id=student.user_id,
            exam_id=exam.exam_id,
            started_at=now,
            session_status="active",
            identity_verified=True,
            verification_score=1.0,
            verification_method="exam-lab-dev-bootstrap",
            verification_details={"source": "exam_lab_bootstrap"},
            verified_at=now,
            warning_count=0,
        )
        db.session.add(session)

    db.session.commit()

    token = create_access_token(identity=str(student.user_id), additional_claims={"role": student.role})

    return (
        jsonify(
            {
                "token": token,
                "user": student.to_auth_user(),
                "session_id": session.session_id,
                "exam_id": exam.exam_id,
                "dev_credentials": {
                    "student_login_id": student.reg_number,
                    "lecturer_login_id": lecturer.username,
                    "password": DEV_PASSWORD,
                },
            }
        ),
        200,
    )
