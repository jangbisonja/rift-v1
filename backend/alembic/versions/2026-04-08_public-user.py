"""add public_user, public_oauth_account, prohibited_nickname tables

Revision ID: f1a2b3c4d5e6
Revises: e5f6a7b8c9d0
Create Date: 2026-04-08 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # PostgreSQL has no IF NOT EXISTS for CREATE TYPE.
    # Use DO/EXCEPTION to make enum creation idempotent.
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE nicknamescript AS ENUM ('CYRILLIC', 'LATIN');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)
    op.execute("""
        DO $$ BEGIN
            CREATE TYPE userbadge AS ENUM ('VERIFIED', 'FOUNDER');
        EXCEPTION WHEN duplicate_object THEN null;
        END $$;
    """)

    # public_user table
    op.create_table(
        "public_user",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("discord_id", sa.String(32), nullable=False),
        sa.Column("discord_username", sa.String(64), nullable=False),
        sa.Column("nickname", sa.String(24), nullable=True),
        sa.Column("nickname_lower", sa.String(24), nullable=True),
        sa.Column(
            "nickname_script",
            postgresql.ENUM("CYRILLIC", "LATIN", name="nicknamescript", create_type=False),
            nullable=True,
        ),
        sa.Column("nickname_color", sa.String(7), nullable=True),
        sa.Column(
            "badge",
            postgresql.ENUM("VERIFIED", "FOUNDER", name="userbadge", create_type=False),
            nullable=True,
        ),
        sa.Column("nickname_changed_at", sa.TIMESTAMP(timezone=True), nullable=True),
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
        # fastapi-users protocol fields (not exposed in API; required by auth layer)
        # email: synthetic unique value (discord:{discord_id}@rift.internal); never user-visible
        sa.Column("email", sa.String(320), nullable=False),
        sa.Column("hashed_password", sa.String(1024), nullable=False, server_default=""),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("is_superuser", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("is_verified", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.PrimaryKeyConstraint("id", name="public_user_pkey"),
        sa.UniqueConstraint("discord_id", name="public_user_discord_id_key"),
        sa.UniqueConstraint("nickname", name="public_user_nickname_key"),
        sa.UniqueConstraint("nickname_lower", name="public_user_nickname_lower_key"),
        sa.UniqueConstraint("email", name="public_user_email_key"),
    )

    # public_oauth_account table (fastapi-users SQLAlchemyBaseOAuthAccountTableUUID)
    op.create_table(
        "public_oauth_account",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("oauth_name", sa.String(100), nullable=False),
        sa.Column("access_token", sa.Text(), nullable=False),
        sa.Column("expires_at", sa.Integer(), nullable=True),
        sa.Column("refresh_token", sa.Text(), nullable=True),
        sa.Column("account_id", sa.String(320), nullable=False),
        sa.Column("account_email", sa.String(320), nullable=True),
        sa.Column(
            "user_id",
            postgresql.UUID(as_uuid=True),
            sa.ForeignKey("public_user.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id", name="public_oauth_account_pkey"),
        sa.UniqueConstraint(
            "oauth_name", "account_id", name="public_oauth_account_oauth_name_key"
        ),
    )

    # prohibited_nickname table
    op.create_table(
        "prohibited_nickname",
        sa.Column("id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("word", sa.String(64), nullable=False),
        sa.Column(
            "created_at",
            sa.TIMESTAMP(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.PrimaryKeyConstraint("id", name="prohibited_nickname_pkey"),
        sa.UniqueConstraint("word", name="prohibited_nickname_word_key"),
    )

    # Additional indexes (the UNIQUE constraints above already create indexes,
    # but we create explicit indexes for clarity and fast lookup)
    op.create_index(
        "public_user_discord_id_idx",
        "public_user",
        ["discord_id"],
        unique=True,
    )
    op.create_index(
        "public_user_nickname_lower_idx",
        "public_user",
        ["nickname_lower"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index("public_user_nickname_lower_idx", table_name="public_user")
    op.drop_index("public_user_discord_id_idx", table_name="public_user")
    op.drop_table("prohibited_nickname")
    op.drop_table("public_oauth_account")
    op.drop_table("public_user")
    op.execute("DROP TYPE IF EXISTS userbadge CASCADE")
    op.execute("DROP TYPE IF EXISTS nicknamescript CASCADE")
