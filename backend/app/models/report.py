from datetime import datetime

from app.extensions import db


class Report(db.Model):
    __tablename__ = "reports"

    report_id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("exam_sessions.session_id"), unique=True, nullable=False)
    gaze_away_count = db.Column(db.Integer, nullable=False, default=0)
    head_turned_count = db.Column(db.Integer, nullable=False, default=0)
    tab_switch_count = db.Column(db.Integer, nullable=False, default=0)
    face_absent_count = db.Column(db.Integer, nullable=False, default=0)
    multiple_faces_count = db.Column(db.Integer, nullable=False, default=0)
    total_anomalies = db.Column(db.Integer, nullable=False, default=0)
    risk_level = db.Column(db.String(10), nullable=False)
    generated_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
