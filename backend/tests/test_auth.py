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
