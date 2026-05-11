"""add session answers table

Revision ID: 0002_add_session_answers
Revises: 0001_initial_schema
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0002_add_session_answers"
down_revision = "0001_initial_schema"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "session_answers",
        sa.Column("answer_id", sa.Integer(), primary_key=True),
        sa.Column("session_id", sa.Integer(), sa.ForeignKey("exam_sessions.session_id", ondelete="CASCADE"), nullable=False),
        sa.Column("question_id", sa.Integer(), sa.ForeignKey("questions.question_id"), nullable=False),
        sa.Column("selected_answer", sa.String(length=20), nullable=False),
        sa.Column("is_correct", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("answered_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("session_id", "question_id", name="uq_session_answers_session_question"),
    )
    op.create_index("idx_session_answers_session", "session_answers", ["session_id"])
    op.create_index("idx_session_answers_question", "session_answers", ["question_id"])


def downgrade() -> None:
    op.drop_index("idx_session_answers_question", table_name="session_answers")
    op.drop_index("idx_session_answers_session", table_name="session_answers")
    op.drop_table("session_answers")
