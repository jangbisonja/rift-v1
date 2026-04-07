from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.tags import service
from src.tags.dependencies import valid_tag_id
from src.tags.models import Tag
from src.tags.schemas import TagCreate, TagRead

router = APIRouter(prefix="/tags", tags=["tags"])


@router.get("", response_model=list[TagRead])
async def list_tags(session: AsyncSession = Depends(get_db)):
    return await service.get_all(session)


@router.post(
    "",
    response_model=TagRead,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(current_superuser)],
)
async def create_tag(data: TagCreate, session: AsyncSession = Depends(get_db)):
    return await service.create(data, session)


@router.delete(
    "/{tag_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(current_superuser)],
)
async def delete_tag(
    tag: Tag = Depends(valid_tag_id), session: AsyncSession = Depends(get_db)
):
    await service.delete(tag.id, session)
