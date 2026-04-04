"""add cover_media_id to post

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-04-04 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6a7'
down_revision: Union[str, Sequence[str], None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('post', sa.Column('cover_media_id', postgresql.UUID(as_uuid=True), nullable=True))
    op.create_foreign_key(
        'post_cover_media_id_fkey',
        'post', 'media',
        ['cover_media_id'], ['id'],
        ondelete='SET NULL',
    )


def downgrade() -> None:
    op.drop_constraint('post_cover_media_id_fkey', 'post', type_='foreignkey')
    op.drop_column('post', 'cover_media_id')
