from datetime import datetime

from app.extensions import db


class FacialImage(db.Model):
    __tablename__ = "facial_images"

    image_id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    file_path = db.Column(db.String(300), nullable=False)
    embedding = db.Column(db.LargeBinary)
    captured_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
