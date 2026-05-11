from flask import request

from app.extensions import db
from app.models import AuditLog


def log_audit(action: str, actor_user_id=None, target_user_id=None, metadata=None) -> None:
    entry = AuditLog(
        action=action,
        actor_user_id=actor_user_id,
        target_user_id=target_user_id,
        details=metadata or {},
        ip_address=(request.headers.get("X-Forwarded-For") or request.remote_addr or "")[:64],
        user_agent=(request.user_agent.string or "")[:255],
    )
    db.session.add(entry)
