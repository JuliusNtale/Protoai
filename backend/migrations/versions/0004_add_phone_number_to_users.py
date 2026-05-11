"""add phone number to users

Revision ID: 0004_add_phone_number_to_users
Revises: 0003_user_credentials_policy
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0004_add_phone_number_to_users"
down_revision = "0003_user_credentials_policy"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("phone_number", sa.String(length=30), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "phone_number")
