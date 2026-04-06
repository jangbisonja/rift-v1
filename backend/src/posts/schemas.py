import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from src.posts.constants import PostStatus, PostType
from src.tags.schemas import TagRead


class PostCreate(BaseModel):
    type: PostType
    title: str = Field(default="", max_length=256)
    content: dict[str, Any] = Field(default_factory=dict)
    post_metadata: dict[str, Any] = Field(default_factory=dict)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)
    cover_media_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    promo_code: str | None = None
    external_link: str | None = None
    redirect_to_external: bool = False

    @model_validator(mode="after")
    def _require_title_for_non_promo(self) -> "PostCreate":
        if self.type != PostType.PROMO and not self.title:
            raise ValueError("Title is required")
        return self


class PostUpdate(BaseModel):
    # min_length intentionally omitted: PROMO updates send title="" (no title field)
    title: str | None = Field(None, max_length=256)
    content: dict[str, Any] | None = None
    post_metadata: dict[str, Any] | None = None
    tag_ids: list[uuid.UUID] | None = None
    cover_media_id: uuid.UUID | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    promo_code: str | None = None
    external_link: str | None = None
    redirect_to_external: bool | None = None


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
    start_date: datetime | None
    end_date: datetime | None
    promo_code: str | None
    external_link: str | None
    redirect_to_external: bool
    excerpt: str
    tags: list[TagRead]
    media: list[MediaRead]
    cover_media: MediaRead | None

    @model_validator(mode="before")
    @classmethod
    def _inject_excerpt(cls, data: Any) -> Any:
        """Compute ``excerpt`` from TipTap ``content``, same logic as PostListItem."""
        from src.posts.service import extract_excerpt  # noqa: PLC0415

        if isinstance(data, dict):
            if "excerpt" not in data:
                data["excerpt"] = extract_excerpt(data.get("content"))
            return data

        # ORM instance path — copy all attributes and inject excerpt
        content = getattr(data, "content", None)
        obj_dict = {
            "id": data.id,
            "type": data.type,
            "status": data.status,
            "title": data.title,
            "slug": data.slug,
            "content": content,
            "post_metadata": data.post_metadata,
            "created_at": data.created_at,
            "updated_at": data.updated_at,
            "published_at": data.published_at,
            "start_date": data.start_date,
            "end_date": data.end_date,
            "promo_code": data.promo_code,
            "external_link": data.external_link,
            "redirect_to_external": data.redirect_to_external,
            "excerpt": extract_excerpt(content),
            "tags": data.tags,
            "media": data.media,
            "cover_media": data.cover_media,
        }
        return obj_dict


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
    start_date: datetime | None
    end_date: datetime | None
    promo_code: str | None
    external_link: str | None
    redirect_to_external: bool
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
            "start_date": data.start_date,
            "end_date": data.end_date,
            "promo_code": data.promo_code,
            "external_link": data.external_link,
            "redirect_to_external": data.redirect_to_external,
            "tags": data.tags,
            "media": data.media,
            "cover_media": data.cover_media,
        }
