from datetime import datetime
from pathlib import Path

from app.extensions import db
from app.models import BehavioralLog, Exam, ExamSession, FacialImage, User


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


def _complete_student_verification_prerequisites(app, reg_number: str, tmp_path: Path):
    with app.app_context():
        student = User.query.filter_by(reg_number=reg_number).first()
        student.phone_number = "+255700000000"
        student.department = "BSc Computer Science"
        student.student_profile_confirmed = True
        image_path = tmp_path / f"{reg_number}.jpg"
        image_path.write_bytes(b"fake-jpeg-bytes")
        db.session.add(FacialImage(user_id=student.user_id, file_path=str(image_path)))
        db.session.commit()


def _complete_lecturer_verification_prerequisites(app, reg_number: str):
    with app.app_context():
        lecturer = User.query.filter_by(reg_number=reg_number).first()
        lecturer.phone_number = "+255711111111"
        lecturer.department = "School of Computing"
        lecturer.lecturer_profile_confirmed = True
        db.session.commit()


def test_start_session_returns_409_if_existing(client, app, tmp_path):
    student_token = _register_and_login(client, "T22-03-30001")
    lecturer_token = _register_and_login(client, "L22-03-40001", role="lecturer")
    _complete_student_verification_prerequisites(app, "T22-03-30001", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-40001")

    create_exam = client.post(
        "/api/exams",
        json={"title": "Algorithms", "course_code": "CS301", "duration_min": 120, "program_ids": [1]},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    create_exam_json = create_exam.get_json() or {}
    assert create_exam.status_code == 201, create_exam_json
    assert "exam_id" in create_exam_json, f"Exam creation failed: {create_exam_json}"
    exam_id = create_exam_json["exam_id"]
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


def test_ai_service_can_log_monitoring_anomaly_with_internal_token(client, app):
    with app.app_context():
        student = User(
            full_name="Monitoring Student",
            reg_number="T22-03-31001",
            email="monitoring.student@example.test",
            username="T22-03-31001",
            role="student",
            is_active=True,
        )
        lecturer = User(
            full_name="Monitoring Lecturer",
            reg_number="L22-03-41001",
            email="monitoring.lecturer@example.test",
            username="L22-03-41001",
            role="lecturer",
            is_active=True,
        )
        student.set_password("Password123")
        lecturer.set_password("Password123")
        db.session.add_all([student, lecturer])
        db.session.commit()

        exam = Exam(
            title="Monitoring Contract",
            course_code="CS401",
            lecturer_id=lecturer.user_id,
            duration_min=60,
            scheduled_at=datetime.utcnow(),
            status="active",
        )
        db.session.add(exam)
        db.session.commit()

        session = ExamSession(
            student_id=student.user_id,
            exam_id=exam.exam_id,
            started_at=datetime.utcnow(),
            session_status="active",
            identity_verified=True,
            warning_count=0,
        )
        db.session.add(session)
        db.session.commit()
        session_id = session.session_id

    unauthenticated = client.post(
        "/api/sessions/log",
        json={"session_id": session_id, "event_type": "gaze_away"},
    )
    assert unauthenticated.status_code == 401

    logged = client.post(
        "/api/sessions/log",
        json={
            "session_id": session_id,
            "event_type": "gaze_away",
            "event_data": {"gaze_direction": "Left", "source": "ai-service"},
        },
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert logged.status_code == 200
    assert logged.get_json()["warning_count"] == 1

    with app.app_context():
        stored_session = db.session.get(ExamSession, session_id)
        stored_log = BehavioralLog.query.filter_by(session_id=session_id, event_type="gaze_away").one()
        assert stored_session.warning_count == 1
        assert stored_log.event_data["source"] == "ai-service"


def test_identity_mismatch_logs_and_flips_identity_verified_without_locking_session(client, app):
    with app.app_context():
        student = User(
            full_name="Swap Student",
            reg_number="T22-03-32001",
            email="swap.student@example.test",
            username="T22-03-32001",
            role="student",
            is_active=True,
        )
        lecturer = User(
            full_name="Swap Lecturer",
            reg_number="L22-03-42001",
            email="swap.lecturer@example.test",
            username="L22-03-42001",
            role="lecturer",
            is_active=True,
        )
        student.set_password("Password123")
        lecturer.set_password("Password123")
        db.session.add_all([student, lecturer])
        db.session.commit()

        exam = Exam(
            title="Swap Contract",
            course_code="CS402",
            lecturer_id=lecturer.user_id,
            duration_min=60,
            scheduled_at=datetime.utcnow(),
            status="active",
        )
        db.session.add(exam)
        db.session.commit()

        session = ExamSession(
            student_id=student.user_id,
            exam_id=exam.exam_id,
            started_at=datetime.utcnow(),
            session_status="active",
            identity_verified=True,
            warning_count=0,
        )
        db.session.add(session)
        db.session.commit()
        session_id = session.session_id

    # A confirmed mid-exam identity mismatch is logged like any other
    # anomaly for lecturer/admin review - it does not lock or auto-submit
    # the in-progress session, so the student can keep working. It still
    # flips identity_verified back to False so a *reload* back into the
    # exam is blocked by the /status guard.
    logged = client.post(
        "/api/sessions/log",
        json={
            "session_id": session_id,
            "event_type": "identity_mismatch",
            "event_data": {"confidence_score": 0.12},
        },
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert logged.status_code == 200
    payload = logged.get_json()
    assert payload["warning_count"] == 1
    assert "auto_submitted" not in payload

    with app.app_context():
        stored_session = db.session.get(ExamSession, session_id)
        assert stored_session.session_status == "active"
        assert stored_session.submitted_at is None
        assert stored_session.identity_verified is False


def test_internal_session_lookup_requires_token_and_returns_student_id(client, app, tmp_path):
    student_token = _register_and_login(client, "T22-03-33001")
    lecturer_token = _register_and_login(client, "L22-03-43001", role="lecturer")
    _complete_student_verification_prerequisites(app, "T22-03-33001", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-43001")

    create_exam = client.post(
        "/api/exams",
        json={"title": "Internal Lookup", "course_code": "CS403", "duration_min": 60, "program_ids": [1]},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    exam_id = create_exam.get_json()["exam_id"]
    client.post(
        f"/api/exams/{exam_id}/questions",
        json={
            "question_text": "1 + 1 = ?",
            "question_type": "mcq",
            "option_a": "1",
            "option_b": "2",
            "option_c": "3",
            "option_d": "4",
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

    start = client.post(
        "/api/sessions/start",
        json={"exam_id": exam_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    start_json = start.get_json() or {}
    assert start.status_code == 201, start_json
    session_id = start_json["session_id"]

    with app.app_context():
        student = User.query.filter_by(reg_number="T22-03-33001").first()
        expected_student_id = student.user_id

    unauthorized = client.get(f"/api/sessions/internal/{session_id}")
    assert unauthorized.status_code == 401

    wrong_token = client.get(
        f"/api/sessions/internal/{session_id}",
        headers={"X-Internal-Token": "not-the-right-token"},
    )
    assert wrong_token.status_code == 401

    ok = client.get(
        f"/api/sessions/internal/{session_id}",
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert ok.status_code == 200
    assert ok.get_json()["student_id"] == expected_student_id

    missing = client.get(
        "/api/sessions/internal/999999",
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert missing.status_code == 404


def test_session_status_reflects_current_identity_verified_state(client, app, tmp_path):
    student_token = _register_and_login(client, "T22-03-60001")
    other_student_token = _register_and_login(client, "T22-03-60002")
    lecturer_token = _register_and_login(client, "L22-03-60003", role="lecturer")
    _complete_student_verification_prerequisites(app, "T22-03-60001", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-60003")

    create_exam = client.post(
        "/api/exams",
        json={"title": "Networks", "course_code": "CS310", "duration_min": 60, "program_ids": [1]},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    exam_id = create_exam.get_json()["exam_id"]
    client.post(
        f"/api/exams/{exam_id}/questions",
        json={
            "question_text": "1 + 1 = ?",
            "question_type": "mcq",
            "option_a": "1",
            "option_b": "2",
            "option_c": "3",
            "option_d": "4",
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

    start = client.post(
        "/api/sessions/start",
        json={"exam_id": exam_id},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    start_json = start.get_json() or {}
    assert start.status_code == 201, start_json
    session_id = start_json["session_id"]

    # Before any verification attempt, the session must not report as verified.
    unverified = client.get(
        f"/api/sessions/{session_id}/status",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert unverified.status_code == 200
    assert unverified.get_json()["identity_verified"] is False

    # Simulate an impostor failing the face-match check.
    failed_verify = client.post(
        "/api/sessions/verify",
        json={"session_id": session_id, "match": False, "confidence_score": 0.2},
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert failed_verify.status_code == 422

    # The status endpoint is the guard the /exam page relies on - it must
    # still report unverified after a failed attempt, closing the bypass
    # where a stale client-side flag previously let the impostor back in.
    still_unverified = client.get(
        f"/api/sessions/{session_id}/status",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert still_unverified.status_code == 200
    assert still_unverified.get_json()["identity_verified"] is False

    # A genuine successful verification flips it to True.
    passed_verify = client.post(
        "/api/sessions/verify",
        json={"session_id": session_id, "match": True, "confidence_score": 0.95},
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert passed_verify.status_code == 200

    verified = client.get(
        f"/api/sessions/{session_id}/status",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert verified.status_code == 200
    assert verified.get_json()["identity_verified"] is True

    # Another student cannot read this session's status.
    forbidden = client.get(
        f"/api/sessions/{session_id}/status",
        headers={"Authorization": f"Bearer {other_student_token}"},
    )
    assert forbidden.status_code == 403

    missing = client.get(
        "/api/sessions/999999/status",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert missing.status_code == 404


def test_authorize_viewer_and_terminate_session(client, app, tmp_path):
    lecturer_token = _register_and_login(client, "L22-03-70001", role="lecturer")
    other_lecturer_token = _register_and_login(client, "L22-03-70002", role="lecturer")
    student_token = _register_and_login(client, "T22-03-70003")
    _complete_student_verification_prerequisites(app, "T22-03-70003", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-70001")

    with app.app_context():
        lecturer = User.query.filter_by(reg_number="L22-03-70001").first()
        exam = Exam(
            title="Operating Systems",
            course_code="CS305",
            lecturer_id=lecturer.user_id,
            duration_min=60,
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
    start_json = start.get_json() or {}
    assert start.status_code == 201, start_json
    session_id = start_json["session_id"]

    # Only the owning lecturer (or an admin) may subscribe to this session's
    # live alert stream - a different lecturer must be rejected.
    own_authorize = client.get(
        f"/api/sessions/{session_id}/authorize-viewer",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert own_authorize.status_code == 200

    other_authorize = client.get(
        f"/api/sessions/{session_id}/authorize-viewer",
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert other_authorize.status_code == 403

    student_authorize = client.get(
        f"/api/sessions/{session_id}/authorize-viewer",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_authorize.status_code == 403

    # A different lecturer cannot terminate a session they don't own.
    forbidden_terminate = client.post(
        f"/api/sessions/{session_id}/terminate",
        json={"reason": "Not your call"},
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert forbidden_terminate.status_code == 403

    terminate = client.post(
        f"/api/sessions/{session_id}/terminate",
        json={"reason": "Repeated identity mismatch during exam"},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert terminate.status_code == 200
    assert terminate.get_json()["session_status"] == "terminated"

    with app.app_context():
        stored_session = db.session.get(ExamSession, session_id)
        assert stored_session.session_status == "terminated"
        assert stored_session.termination_reason == "Repeated identity mismatch during exam"
        assert stored_session.submitted_at is not None
        termination_log = BehavioralLog.query.filter_by(
            session_id=session_id, event_type="session_terminated"
        ).one()
        assert termination_log.event_data["reason"] == "Repeated identity mismatch during exam"

    # A terminated session can no longer be submitted by the student.
    blocked_submit = client.post(
        f"/api/sessions/{session_id}/submit",
        json={"answers": {}},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert blocked_submit.status_code == 409

    # Terminating an already-ended session is rejected.
    already_terminated = client.post(
        f"/api/sessions/{session_id}/terminate",
        json={"reason": "Again"},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert already_terminated.status_code == 409


def test_lecturer_can_send_manual_warning_to_active_session(client, app, tmp_path):
    lecturer_token = _register_and_login(client, "L22-03-72001", role="lecturer")
    other_lecturer_token = _register_and_login(client, "L22-03-72002", role="lecturer")
    student_token = _register_and_login(client, "T22-03-72003")
    _complete_student_verification_prerequisites(app, "T22-03-72003", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-72001")

    with app.app_context():
        lecturer = User.query.filter_by(reg_number="L22-03-72001").first()
        exam = Exam(
            title="Databases",
            course_code="CS306",
            lecturer_id=lecturer.user_id,
            duration_min=60,
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
    start_json = start.get_json() or {}
    assert start.status_code == 201, start_json
    session_id = start_json["session_id"]

    # A student cannot send themselves a warning.
    student_forbidden = client.post(
        f"/api/sessions/{session_id}/warn",
        json={"message": "n/a"},
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert student_forbidden.status_code == 403

    # A lecturer who doesn't own this exam cannot warn its students either.
    other_forbidden = client.post(
        f"/api/sessions/{session_id}/warn",
        json={"message": "Not your call"},
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert other_forbidden.status_code == 403

    warn = client.post(
        f"/api/sessions/{session_id}/warn",
        json={"message": "Please keep your eyes on your own screen."},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert warn.status_code == 200
    warn_payload = warn.get_json()
    assert warn_payload["warning_count"] == 1

    # Sending a second warning increments warning_count again and is
    # reflected in risk_level exactly like an AI-detected anomaly would be.
    warn_again = client.post(
        f"/api/sessions/{session_id}/warn",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert warn_again.status_code == 200
    assert warn_again.get_json()["warning_count"] == 2

    with app.app_context():
        stored_session = db.session.get(ExamSession, session_id)
        assert stored_session.warning_count == 2
        assert stored_session.session_status == "active"
        logs = BehavioralLog.query.filter_by(session_id=session_id, event_type="lecturer_warning").order_by(
            BehavioralLog.log_id
        ).all()
        assert len(logs) == 2
        assert logs[0].event_data["message"] == "Please keep your eyes on your own screen."
        # No message supplied on the second call - a sensible default is used.
        assert logs[1].event_data["message"]

    # Terminating the session, then trying to warn it, is rejected - warnings
    # only make sense while the exam is still in progress.
    client.post(
        f"/api/sessions/{session_id}/terminate",
        json={"reason": "wrap up"},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    warn_after_terminate = client.post(
        f"/api/sessions/{session_id}/warn",
        json={"message": "too late"},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert warn_after_terminate.status_code == 409


def test_review_behavioral_log_records_lecturer_decision(client, app, tmp_path):
    lecturer_token = _register_and_login(client, "L22-03-71001", role="lecturer")
    other_lecturer_token = _register_and_login(client, "L22-03-71002", role="lecturer")
    student_token = _register_and_login(client, "T22-03-71003")
    _complete_student_verification_prerequisites(app, "T22-03-71003", tmp_path)
    _complete_lecturer_verification_prerequisites(app, "L22-03-71001")

    with app.app_context():
        lecturer = User.query.filter_by(reg_number="L22-03-71001").first()
        exam = Exam(
            title="Compilers",
            course_code="CS406",
            lecturer_id=lecturer.user_id,
            duration_min=60,
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

    logged = client.post(
        "/api/sessions/log",
        json={"session_id": session_id, "event_type": "gaze_away"},
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert logged.status_code == 200
    log_id = logged.get_json()["log_id"]

    forbidden = client.patch(
        f"/api/reports/logs/{log_id}/review",
        json={"is_suspicious": True},
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert forbidden.status_code == 403

    missing_field = client.patch(
        f"/api/reports/logs/{log_id}/review",
        json={},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert missing_field.status_code == 400

    reviewed = client.patch(
        f"/api/reports/logs/{log_id}/review",
        json={"is_suspicious": True},
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert reviewed.status_code == 200
    reviewed_json = reviewed.get_json()
    assert reviewed_json["is_suspicious"] is True
    assert reviewed_json["reviewed_at"]

    report = client.get(
        f"/api/reports/{session_id}",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert report.status_code == 200
    report_log = next(log for log in report.get_json()["report"]["logs"] if log["log_id"] == log_id)
    assert report_log["is_suspicious"] is True
    assert report_log["reviewed_by"] is not None


def test_reports_access_control_and_csv_export(client, app, tmp_path):
    lecturer_token = _register_and_login(client, "L22-03-50001", role="lecturer")
    other_lecturer_token = _register_and_login(client, "L22-03-50002", role="lecturer")
    student_token = _register_and_login(client, "T22-03-50003")
    _complete_student_verification_prerequisites(app, "T22-03-50003", tmp_path)

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
    start_json = start.get_json() or {}
    assert start.status_code == 201, start_json
    assert "session_id" in start_json, f"Session start failed: {start_json}"
    session_id = start_json["session_id"]

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

    export_all = client.get(
        "/api/reports/export",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert export_all.status_code == 200
    assert "text/csv" in export_all.headers.get("Content-Type", "")
    export_all_body = export_all.get_data(as_text=True)
    assert str(session_id) in export_all_body
    assert "CS204" in export_all_body

    export_all_other_lecturer = client.get(
        "/api/reports/export",
        headers={"Authorization": f"Bearer {other_lecturer_token}"},
    )
    assert export_all_other_lecturer.status_code == 200
    assert str(session_id) not in export_all_other_lecturer.get_data(as_text=True)

    export_all_forbidden = client.get(
        "/api/reports/export",
        headers={"Authorization": f"Bearer {student_token}"},
    )
    assert export_all_forbidden.status_code == 403
