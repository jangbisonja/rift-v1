import uuid
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from src.posts.constants import PostStatus, PostType
from src.tags.schemas import TagRead


class PostCreate(BaseModel):
    type: PostType
    title: str = Field(min_length=1, max_length=256)
    content: dict[str, Any] = Field(default_factory=dict)
    post_metadata: dict[str, Any] = Field(default_factory=dict)
    tag_ids: list[uuid.UUID] = Field(default_factory=list)


class PostUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=256)
    content: dict[str, Any] | None = None
    post_metadata: dict[str, Any] | None = None
    tag_ids: list[uuid.UUID] | None = None


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


class PostList(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    type: PostType
    status: PostStatus
    title: str
    slug: str
    created_at: datetime
    published_at: datetime | None
    tags: list[TagRead]
