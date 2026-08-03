import os
from datetime import timedelta


class Config:
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "postgresql://proctoring_user:proctoring_pass@localhost:15432/proctoring_db",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.getenv("JWT_SECRET", "change-this-in-production-256-bit-secret")
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv("JWT_EXPIRY_HOURS", "8")))
    ALLOW_PUBLIC_REGISTRATION = os.getenv("ALLOW_PUBLIC_REGISTRATION", "false").lower() == "true"
    BOOTSTRAP_ADMIN_USERNAME = os.getenv("BOOTSTRAP_ADMIN_USERNAME", "admin.temp")
    BOOTSTRAP_ADMIN_EMAIL = os.getenv("BOOTSTRAP_ADMIN_EMAIL", "admin@udom.ac.tz")
    BOOTSTRAP_ADMIN_REG_NUMBER = os.getenv("BOOTSTRAP_ADMIN_REG_NUMBER", "ADM-BOOTSTRAP-001")
    BOOTSTRAP_ADMIN_PASSWORD = os.getenv("BOOTSTRAP_ADMIN_PASSWORD", "TempAdmin123!")

    # Exam Lab dev-only bootstrap endpoints (app/devtools/routes.py). Requires
    # BOTH flags so a stray ENABLE_DEV_TOOLS=true can't light this up outside
    # local development - the blueprint is only registered at all when this
    # is true (see create_app()).
    ENABLE_DEV_TOOLS = (
        os.getenv("ENABLE_DEV_TOOLS", "false").strip().lower() == "true"
        and os.getenv("FLASK_ENV", "production").strip().lower() == "development"
    )
