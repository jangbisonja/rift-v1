import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from src.posts.constants import PostStatus, PostType
from src.tags.schemas import TagRead


class PostCreate(BaseModel):
    type: PostType
    title: str = Field(min_length=1, max_length=256)
    content: dict[str, Any] = Field(default_factory=dict)
    post_metadata: dict[str, Any] = Field(default_factory=dict)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    cover_media_id: uuid.UUID | None = None


class PostUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=256)
    content: dict[str, Any] | None = None
    post_metadata: dict[str, Any] | None = None
    tag_ids: list[uuid.UUID] | None = None
    cover_media_id: uuid.UUID | None = None


class MediaRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    path: str
    original_name: str


class PostRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    type: PostType
    status: PostStatus
    title: str
    slug: str
    content: dict[str, Any]
    post_metadata: dict[str, Any]
    created_at: datetime
    updated_at: datetime | None
    published_at: datetime | None
    tags: list[TagRead]
    media: list[MediaRead]
    cover_media: MediaRead | None


class PostListItem(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    type: PostType
    status: PostStatus
    title: str
    slug: str
    excerpt: str
    created_at: datetime
    published_at: datetime | None
    tags: list[TagRead]
    media: list[MediaRead]
    cover_media: MediaRead | None

    @model_validator(mode="before")
    @classmethod
    def _inject_excerpt(cls, data: Any) -> Any:
        """Compute and inject ``excerpt`` from the TipTap ``content`` field.

        This validator runs before field assignment. When FastAPI serializes an
        ORM object with ``from_attributes=True``, the validator receives the ORM
        instance. We read ``content``, compute the excerpt, then return a plain
        dict so that ``excerpt`` is present for field validation. Nested ORM
        objects (tags, media, cover_media) are carried over as-is; their own
        schemas also have ``from_attributes=True`` and will resolve them.
        """
        from src.posts.service import extract_excerpt  # noqa: PLC0415

        if isinstance(data, dict):
            if "excerpt" not in data:
                data["excerpt"] = extract_excerpt(data.get("content"))
            return data

        # ORM instance path
        return {
            "id": data.id,
            "type": data.type,
            "status": data.status,
            "title": data.title,
            "slug": data.slug,
            "excerpt": extract_excerpt(getattr(data, "content", None)),
            "created_at": data.created_at,
            "published_at": data.published_at,
            "tags": data.tags,
            "media": data.media,
            "cover_media": data.cover_media,
        }
