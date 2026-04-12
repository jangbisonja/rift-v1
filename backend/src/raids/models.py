import uuid
from datetime import datetime
from typing import TYPE_CHECKING

import sqlalchemy as sa
from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base
from src.raids.constants import RaidDifficulty

if TYPE_CHECKING:
    from src.media.models import Media


class Raid(Base):
    __tablename__ = "raid"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    min_gear_score: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    difficulty: Mapped[RaidDifficulty] = mapped_column(
        sa.Enum(RaidDifficulty, name="raid_difficulty", create_constraint=True),
        nullable=False,
    )
    groups_count: Mapped[int] = mapped_column(sa.SmallInteger, nullable=False)
    phases_count: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    cover_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    cover_media: Mapped["Media | None"] = relationship(
        "Media", lazy="selectin", foreign_keys="[Raid.cover_media_id]"
    )


class RaidBoss(Base):
    __tablename__ = "raid_boss"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    raid_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("raid.id", ondelete="CASCADE"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phase_number: Mapped[int] = mapped_column(sa.Integer, nullable=False)
    icon_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("media.id", ondelete="SET NULL"),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    icon_media: Mapped["Media | None"] = relationship(
        "Media", lazy="selectin", foreign_keys="[RaidBoss.icon_media_id]"
    )
