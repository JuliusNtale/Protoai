"""add lecturer profile confirmation flag

Revision ID: 0010_add_lecturer_profile_confirmed
Revises: 0009_add_student_profile_confirmed
Create Date: 2026-05-21 13:45:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0010_add_lecturer_profile_confirmed"
down_revision = "0009_add_student_profile_confirmed"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("lecturer_profile_confirmed", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade() -> None:
    op.drop_column("users", "lecturer_profile_confirmed")
