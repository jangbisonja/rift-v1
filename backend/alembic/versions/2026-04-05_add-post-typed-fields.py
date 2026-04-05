"""add start_date, end_date, promo_code to post

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-04-05 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6a7b8'
down_revision: Union[str, Sequence[str], None] = 'b2c3d4e5f6a7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('post', sa.Column('start_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('post', sa.Column('end_date', sa.DateTime(timezone=True), nullable=True))
    op.add_column('post', sa.Column('promo_code', sa.String(100), nullable=True))


def downgrade() -> None:
    op.drop_column('post', 'promo_code')
    op.drop_column('post', 'end_date')
    op.drop_column('post', 'start_date')
