from datetime import datetime

from app.extensions import db


class ExamStudentAssignment(db.Model):
    __tablename__ = "exam_student_assignments"

    assignment_id = db.Column(db.Integer, primary_key=True)
    exam_id = db.Column(db.Integer, db.ForeignKey("exams.exam_id"), nullable=False)
    student_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    added_by = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        db.UniqueConstraint("exam_id", "student_id", name="uq_exam_student_assignment"),
    )
