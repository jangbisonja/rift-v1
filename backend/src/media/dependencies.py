import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.media.models import Media
from src.media import service


async def valid_media_id(media_id: uuid.UUID, session: AsyncSession = Depends(get_db)) -> Media:
    return await service.get_by_id(media_id, session)
