from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from slugify import slugify

from src.tags.models import Tag
from src.tags.exceptions import TagNotFound, TagAlreadyExists
from src.tags.schemas import TagCreate


async def get_all(session: AsyncSession) -> list[Tag]:
    result = await session.execute(select(Tag).order_by(Tag.name))
    return list(result.scalars().all())


async def get_by_id(tag_id, session: AsyncSession) -> Tag:
    result = await session.execute(select(Tag).where(Tag.id == tag_id))
    tag = result.scalar_one_or_none()
    if not tag:
        raise TagNotFound()
    return tag


async def create(data: TagCreate, session: AsyncSession) -> Tag:
    slug = slugify(data.name)
    existing = await session.execute(select(Tag).where(Tag.name == data.name))
    if existing.scalar_one_or_none():
        raise TagAlreadyExists()
    tag = Tag(name=data.name, slug=slug)
    session.add(tag)
    await session.commit()
    await session.refresh(tag)
    return tag


async def delete(tag_id, session: AsyncSession) -> None:
    tag = await get_by_id(tag_id, session)
    await session.delete(tag)
    await session.commit()
