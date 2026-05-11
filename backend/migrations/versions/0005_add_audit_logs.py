"""add audit logs

Revision ID: 0005_add_audit_logs
Revises: 0004_add_phone_number_to_users
Create Date: 2026-05-10
"""

from alembic import op
import sqlalchemy as sa


revision = "0005_add_audit_logs"
down_revision = "0004_add_phone_number_to_users"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "audit_logs",
        sa.Column("audit_id", sa.Integer(), primary_key=True),
        sa.Column("actor_user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("target_user_id", sa.Integer(), sa.ForeignKey("users.user_id"), nullable=True),
        sa.Column("action", sa.String(length=80), nullable=False),
        sa.Column("metadata", sa.JSON(), nullable=True),
        sa.Column("ip_address", sa.String(length=64), nullable=True),
        sa.Column("user_agent", sa.String(length=255), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("idx_audit_logs_actor", "audit_logs", ["actor_user_id"])
    op.create_index("idx_audit_logs_target", "audit_logs", ["target_user_id"])
    op.create_index("idx_audit_logs_action", "audit_logs", ["action"])
    op.create_index("idx_audit_logs_created_at", "audit_logs", ["created_at"])


def downgrade() -> None:
    op.drop_index("idx_audit_logs_created_at", table_name="audit_logs")
    op.drop_index("idx_audit_logs_action", table_name="audit_logs")
    op.drop_index("idx_audit_logs_target", table_name="audit_logs")
    op.drop_index("idx_audit_logs_actor", table_name="audit_logs")
    op.drop_table("audit_logs")
