from datetime import datetime

from app.extensions import db


class LoginAttempt(db.Model):
    """Shared, DB-backed brute-force guard for /auth/login.

    Replaces an in-process dict that gave every gunicorn worker its own
    independent view of failed attempts - under multiple workers, an
    attacker's requests get distributed across processes that don't know
    about each other's lockouts, roughly doubling (per extra worker) the
    attempts available before a lockout actually blocks every worker.
    """

    __tablename__ = "login_attempts"

    attempt_key = db.Column(db.String(320), primary_key=True)
    failed_count = db.Column(db.Integer, nullable=False, default=0)
    lockout_until = db.Column(db.DateTime, nullable=True)
    last_attempt_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
