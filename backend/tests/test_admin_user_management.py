from app.extensions import db
from app.models import DegreeProgram, User


def _admin_token(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "System Admin",
            "registration_number": "A22-00-10001",
            "password": "AdminPass123",
            "role": "admin",
        },
    )
    login = client.post(
        "/api/auth/login",
        json={"login_id": "A22-00-10001", "password": "AdminPass123"},
    )
    return login.get_json()["token"]


def test_admin_can_update_student_profile_details(client, app):
    with app.app_context():
        db.session.add(DegreeProgram(name="BSc Software Engineering"))
        db.session.commit()

    token = _admin_token(client)
    provision = client.post(
        "/api/auth/provision-credentials",
        json={
            "role": "student",
            "full_name": "Original Student",
            "registration_number": "T22-03-50001",
            "email": "original.student@example.test",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    assert provision.status_code == 201
    user_id = provision.get_json()["user"]["user_id"]

    updated = client.put(
        f"/api/users/{user_id}",
        json={
            "full_name": "Updated Student",
            "registration_number": "T22-03-50099",
            "username": "",
            "email": "updated.student@example.test",
            "phone_number": "+255700123456",
            "department": "BSc Software Engineering",
            "academic_year": "Year 4",
            "year_enrolled": 2022,
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert updated.status_code == 200, updated.get_json()
    body = updated.get_json()
    assert body["user"]["full_name"] == "Updated Student"
    assert body["user"]["registration_number"] == "T22-03-50099"
    assert body["user"]["department"] == "BSc Software Engineering"
    assert body["user"]["academic_year"] == "Year 4"
    assert body["user"]["year_enrolled"] == 2022

    with app.app_context():
        stored = db.session.get(User, user_id)
        assert stored.email == "updated.student@example.test"
        assert stored.phone_number == "+255700123456"


def test_admin_user_update_rejects_invalid_student_degree_program(client):
    token = _admin_token(client)
    provision = client.post(
        "/api/auth/provision-credentials",
        json={
            "role": "student",
            "full_name": "Program Student",
            "registration_number": "T22-03-50101",
            "email": "program.student@example.test",
        },
        headers={"Authorization": f"Bearer {token}"},
    )
    user_id = provision.get_json()["user"]["user_id"]

    updated = client.put(
        f"/api/users/{user_id}",
        json={
            "full_name": "Program Student",
            "registration_number": "T22-03-50101",
            "email": "program.student@example.test",
            "department": "Imaginary Program",
        },
        headers={"Authorization": f"Bearer {token}"},
    )

    assert updated.status_code == 400
    assert updated.get_json()["error"]["message"] == "Selected degree program is invalid"
