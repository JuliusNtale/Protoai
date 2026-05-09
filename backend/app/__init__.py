from flask import Flask
from flask_cors import CORS

from app.auth.routes import auth_bp
from app.config import Config
from app.extensions import db, jwt, migrate


def create_app() -> Flask:
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/api/*": {"origins": "*"}})

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api/auth")

    @app.get("/health")
    def health_check():
        return {"status": "ok", "service": "proctoring-backend"}, 200

    return app
