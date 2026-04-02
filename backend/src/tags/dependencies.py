import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.tags.models import Tag
from src.tags import service


async def valid_tag_id(tag_id: uuid.UUID, session: AsyncSession = Depends(get_db)) -> Tag:
    return await service.get_by_id(tag_id, session)
