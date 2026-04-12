"""Add display_id to public_user

Revision ID: a9c3e7f20b41
Revises: f1a2b3c4d5e6
Create Date: 2026-04-11

"""

from alembic import op

revision = "a9c3e7f20b41"
down_revision = "f1a2b3c4d5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # SERIAL auto-creates a sequence + DEFAULT nextval() + NOT NULL.
    # PostgreSQL evaluates the DEFAULT for each existing row on ADD COLUMN,
    # so existing rows get unique sequential values automatically.
    op.execute("ALTER TABLE public_user ADD COLUMN display_id SERIAL")
    op.create_unique_constraint(
        "uq_public_user_display_id", "public_user", ["display_id"]
    )


def downgrade() -> None:
    op.drop_constraint("uq_public_user_display_id", "public_user", type_="unique")
    op.drop_column("public_user", "display_id")
    # PostgreSQL auto-drops the sequence when the SERIAL column is dropped
