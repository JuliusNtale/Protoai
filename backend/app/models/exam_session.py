from datetime import datetime

from app.extensions import db


class ExamSession(db.Model):
    __tablename__ = "exam_sessions"

    session_id = db.Column(db.Integer, primary_key=True)
    student_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.exam_id"), nullable=False)
    started_at = db.Column(db.DateTime, default=datetime.utcnow)
    submitted_at = db.Column(db.DateTime)
    session_status = db.Column(db.String(20), nullable=False, default="pending")
    identity_verified = db.Column(db.Boolean, nullable=False, default=False)
    warning_count = db.Column(db.Integer, nullable=False, default=0)
    score = db.Column(db.Numeric(5, 2))

    __table_args__ = (db.UniqueConstraint("student_id", "exam_id", name="uq_exam_sessions_student_exam"),)
