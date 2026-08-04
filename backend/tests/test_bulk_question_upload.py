import io

from app.extensions import db
from app.models import User


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


def _confirm_lecturer(app, reg_number: str):
    with app.app_context():
        lecturer = User.query.filter_by(reg_number=reg_number).first()
        lecturer.phone_number = "+255711111111"
        lecturer.department = "School of Computing"
        lecturer.lecturer_profile_confirmed = True
        db.session.commit()


def _create_exam(client, token):
    res = client.post(
        "/api/exams",
        json={"title": "Databases", "course_code": "CS302", "duration_min": 90, "program_ids": [1]},
        headers={"Authorization": f"Bearer {token}"},
    )
    return res.get_json()["exam_id"]


def _upload_csv(client, token, exam_id, csv_text, filename="questions.csv"):
    return client.post(
        f"/api/exams/{exam_id}/questions/bulk",
        data={"file": (io.BytesIO(csv_text.encode("utf-8")), filename)},
        headers={"Authorization": f"Bearer {token}"},
        content_type="multipart/form-data",
    )


def test_download_template_has_expected_columns(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50001", role="lecturer")
    _confirm_lecturer(app, "L22-03-50001")

    res = client.get(
        "/api/exams/questions/template",
        headers={"Authorization": f"Bearer {lecturer_token}"},
    )
    assert res.status_code == 200
    assert res.mimetype == "text/csv"
    body = res.get_data(as_text=True).lstrip("﻿")
    header = body.splitlines()[0]
    assert header == "question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks"


def test_bulk_upload_creates_questions_from_template_shaped_csv(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50002", role="lecturer")
    _confirm_lecturer(app, "L22-03-50002")
    exam_id = _create_exam(client, lecturer_token)

    csv_text = (
        "question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks\n"
        "What is 2 + 2?,mcq,3,4,5,6,B,1\n"
        "The Earth orbits the Sun.,true_false,,,,,TRUE,2\n"
    )
    res = _upload_csv(client, lecturer_token, exam_id, csv_text)
    payload = res.get_json()
    assert res.status_code == 201, payload
    assert payload["created_count"] == 2
    assert payload["skipped_count"] == 0

    listing = client.get(f"/api/exams/{exam_id}", headers={"Authorization": f"Bearer {lecturer_token}"})
    questions = listing.get_json()["questions"]
    assert len(questions) == 2
    assert {q["order_num"] for q in questions} == {1, 2}
    assert questions[1]["marks"] == 2


def test_bulk_upload_rejects_csv_missing_required_columns(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50003", role="lecturer")
    _confirm_lecturer(app, "L22-03-50003")
    exam_id = _create_exam(client, lecturer_token)

    csv_text = "question_text,marks\nWhat is 2 + 2?,1\n"
    res = _upload_csv(client, lecturer_token, exam_id, csv_text)
    payload = res.get_json()
    assert res.status_code == 400
    assert "question_type" in payload["error"]["message"]
    assert "correct_answer" in payload["error"]["message"]


def test_bulk_upload_skips_invalid_rows_but_keeps_valid_ones(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50004", role="lecturer")
    _confirm_lecturer(app, "L22-03-50004")
    exam_id = _create_exam(client, lecturer_token)

    csv_text = (
        "question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks\n"
        "Valid question,mcq,3,4,5,6,B,1\n"
        ",mcq,3,4,5,6,B,1\n"
        "Bad type question,essay,,,,,X,1\n"
        "No answer question,mcq,3,4,5,6,,1\n"
    )
    res = _upload_csv(client, lecturer_token, exam_id, csv_text)
    payload = res.get_json()
    assert res.status_code == 201, payload
    assert payload["created_count"] == 1
    assert payload["skipped_count"] == 3
    assert len(payload["row_errors"]) == 3


def test_bulk_upload_rejects_non_csv_file(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50005", role="lecturer")
    _confirm_lecturer(app, "L22-03-50005")
    exam_id = _create_exam(client, lecturer_token)

    res = _upload_csv(client, lecturer_token, exam_id, "not,a,csv", filename="questions.txt")
    assert res.status_code == 400


def test_bulk_upload_rejects_unconfirmed_lecturer(client, app):
    lecturer_token = _register_and_login(client, "L22-03-50006", role="lecturer")
    # Create the exam as a confirmed admin-equivalent flow is unavailable here,
    # so exercise the guard directly against another lecturer's unconfirmed profile.
    other_lecturer_token = _register_and_login(client, "L22-03-50007", role="lecturer")
    _confirm_lecturer(app, "L22-03-50007")
    exam_id = _create_exam(client, other_lecturer_token)

    csv_text = (
        "question_text,question_type,option_a,option_b,option_c,option_d,correct_answer,marks\n"
        "What is 2 + 2?,mcq,3,4,5,6,B,1\n"
    )
    res = _upload_csv(client, lecturer_token, exam_id, csv_text)
    assert res.status_code == 403
