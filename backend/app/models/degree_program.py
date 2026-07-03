from datetime import datetime

from app.extensions import db


class DegreeProgram(db.Model):
    __tablename__ = "degree_programs"

    program_id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
