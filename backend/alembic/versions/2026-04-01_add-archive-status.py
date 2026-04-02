"""add archive status

Revision ID: a1b2c3d4e5f6
Revises: f549effb3418
Create Date: 2026-04-01 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, Sequence[str], None] = 'f549effb3418'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE poststatus ADD VALUE IF NOT EXISTS 'ARCHIVE'")


def downgrade() -> None:
    # PostgreSQL does not support removing enum values; downgrade is a no-op.
    # To fully revert, recreate the enum without ARCHIVE and update the column.
    pass
