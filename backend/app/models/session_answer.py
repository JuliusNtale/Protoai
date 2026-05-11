from datetime import datetime

from app.extensions import db


class SessionAnswer(db.Model):
    __tablename__ = "session_answers"

    answer_id = db.Column(db.Integer, primary_key=True)
    session_id = db.Column(db.Integer, db.ForeignKey("exam_sessions.session_id", ondelete="CASCADE"), nullable=False)
    question_id = db.Column(db.Integer, db.ForeignKey("questions.question_id"), nullable=False)
    selected_answer = db.Column(db.String(20), nullable=False)
    is_correct = db.Column(db.Boolean, nullable=False, default=False)
    answered_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint("session_id", "question_id", name="uq_session_answers_session_question"),)
