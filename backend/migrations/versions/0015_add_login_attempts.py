"""add login_attempts table for a shared, DB-backed brute-force guard

Revision ID: 0015_add_login_attempts
Revises: 0014_add_missing_foreign_key_indexes
Create Date: 2026-08-04 06:05:00.000000

Replaces the in-process _LOGIN_ATTEMPTS dict in app/auth/routes.py, which
gave every gunicorn worker (production runs --workers 2) its own
independent view of failed attempts - an attacker's requests get
distributed across processes that don't share a lockout, and the dict
itself grew without bound since nothing ever swept old entries.
"""

from alembic import op
import sqlalchemy as sa


revision = "0015_add_login_attempts"
down_revision = "0014_add_missing_foreign_key_indexes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "login_attempts",
        sa.Column("attempt_key", sa.String(length=320), primary_key=True),
        sa.Column("failed_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("lockout_until", sa.DateTime(), nullable=True),
        sa.Column("last_attempt_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )


def downgrade() -> None:
    op.drop_table("login_attempts")
