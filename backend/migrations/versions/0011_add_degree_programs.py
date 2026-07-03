"""add degree programs table and exam-program assignment

Revision ID: 0011_add_degree_programs
Revises: 0010_add_lecturer_profile_confirmed
Create Date: 2026-07-03 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "0011_add_degree_programs"
down_revision = "0010_add_lecturer_profile_confirmed"
branch_labels = None
depends_on = None

DEGREE_PROGRAM_NAMES = [
    "Bachelor of Science in Information Technology with Business Analytics",
    "Bachelor of Science in Instructional Design and Information Technology (BSc IDIT)",
    "Bachelor of Science in Multimedia Technology and Animation",
    "Bachelor of Science in Computer Networks and Information Security Engineering (BSc CNISE)",
    "Bachelor of Science in Computer Engineering (BSc CE)",
    "Bachelor of Science in Computer Science (BSc CS)",
    "Bachelor of Science in Software Engineering (BSc SE)",
    "Bachelor of Science in Cyber Security and Digital Forensics Engineering (BSc CSDFE)",
    "Bachelor of Science in Business Information Systems (BSc BIS)",
    "Bachelor of Science in Multimedia Technology and Animation (BSc MTA)",
    "Bachelor of Science in Telecommunication Engineering (BSc TE)",
    "Bachelor of Science in Digital Content and Broadcasting Engineering (BSc DCBE)",
    "Bachelor of Science in Information Systems (BSc IS)",
    "Diploma in Cyber Security and Digital Forensics (Dip. CSDF)",
    "Diploma in Educational Technology (Dip. ET)",
    "Diploma in Information and Communication Technology (Dip. ICT)",
]


def upgrade() -> None:
    op.create_table(
        "degree_programs",
        sa.Column("program_id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(length=150), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")),
    )

    op.create_table(
        "exam_programs",
        sa.Column("exam_id", sa.Integer(), sa.ForeignKey("exams.exam_id", ondelete="CASCADE"), primary_key=True),
        sa.Column(
            "program_id",
            sa.Integer(),
            sa.ForeignKey("degree_programs.program_id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )

    degree_programs_table = sa.table(
        "degree_programs",
        sa.column("name", sa.String),
    )
    op.bulk_insert(degree_programs_table, [{"name": name} for name in DEGREE_PROGRAM_NAMES])


def downgrade() -> None:
    op.drop_table("exam_programs")
    op.drop_table("degree_programs")
