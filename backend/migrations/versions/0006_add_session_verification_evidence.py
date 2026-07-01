"""add session verification evidence fields

Revision ID: 0006_add_session_verification_evidence
Revises: 0005_add_audit_logs
Create Date: 2026-05-12
"""

from alembic import op
import sqlalchemy as sa


revision = "0006_add_session_verification_evidence"
down_revision = "0005_add_audit_logs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "alembic_version",
        "version_num",
        existing_type=sa.String(length=32),
        type_=sa.String(length=128),
        existing_nullable=False,
    )
    op.add_column("exam_sessions", sa.Column("verification_score", sa.Float(), nullable=True))
    op.add_column("exam_sessions", sa.Column("verified_at", sa.DateTime(), nullable=True))
    op.add_column("exam_sessions", sa.Column("verification_method", sa.String(length=50), nullable=True))
    op.add_column("exam_sessions", sa.Column("verification_details", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("exam_sessions", "verification_details")
    op.drop_column("exam_sessions", "verification_method")
    op.drop_column("exam_sessions", "verified_at")
    op.drop_column("exam_sessions", "verification_score")
