from datetime import datetime

from app.extensions import db
from app.models import Exam, User


def _register_and_login(client, reg, role="student"):
    client.post(
        "/api/auth/register",
        json={
            "name": f"User {reg}",
            "registration_number": reg,
            "password": "Password123",
            "role": role,
        },
    )
    login = client.post(
        "/api/auth/login",
        json={"registration_number": reg, "password": "Password123"},
    )
    return login.get_json()["token"]


def test_start_session_returns_409_if_existing(client, app):
    student_token = _register_and_login(client, "T22-03-30001")
    lecturer_token = _register_and_login(client, "L22-03-40001", role="lecturer")

    create_exam = client.post(
        "/api/exams",
        json={"title": "Algorithms", "course_code": "CS301", "duration_min": 120},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    exam_id = create_exam.get_json()["exam_id"]
    client.post(
        f"/api/exams/{exam_id}/questions",
        json={
            "question_text": "2 + 2 = ?",
            "question_type": "mcq",
            "option_a": "3",
            "option_b": "4",
            "option_c": "5",
            "option_d": "6",
            "correct_answer": "B",
            "marks": 1,
            "order_num": 1,
        },
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    client.patch(
        f"/api/exams/{exam_id}/status",
        json={"status": "scheduled"},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )

    first = client.post(
        "/api/sessions/start",
        json={"exam_id": exam_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert first.status_code == 201

    second = client.post(
        "/api/sessions/start",
        json={"exam_id": exam_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert second.status_code == 409
    assert second.get_json()["session_id"]


def test_reports_access_control_and_csv_export(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50001", role="lecturer")
    other_lecturer_token = _register_and_login(client, "L22-03-50002", role="lecturer")
    student_token = _register_and_login(client, "T22-03-50003")

    with app.app_context():
        lecturer = User.query.filter_by(reg_number="L22-03-50001").first()
        student = User.query.filter_by(reg_number="T22-03-50003").first()
        exam = Exam(
            title="Database Systems",
            course_code="CS204",
            lecturer_id=lecturer.user_id,
            duration_min=90,
            scheduled_at=datetime.utcnow(),
            status="active",
        )
        db.session.add(exam)
        db.session.commit()
        exam_id = exam.exam_id

    start = client.post(
        "/api/sessions/start",
        json={"exam_id": exam_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    session_id = start.get_json()["session_id"]

    own_access = client.get(
        f"/api/reports/{session_id}",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert own_access.status_code == 200

    forbidden_access = client.get(
        f"/api/reports/{session_id}",
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert forbidden_access.status_code == 403

    export_ok = client.get(
        f"/api/reports/export/{exam_id}",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert export_ok.status_code == 200
    assert "text/csv" in export_ok.headers.get("Content-Type", "")
