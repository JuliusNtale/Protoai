def test_register_and_login_success(client):
    register_payload = {
        "name": "Jane Doe",
        "registration_number": "T22-03-11111",
        "password": "Password123",
    }
    register = client.post("/api/auth/register", json=register_payload)
    assert register.status_code == 201
    body = register.get_json()
    assert body["message"] == "Registration successful"
    assert body["token"]
    assert body["user"]["registration_number"] == "T22-03-11111"

    login = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-11111", "password": "Password123"},
    )
    assert login.status_code == 200
    login_body = login.get_json()
    assert login_body["token"]
    assert login_body["user"]["name"] == "Jane Doe"


def test_change_password_flow(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "John Doe",
            "registration_number": "T22-03-22222",
            "password": "OldPassword123",
        },
    )
    login = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-22222", "password": "OldPassword123"},
    )
    token = login.get_json()["token"]

    change = client.put(
        "/api/auth/change-password",
        json={"current_password": "OldPassword123", "new_password": "NewPassword123"},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert change.status_code == 200

    relogin_old = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-22222", "password": "OldPassword123"},
    )
    assert relogin_old.status_code == 401

    relogin_new = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-22222", "password": "NewPassword123"},
    )
    assert relogin_new.status_code == 200


def test_admin_provisions_instructor_credentials(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "System Admin",
            "registration_number": "A22-00-00001",
            "password": "AdminPass123",
            "role": "admin",
        },
    )
    admin_login = client.post(
        "/api/auth/login",
        json={"login_id": "A22-00-00001", "password": "AdminPass123"},
    )
    admin_token = admin_login.get_json()["token"]

    provision = client.post(
        "/api/auth/provision-credentials",
        json={
            "role": "lecturer",
            "full_name": "Lecturer Jane",
            "registration_number": "L22-03-90001",
            "email": "lecturer.jane@udom.ac.tz",
            "username": "lecturer.jane",
        },
        headers={"Authorization": f"Bearer {admin_token}"},
    )
    assert provision.status_code == 201
    body = provision.get_json()
    assert body["temporary_password"]
    assert body["login_id"] == "lecturer.jane"
    assert body["user"]["must_change_password"] is False

    lecturer_login = client.post(
        "/api/auth/login",
        json={"login_id": "lecturer.jane", "password": body["temporary_password"]},
    )
    assert lecturer_login.status_code == 200


def test_login_bruteforce_lockout(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Lockout Target",
            "registration_number": "T22-03-33333",
            "password": "CorrectPassword123",
        },
    )

    for _ in range(5):
        failed = client.post(
            "/api/auth/login",
            json={"registration_number": "T22-03-33333", "password": "WrongPassword123"},
        )
        assert failed.status_code == 401

    locked = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-33333", "password": "CorrectPassword123"},
    )
    assert locked.status_code == 429
    payload = locked.get_json()
    assert "Too many failed attempts" in payload["error"]["message"]


def test_login_bruteforce_lockout_shared_across_requests(client, app):
    """The lockout must be visible from a second, independent request context
    (e.g. a different gunicorn worker in production) - not just reachable
    because a Python module still holds the state in memory. Directly
    exercises the DB-backed LoginAttempt row rather than trusting in-process
    state, since that in-process trust is exactly what broke this guard
    under multiple workers before."""
    from app.extensions import db
    from app.models import LoginAttempt

    client.post(
        "/api/auth/register",
        json={
            "name": "Lockout Target 2",
            "registration_number": "T22-03-33334",
            "password": "CorrectPassword123",
        },
    )
    for _ in range(5):
        client.post(
            "/api/auth/login",
            json={"registration_number": "T22-03-33334", "password": "WrongPassword123"},
        )

    with app.app_context():
        rows = LoginAttempt.query.all()
        assert len(rows) == 1
        assert rows[0].failed_count == 5
        assert rows[0].lockout_until is not None

    locked = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-33334", "password": "CorrectPassword123"},
    )
    assert locked.status_code == 429


def test_login_success_clears_attempt_row(client):
    client.post(
        "/api/auth/register",
        json={
            "name": "Clears Attempts",
            "registration_number": "T22-03-33335",
            "password": "CorrectPassword123",
        },
    )
    client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-33335", "password": "WrongPassword123"},
    )
    ok = client.post(
        "/api/auth/login",
        json={"registration_number": "T22-03-33335", "password": "CorrectPassword123"},
    )
    assert ok.status_code == 200

    from app.models import LoginAttempt

    assert LoginAttempt.query.count() == 0
