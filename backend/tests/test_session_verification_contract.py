from datetime import datetime

from app.extensions import db
from app.models import BehavioralLog, Exam, ExamSession, User


def _seed_session(app):
    with app.app_context():
        student = User(
            full_name="Student Verify",
            reg_number="T22-03-90001",
            email="verify.student@example.com",
            password_hash="hash",
            role="student",
        )
        lecturer = User(
            full_name="Lecturer Verify",
            reg_number="L22-03-90001",
            email="verify.lecturer@example.com",
            password_hash="hash",
            role="lecturer",
        )
        db.session.add_all([student, lecturer])
        db.session.flush()

        exam = Exam(
            title="Verification Contract Exam",
            course_code="CS999",
            lecturer_id=lecturer.user_id,
            duration_min=60,
            scheduled_at=datetime.utcnow(),
            status="active",
        )
        db.session.add(exam)
        db.session.flush()

        session = ExamSession(
            student_id=student.user_id,
            exam_id=exam.exam_id,
            session_status="active",
            identity_verified=False,
            warning_count=0,
        )
        db.session.add(session)
        db.session.commit()
        return session.session_id, student.user_id


def test_verify_requires_internal_token(client, app):
    session_id, _ = _seed_session(app)
    response = client.post(
        "/api/sessions/verify",
        json={"session_id": session_id, "match": True, "confidence_score": 0.91},
    )
    assert response.status_code == 401


def test_verify_persists_identity_evidence_and_logs(client, app):
    session_id, student_id = _seed_session(app)

    response = client.post(
        "/api/sessions/verify",
        headers={"X-Internal-Token": "test-internal-token"},
        json={
            "session_id": session_id,
            "match": True,
            "confidence_score": 0.91,
            "verification_method": "ai-face-embedding",
            "model_version": "facenet_best.onnx",
        },
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["identity_verified"] is True

    with app.app_context():
        session = db.session.get(ExamSession, session_id)
        assert session.identity_verified is True
        assert session.verification_score == 0.91
        assert session.verification_method == "ai-face-embedding"
        assert session.verification_details["model_version"] == "facenet_best.onnx"
        assert session.verification_details["match"] is True
        assert session.verified_at is not None

        log = (
            BehavioralLog.query.filter_by(session_id=session_id, event_type="identity_verification")
            .order_by(BehavioralLog.log_id.desc())
            .first()
        )
        assert log is not None
        assert log.event_data["verified"] is True
        assert log.event_data["confidence_score"] == 0.91
        assert session.student_id == student_id

