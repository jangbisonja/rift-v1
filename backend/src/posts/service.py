import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from slugify import slugify
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.config import settings
from src.posts.constants import PostStatus
from src.posts.exceptions import PostNotFound, SlugAlreadyExists
from src.posts.models import Post
from src.posts.schemas import PostCreate, PostUpdate
from src.tags.models import Tag


def extract_excerpt(content: dict[str, Any] | None, word_limit: int = 10) -> str:
    """Return the first `word_limit` words of plain text from a TipTap JSON document.

    Walks the node tree in document order, collecting every ``text`` node value,
    then joins them with a single space and returns the first `word_limit` words.
    Returns ``""`` if *content* is null, empty, or structurally malformed.
    """
    if not content or not isinstance(content, dict):
        return ""

    words: list[str] = []

    def _walk(node: Any) -> None:
        if not isinstance(node, dict):
            return
        if node.get("type") == "text":
            node_text = node.get("text", "")
            if isinstance(node_text, str):
                words.extend(node_text.split())
        for child in node.get("content", []):
            _walk(child)

    _walk(content)
    return " ".join(words[:word_limit])


async def _resolve_tags(tag_ids: list[uuid.UUID], session: AsyncSession) -> list[Tag]:
    if not tag_ids:
        return []
    result = await session.execute(select(Tag).where(Tag.id.in_(tag_ids)))
    return list(result.scalars().all())


async def _unique_slug(base: str, session: AsyncSession, exclude_id: uuid.UUID | None = None) -> str:
    slug = slugify(base)
    query = select(Post).where(Post.slug == slug)
    if exclude_id:
        query = query.where(Post.id != exclude_id)
    if (await session.execute(query)).scalar_one_or_none():
        raise SlugAlreadyExists()
    return slug


async def get_all(
    session: AsyncSession,
    *,
    post_type=None,
    status=None,
    slug: str | None = None,
    limit: int = 20,
    offset: int = 0,
    visibility: str = "all",
) -> list[Post]:
    query = select(Post).order_by(Post.created_at.desc()).limit(limit).offset(offset)
    if post_type:
        query = query.where(Post.type == post_type)
    if status:
        query = query.where(Post.status == status)
    if slug:
        query = query.where(Post.slug == slug)
    if visibility == "public":
        grace_days = settings.EXPIRY_GRACE_DAYS
        cutoff = datetime.now(timezone.utc) - timedelta(days=grace_days)
        query = query.where(
            or_(Post.end_date.is_(None), Post.end_date > cutoff)
        )
    result = await session.execute(query)
    return list(result.scalars().all())


async def get_by_id(post_id: uuid.UUID, session: AsyncSession) -> Post:
    result = await session.execute(select(Post).where(Post.id == post_id))
    post = result.scalar_one_or_none()
    if not post:
        raise PostNotFound()
    return post


async def get_by_slug(slug: str, session: AsyncSession) -> Post:
    result = await session.execute(select(Post).where(Post.slug == slug))
    post = result.scalar_one_or_none()
    if not post:
        raise PostNotFound()
    return post


async def create(data: PostCreate, session: AsyncSession) -> Post:
    # PROMO posts have no title — use promo_code as slug base, fall back to UUID fragment
    slug_base = data.title or data.promo_code or str(uuid.uuid4())[:8]
    slug = await _unique_slug(slug_base, session)
    tags = await _resolve_tags(data.tag_ids, session)
    post = Post(
        type=data.type,
        title=data.title,
        slug=slug,
        content=data.content,
        post_metadata=data.post_metadata,
        tags=tags,
        cover_media_id=data.cover_media_id,
        start_date=data.start_date,
        end_date=data.end_date,
        promo_code=data.promo_code.upper() if data.promo_code is not None else None,
        external_link=data.external_link,
        redirect_to_external=data.redirect_to_external,
    )
    session.add(post)
    await session.commit()
    await session.refresh(post)
    return post


async def update(post_id: uuid.UUID, data: PostUpdate, session: AsyncSession) -> Post:
    post = await get_by_id(post_id, session)
    if data.title is not None:
        post.title = data.title
        # Only regenerate slug when title is non-empty (PROMO updates send title="")
        if data.title:
            post.slug = await _unique_slug(data.title, session, exclude_id=post_id)
    if data.content is not None:
        post.content = data.content
    if data.post_metadata is not None:
        post.post_metadata = data.post_metadata
    if data.tag_ids is not None:
        post.tags = await _resolve_tags(data.tag_ids, session)
    if "cover_media_id" in data.model_fields_set:
        post.cover_media_id = data.cover_media_id
    if data.start_date is not None:
        post.start_date = data.start_date
    if data.end_date is not None:
        post.end_date = data.end_date
    if data.promo_code is not None:
        post.promo_code = data.promo_code.upper()
    if "external_link" in data.model_fields_set:
        post.external_link = data.external_link
    if "redirect_to_external" in data.model_fields_set:
        post.redirect_to_external = data.redirect_to_external
    await session.commit()
    await session.refresh(post)
    return post


async def publish(post_id: uuid.UUID, session: AsyncSession) -> Post:
    post = await get_by_id(post_id, session)
    post.status = PostStatus.PUBLISHED
    post.published_at = datetime.now(timezone.utc)
    await session.commit()
    await session.refresh(post)
    return post


async def unpublish(post_id: uuid.UUID, session: AsyncSession) -> Post:
    post = await get_by_id(post_id, session)
    post.status = PostStatus.DRAFT
    await session.commit()
    await session.refresh(post)
    return post


async def archive(post_id: uuid.UUID, session: AsyncSession) -> Post:
    post = await get_by_id(post_id, session)
    post.status = PostStatus.ARCHIVE
    await session.commit()
    await session.refresh(post)
    return post


async def delete(post_id: uuid.UUID, session: AsyncSession) -> None:
    post = await get_by_id(post_id, session)
    await session.delete(post)
    await session.commit()
