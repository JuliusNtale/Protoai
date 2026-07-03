from datetime import datetime

from app.extensions import db

exam_programs = db.Table(
    "exam_programs",
    db.Column("exam_id", db.Integer, db.ForeignKey("exams.exam_id"), primary_key=True),
    db.Column("program_id", db.Integer, db.ForeignKey("degree_programs.program_id"), primary_key=True),
)


class Exam(db.Model):
    __tablename__ = "exams"

    exam_id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    course_code = db.Column(db.String(30), nullable=False)
    lecturer_id = db.Column(db.Integer, db.ForeignKey("users.user_id"), nullable=False)
    duration_min = db.Column(db.Integer, nullable=False)
    scheduled_at = db.Column(db.DateTime)
    status = db.Column(db.String(20), nullable=False, default="draft")
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    programs = db.relationship("DegreeProgram", secondary=exam_programs, backref="exams")
