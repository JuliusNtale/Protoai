"""user credentials policy fields

Revision ID: 0003_user_credentials_policy
Revises: 0002_add_session_answers
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0003_user_credentials_policy"
down_revision = "0002_add_session_answers"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=80), nullable=True))
    op.add_column("users", sa.Column("credential_source", sa.String(length=30), nullable=False, server_default="self_register"))
    op.add_column("users", sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.create_unique_constraint("uq_users_username", "users", ["username"])


def downgrade() -> None:
    op.drop_constraint("uq_users_username", "users", type_="unique")
    op.drop_column("users", "must_change_password")
    op.drop_column("users", "credential_source")
    op.drop_column("users", "username")
