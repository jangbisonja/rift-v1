"""add raid and raid_boss tables

Revision ID: b7d2e4f89c31
Revises: a9c3e7f20b41
Create Date: 2026-04-12 00:00:00.000000

"""

from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "b7d2e4f89c31"
down_revision: Union[str, Sequence[str], None] = "a9c3e7f20b41"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL has no IF NOT EXISTS for CREATE TYPE.
    # Use DO/EXCEPTION to make enum creation idempotent.
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE raid_difficulty AS ENUM ('NORMAL', 'HARD', 'TFM', 'NIGHTMARE');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # raid table (must be created before raid_boss due to FK dependency)
    op.create_table(
        "raid",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("min_gear_score", sa.Integer(), nullable=False),
        sa.Column(
            "difficulty",
            postgresql.ENUM(
                "NORMAL", "HARD", "TFM", "NIGHTMARE",
                name="raid_difficulty",
                create_type=False,
            ),
            nullable=False,
        ),
        sa.Column("groups_count", sa.SmallInteger(), nullable=False),
        sa.Column("phases_count", sa.Integer(), nullable=False),
        sa.Column("cover_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="raid_pkey"),
        sa.ForeignKeyConstraint(
            ["cover_media_id"],
            ["media.id"],
            name="raid_cover_media_id_fkey",
            ondelete="SET NULL",
        ),
    )

    # raid_boss table
    op.create_table(
        "raid_boss",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("raid_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phase_number", sa.Integer(), nullable=False),
        sa.Column("icon_media_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.Column(
            "updated_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="raid_boss_pkey"),
        sa.ForeignKeyConstraint(
            ["raid_id"],
            ["raid.id"],
            name="raid_boss_raid_id_fkey",
            ondelete="CASCADE",
        ),
        sa.ForeignKeyConstraint(
            ["icon_media_id"],
            ["media.id"],
            name="raid_boss_icon_media_id_fkey",
            ondelete="SET NULL",
        ),
    )


def downgrade() -> None:
    op.drop_table("raid_boss")
    op.drop_table("raid")
    op.execute("DROP TYPE IF EXISTS raid_difficulty")
