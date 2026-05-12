import base64
import io
from pathlib import Path

from app.extensions import db
from app.models import FacialImage, User


def _seed_user_with_face(app, tmp_path: Path):
    with app.app_context():
        user = User(
            full_name="Student Baseline",
            reg_number="T22-03-91001",
            email="baseline.student@example.com",
            password_hash="hash",
            role="student",
        )
        db.session.add(user)
        db.session.flush()

        image_path = tmp_path / "baseline.jpg"
        image_path.write_bytes(b"fake-jpeg-bytes")
        db.session.add(FacialImage(user_id=user.user_id, file_path=str(image_path)))
        db.session.commit()
        return user.user_id


def test_internal_baseline_requires_internal_token(client, app, tmp_path):
    user_id = _seed_user_with_face(app, tmp_path)
    response = client.get(f"/api/images/internal/{user_id}/baseline")
    assert response.status_code == 401


def test_internal_baseline_returns_base64_image(client, app, tmp_path):
    user_id = _seed_user_with_face(app, tmp_path)
    response = client.get(
        f"/api/images/internal/{user_id}/baseline",
        headers={"X-Internal-Token": "test-internal-token"},
    )
    assert response.status_code == 200
    payload = response.get_json()
    assert payload["user_id"] == user_id
    assert payload["source"] == "facial_images"
    assert isinstance(payload["image_base64"], str)
    decoded = base64.b64decode(payload["image_base64"])
    assert decoded == b"fake-jpeg-bytes"


def _login(client, login_id: str, password: str) -> str:
    response = client.post(
        "/api/auth/login",
        json={"login_id": login_id, "password": password},
    )
    assert response.status_code == 200
    return response.get_json()["token"]


def test_admin_can_upload_student_baseline(client, app):
    with app.app_context():
        admin = User(
            full_name="Admin One",
            reg_number="ADM-001",
            email="admin.one@example.com",
            role="admin",
            credential_source="admin_provisioned",
            must_change_password=False,
        )
        admin.set_password("Secret123!")
        student = User(
            full_name="Student One",
            reg_number="T22-03-99999",
            email="student.one@example.com",
            role="student",
        )
        student.set_password("Student123!")
        db.session.add_all([admin, student])
        db.session.commit()
        student_id = student.user_id

    token = _login(client, "ADM-001", "Secret123!")
    response = client.post(
        f"/api/images/{student_id}",
        headers={"Authorization": f"Bearer {token}"},
        data={"image": (io.BytesIO(b"fake-jpg-data"), "baseline.jpg", "image/jpeg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 201
    payload = response.get_json()
    assert payload["message"] == "Baseline image uploaded"

    with app.app_context():
        image = FacialImage.query.filter_by(user_id=student_id).first()
        assert image is not None
        assert Path(image.file_path).exists()


def test_student_cannot_upload_baseline_for_other_student(client, app):
    with app.app_context():
        student_a = User(
            full_name="Student A",
            reg_number="T22-03-10001",
            email="student.a@example.com",
            role="student",
        )
        student_a.set_password("StudentA123!")
        student_b = User(
            full_name="Student B",
            reg_number="T22-03-10002",
            email="student.b@example.com",
            role="student",
        )
        student_b.set_password("StudentB123!")
        db.session.add_all([student_a, student_b])
        db.session.commit()
        student_b_id = student_b.user_id

    token = _login(client, "T22-03-10001", "StudentA123!")
    response = client.post(
        f"/api/images/{student_b_id}",
        headers={"Authorization": f"Bearer {token}"},
        data={"image": (io.BytesIO(b"fake-jpg-data"), "baseline.jpg", "image/jpeg")},
        content_type="multipart/form-data",
    )
    assert response.status_code == 403
