"""add student onboarding profile fields

Revision ID: 0008_add_student_profile_onboarding_fields
Revises: 0007_normalize_facial_image_paths
Create Date: 2026-05-18
"""

from alembic import op
import sqlalchemy as sa


revision = "0008_add_student_profile_onboarding_fields"
down_revision = "0007_normalize_facial_image_paths"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("academic_year", sa.String(length=30), nullable=True))
    op.add_column("users", sa.Column("year_enrolled", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "year_enrolled")
    op.drop_column("users", "academic_year")

