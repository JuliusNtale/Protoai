"""add session termination fields and behavioral log review decision

Revision ID: 0013_add_session_termination_and_log_review
Revises: 0012_add_exam_student_assignments
Create Date: 2026-07-03 00:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0013_add_session_termination_and_log_review"
down_revision = "0012_add_exam_student_assignments"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("exam_sessions", sa.Column("termination_reason", sa.String(length=255), nullable=True))
    op.add_column(
        "exam_sessions",
        sa.Column("terminated_by", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True),
    )
    op.add_column("behavioral_logs", sa.Column("is_suspicious", sa.Boolean(), nullable=True))
    op.add_column(
        "behavioral_logs",
        sa.Column("reviewed_by", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True),
    )
    op.add_column("behavioral_logs", sa.Column("reviewed_at", sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column("behavioral_logs", "reviewed_at")
    op.drop_column("behavioral_logs", "reviewed_by")
    op.drop_column("behavioral_logs", "is_suspicious")
    op.drop_column("exam_sessions", "terminated_by")
    op.drop_column("exam_sessions", "termination_reason")
