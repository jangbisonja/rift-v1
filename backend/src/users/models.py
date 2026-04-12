import uuid
from typing import TYPE_CHECKING, List

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base
from src.users.constants import NicknameScript, UserBadge

if TYPE_CHECKING:
    from src.auth.models import PublicOAuthAccount


class PublicUser(Base):
    __tablename__ = "public_user"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    display_id: Mapped[int] = mapped_column(
        sa.Integer,
        sa.Identity(start=1, always=True),
        nullable=False,
        unique=True,
    )
    discord_id: Mapped[str] = mapped_column(
        sa.String(32), unique=True, nullable=False
    )
    discord_username: Mapped[str] = mapped_column(
        sa.String(64), nullable=False
    )
    nickname: Mapped[str | None] = mapped_column(
        sa.String(24), unique=True, nullable=True
    )
    nickname_lower: Mapped[str | None] = mapped_column(
        sa.String(24), unique=True, nullable=True
    )
    nickname_script: Mapped[NicknameScript | None] = mapped_column(
        sa.Enum(NicknameScript, name="nicknamescript"), nullable=True
    )
    nickname_color: Mapped[str | None] = mapped_column(
        sa.String(7), nullable=True
    )
    badge: Mapped[UserBadge | None] = mapped_column(
        sa.Enum(UserBadge, name="userbadge"), nullable=True
    )
    nickname_changed_at: Mapped[sa.DateTime | None] = mapped_column(
        sa.TIMESTAMP(timezone=True), nullable=True
    )
    created_at: Mapped[sa.DateTime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
    updated_at: Mapped[sa.DateTime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
        onupdate=sa.func.now(),
    )

    # --------------------------------------------------------------------------
    # fastapi-users protocol fields
    # These are required by fastapi-users' Authenticator / BaseUserManager
    # to function correctly with current_user(active=True).
    # They are never exposed in PublicUserRead — they only serve the auth layer.
    # email: synthetic unique value derived from discord_id (not a real email)
    # hashed_password: empty string (Discord OAuth; no password)
    # --------------------------------------------------------------------------
    # Synthetic value: "discord:{discord_id}@rift.internal" — never user-visible
    email: Mapped[str] = mapped_column(
        sa.String(320), unique=True, nullable=False
    )
    hashed_password: Mapped[str] = mapped_column(
        sa.String(1024), nullable=False, server_default=""
    )
    is_active: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )
    is_superuser: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.false()
    )
    is_verified: Mapped[bool] = mapped_column(
        sa.Boolean, nullable=False, server_default=sa.true()
    )

    # OAuth accounts relationship (required by fastapi-users add_oauth_account)
    oauth_accounts: Mapped[List["PublicOAuthAccount"]] = relationship(
        "PublicOAuthAccount", lazy="noload"
    )


class ProhibitedNickname(Base):
    __tablename__ = "prohibited_nickname"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    word: Mapped[str] = mapped_column(
        sa.String(64), unique=True, nullable=False
    )
    created_at: Mapped[sa.DateTime] = mapped_column(
        sa.TIMESTAMP(timezone=True),
        nullable=False,
        server_default=sa.func.now(),
    )
