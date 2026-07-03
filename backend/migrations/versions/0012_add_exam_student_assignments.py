"""add exam student assignments for manual per-student exam access overrides

Revision ID: 0012_add_exam_student_assignments
Revises: 0011_add_degree_programs
Create Date: 2026-07-03 00:10:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0012_add_exam_student_assignments"
down_revision = "0011_add_degree_programs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "exam_student_assignments",
        sa.Column("assignment_id", sa.Integer(), primary_key=True),
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.exam_id", ondelete="CASCADE"), nullable=False),
        sa.Column("student_id", sa.Integer(), sa.ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False),
        sa.Column("added_by", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("exam_id", "student_id", name="uq_exam_student_assignment"),
    )


def downgrade() -> None:
    op.drop_table("exam_student_assignments")
