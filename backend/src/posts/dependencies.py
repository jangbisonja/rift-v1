import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.posts.models import Post
from src.posts import service


async def valid_post_id(post_id: uuid.UUID, session: AsyncSession = Depends(get_db)) -> Post:
    return await service.get_by_id(post_id, session)
