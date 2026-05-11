from datetime import datetime

from app.extensions import db


class BehavioralLog(db.Model):
    __tablename__ = "behavioral_logs"

    log_id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("exam_sessions.session_id", ondelete="CASCADE"), nullable=False)
    event_type = db.Column(db.String(50), nullable=False)
    event_data = db.Column(db.JSON)
    logged_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
