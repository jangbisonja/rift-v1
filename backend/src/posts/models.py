import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    ForeignKey,
    JSON,
    String,
    Table,
    func,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.models import Base
from src.posts.constants import PostStatus, PostType

if TYPE_CHECKING:
    from src.media.models import Media
    from src.tags.models import Tag

post_tag = Table(
    "post_tag",
    Base.metadata,
    Column(
        "post_id",
        UUID(as_uuid=True),
        ForeignKey("post.id", ondelete="CASCADE"),
        primary_key=True,
    ),
    Column(
        "tag_id",
        UUID(as_uuid=True),
        ForeignKey("tag.id", ondelete="CASCADE"),
        primary_key=True,
    ),
)


class Post(Base):
    __tablename__ = "post"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[PostType] = mapped_column(
        Enum(PostType, name="posttype"), nullable=False
    )
    status: Mapped[PostStatus] = mapped_column(
        Enum(PostStatus, name="poststatus"), nullable=False, default=PostStatus.DRAFT
    )
    title: Mapped[str] = mapped_column(String(256), nullable=False)
    slug: Mapped[str] = mapped_column(String(256), unique=True, nullable=False)
    content: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    post_metadata: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), onupdate=func.now(), nullable=True
    )
    published_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    start_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    end_date: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    promo_code: Mapped[str | None] = mapped_column(String(100), nullable=True)
    external_link: Mapped[str | None] = mapped_column(String(2048), nullable=True)
    redirect_to_external: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )

    cover_media_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey(
            "media.id",
            ondelete="SET NULL",
            use_alter=True,
            name="post_cover_media_id_fkey",
        ),
        nullable=True,
    )

    tags: Mapped[list["Tag"]] = relationship("Tag", secondary=post_tag, lazy="selectin")
    media: Mapped[list["Media"]] = relationship(
        "Media", back_populates="post", lazy="selectin", foreign_keys="[Media.post_id]"
    )
    cover_media: Mapped["Media | None"] = relationship(
        "Media", lazy="selectin", foreign_keys="[Post.cover_media_id]"
    )
