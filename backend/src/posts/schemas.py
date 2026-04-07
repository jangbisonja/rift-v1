import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

from src.posts.constants import PostStatus, PostType
from src.posts.utils import inject_excerpt
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

    @field_validator("start_date", "end_date", mode="after")
    @classmethod
    def _require_timezone_aware(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("datetime must be timezone-aware (UTC expected)")
        return v

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

    @field_validator("start_date", "end_date", mode="after")
    @classmethod
    def _require_timezone_aware(cls, v: datetime | None) -> datetime | None:
        if v is not None and v.tzinfo is None:
            raise ValueError("datetime must be timezone-aware (UTC expected)")
        return v


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
        return inject_excerpt(data)


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
        return inject_excerpt(data)
