"""add timer_schedule table

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-04-08 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op


# revision identifiers, used by Alembic.
revision: str = 'e5f6a7b8c9d0'
down_revision: Union[str, Sequence[str], None] = 'd4e5f6a7b8c9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'timer_schedule',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column(
            'timer_type',
            sa.Enum('WORLD_BOSS', 'RIFT', name='timertype'),
            nullable=False,
        ),
        sa.Column('day_of_week', sa.SmallInteger(), nullable=False),
        sa.Column(
            'is_active',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
        sa.PrimaryKeyConstraint('id', name='timer_schedule_pkey'),
        sa.UniqueConstraint(
            'timer_type', 'day_of_week', name='timer_schedule_timer_type_key'
        ),
    )


def downgrade() -> None:
    op.drop_table('timer_schedule')
    op.execute("DROP TYPE IF EXISTS timertype")
