"""add student profile confirmed flag

Revision ID: 0009_add_student_profile_confirmed
Revises: 0008_add_student_profile_onboarding_fields
Create Date: 2026-05-21 13:20:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0009_add_student_profile_confirmed"
down_revision = "0008_add_student_profile_onboarding_fields"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("student_profile_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "student_profile_confirmed")
