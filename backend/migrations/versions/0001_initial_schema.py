"""initial schema

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-05-09
"""

from alembic import op
import sqlalchemy as sa


revision = "0001_initial_schema"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer(), primary_key=True),
        sa.Column("full_name", sa.String(length=100), nullable=False),
        sa.Column("reg_number", sa.String(length=20), nullable=False, unique=True),
        sa.Column("email", sa.String(length=150), nullable=False, unique=True),
        sa.Column("department", sa.String(length=100), nullable=True),
        sa.Column("password_hash", sa.String(length=255), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False, server_default="student"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )

    op.create_table(
        "facial_images",
        sa.Column("image_id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("file_path", sa.String(length=300), nullable=False),
        sa.Column("embedding", sa.LargeBinary(), nullable=True),
        sa.Column("captured_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "exams",
        sa.Column("exam_id", sa.Integer(), primary_key=True),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("course_code", sa.String(length=30), nullable=False),
        sa.Column("lecturer_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("duration_min", sa.Integer(), nullable=False),
        sa.Column("scheduled_at", sa.DateTime(), nullable=True),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="draft"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "questions",
        sa.Column("question_id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.exam_id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("question_type", sa.String(length=20), nullable=False),
        sa.Column("option_a", sa.Text(), nullable=True),
        sa.Column("option_b", sa.Text(), nullable=True),
        sa.Column("option_c", sa.Text(), nullable=True),
        sa.Column("option_d", sa.Text(), nullable=True),
        sa.Column("correct_answer", sa.String(length=5), nullable=False),
        sa.Column("marks", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("order_num", sa.Integer(), nullable=False, server_default="0"),
    )

    op.create_table(
        "exam_sessions",
        sa.Column("session_id", sa.Integer(), primary_key=True),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.exam_id"), nullable=False),
        sa.Column("started_at", sa.DateTime(), nullable=True),
        sa.Column("submitted_at", sa.DateTime(), nullable=True),
        sa.Column("session_status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("identity_verified", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("warning_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("score", sa.Numeric(5, 2), nullable=True),
        sa.UniqueConstraint("student_id", "exam_id", name="uq_exam_sessions_student_exam"),
    )

    op.create_table(
        "behavioral_logs",
        sa.Column("log_id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.session_id", ondelete="CASCADE"), nullable=False),
        sa.Column("event_type", sa.String(length=50), nullable=False),
        sa.Column("event_data", sa.JSON(), nullable=True),
        sa.Column("logged_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_behavioral_logs_session", "behavioral_logs", ["session_id"])
    op.create_index("idx_behavioral_logs_type", "behavioral_logs", ["event_type"])

    op.create_table(
        "reports",
        sa.Column("report_id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.session_id"), nullable=False, unique=True),
        sa.Column("gaze_away_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("head_turned_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("tab_switch_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("face_absent_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("multiple_faces_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("total_anomalies", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("risk_level", sa.String(length=10), nullable=False),
        sa.Column("generated_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("reports")
    op.drop_index("idx_behavioral_logs_type", table_name="behavioral_logs")
    op.drop_index("idx_behavioral_logs_session", table_name="behavioral_logs")
    op.drop_table("behavioral_logs")
    op.drop_table("exam_sessions")
    op.drop_table("questions")
    op.drop_table("exams")
    op.drop_table("facial_images")
    op.drop_table("users")
