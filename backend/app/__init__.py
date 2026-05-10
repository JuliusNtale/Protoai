import json
import logging
import time
from uuid import uuid4

from flask import Flask
from flask import g
from flask import request
from flask_cors import CORS
from flask_jwt_extended import get_jwt_identity
from flask_jwt_extended import get_jwt
from flask_jwt_extended import verify_jwt_in_request
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.auth.routes import auth_bp
from app.config import Config
from app.exams.routes import exams_bp
from app.extensions import db, jwt, migrate
from app.images.routes import images_bp
from app.reports.routes import reports_bp
from app.sessions.routes import sessions_bp
from app.users.routes import users_bp
from app.models import User


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    logging.basicConfig(level=logging.INFO)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(users_bp, url_prefix="/api/users")
    app.register_blueprint(exams_bp, url_prefix="/api/exams")
    app.register_blueprint(sessions_bp, url_prefix="/api/sessions")
    app.register_blueprint(reports_bp, url_prefix="/api/reports")
    app.register_blueprint(images_bp, url_prefix="/api/images")

    @app.get("/health")
    def health_check():
        return {"status": "ok", "service": "proctoring-backend"}, 200

    @app.before_request
    def ensure_bootstrap_admin():
        if getattr(app, "_bootstrap_checked", False):
            return
        app._bootstrap_checked = True
        try:
            existing_admin = User.query.filter_by(role="admin").first()
            if existing_admin:
                return

            login_id = app.config.get("BOOTSTRAP_ADMIN_USERNAME") or "admin.temp"
            email = app.config.get("BOOTSTRAP_ADMIN_EMAIL") or "admin@udom.ac.tz"
            reg_number = app.config.get("BOOTSTRAP_ADMIN_REG_NUMBER") or "ADM-BOOTSTRAP-001"
            password = app.config.get("BOOTSTRAP_ADMIN_PASSWORD") or "TempAdmin123!"

            if User.query.filter((User.email == email) | (User.username == login_id) | (User.reg_number == reg_number)).first():
                return

            admin = User(
                full_name="System Administrator",
                reg_number=reg_number,
                email=email,
                username=login_id,
                role="admin",
                credential_source="admin_provisioned",
                must_change_password=True,
                is_active=True,
            )
            admin.set_password(password)
            db.session.add(admin)
            db.session.commit()
        except (OperationalError, ProgrammingError):
            db.session.rollback()

    return app
    @app.before_request
    def begin_request_logging():
        g.request_id = request.headers.get("X-Request-Id") or str(uuid4())
        g.request_started = time.perf_counter()

    @app.after_request
    def write_structured_request_log(response):
        duration_ms = None
        started = getattr(g, "request_started", None)
        if started is not None:
            duration_ms = round((time.perf_counter() - started) * 1000, 2)

        user_id = None
        role = None
        try:
            verify_jwt_in_request(optional=True)
            user_id = get_jwt_identity()
            role = (get_jwt() or {}).get("role")
        except Exception:
            user_id = None

        log_payload = {
            "event": "http_request",
            "request_id": getattr(g, "request_id", None),
            "method": request.method,
            "path": request.path,
            "status_code": response.status_code,
            "latency_ms": duration_ms,
            "user_id": user_id,
            "role": role,
            "ip": (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip(),
        }
        app.logger.info(json.dumps(log_payload))
        response.headers["X-Request-Id"] = str(getattr(g, "request_id", ""))
        return response
