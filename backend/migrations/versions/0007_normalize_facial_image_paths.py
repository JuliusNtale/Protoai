"""normalize facial image file paths

Revision ID: 0007_normalize_facial_image_paths
Revises: 0006_add_session_verification_evidence
Create Date: 2026-05-13
"""

from alembic import op


revision = "0007_normalize_facial_image_paths"
down_revision = "0006_add_session_verification_evidence"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Normalize legacy relative and slash-variant paths to /app/storage/faces/*.
    op.execute(
        """
        UPDATE facial_images
        SET file_path =
            CASE
                WHEN normalized_path LIKE '/app/storage/faces/%' THEN normalized_path
                WHEN normalized_path LIKE 'storage/faces/%' THEN '/app/' || normalized_path
                WHEN normalized_path LIKE './storage/faces/%' THEN '/app/' || substr(normalized_path, 3)
                WHEN normalized_path LIKE '/storage/faces/%' THEN '/app' || normalized_path
                ELSE normalized_path
            END
        FROM (
            SELECT image_id, replace(file_path, '\\', '/') AS normalized_path
            FROM facial_images
            WHERE file_path IS NOT NULL
        ) paths
        WHERE facial_images.image_id = paths.image_id
        """
    )


def downgrade() -> None:
    # Non-reversible data normalization.
    pass

