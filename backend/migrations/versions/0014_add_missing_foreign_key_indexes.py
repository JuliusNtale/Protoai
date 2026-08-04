"""add missing indexes on hot foreign-key columns

Revision ID: 0014_add_missing_foreign_key_indexes
Revises: 0013_add_session_termination_and_log_review
Create Date: 2026-08-04 06:00:00.000000

facial_images.user_id, questions.exam_id and exams.lecturer_id had no
index at all. exam_sessions has a composite unique index on
(student_id, exam_id), which Postgres can use for student_id-only lookups
(leftmost prefix) but not for the exam_id-only lookups several endpoints
do (e.g. list_exam_students) - so exam_id gets its own index too.

facial_images.user_id matters most in practice: it's read on every ~8s
periodic identity recheck for every active session, feeding directly into
the documented "<3s identity verification" latency target.
"""

from alembic import op


revision = "0014_add_missing_foreign_key_indexes"
down_revision = "0013_add_session_termination_and_log_review"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("idx_facial_images_user", "facial_images", ["user_id"])
    op.create_index("idx_questions_exam", "questions", ["exam_id"])
    op.create_index("idx_exams_lecturer", "exams", ["lecturer_id"])
    op.create_index("idx_exam_sessions_exam", "exam_sessions", ["exam_id"])


def downgrade() -> None:
    op.drop_index("idx_exam_sessions_exam", table_name="exam_sessions")
    op.drop_index("idx_exams_lecturer", table_name="exams")
    op.drop_index("idx_questions_exam", table_name="questions")
    op.drop_index("idx_facial_images_user", table_name="facial_images")
