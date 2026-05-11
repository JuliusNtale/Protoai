from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from app.extensions import db


class User(db.Model):
    __tablename__ = "users"

    user_id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(100), nullable=False)
    reg_number = db.Column(db.String(20), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    phone_number = db.Column(db.String(30))
    department = db.Column(db.String(100))
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(20), nullable=False, default="student")
    username = db.Column(db.String(80), unique=True)
    credential_source = db.Column(db.String(30), nullable=False, default="self_register")
    must_change_password = db.Column(db.Boolean, nullable=False, default=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    is_active = db.Column(db.Boolean, nullable=False, default=True)

    def set_password(self, password: str) -> None:
        self.password_hash = generate_password_hash(password)

    def verify_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_auth_user(self) -> dict:
        role_value = "administrator" if self.role == "admin" else self.role
        return {
            "user_id": self.user_id,
            "full_name": self.full_name,
            "name": self.full_name,
            "registration_number": self.reg_number,
            "username": self.username,
            "must_change_password": self.must_change_password,
            "email": self.email,
            "phone_number": self.phone_number,
            "role": role_value,
        }
