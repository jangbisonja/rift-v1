import uuid

from fastapi import APIRouter, Depends, File, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.media import service
from src.media.dependencies import valid_media_id
from src.media.models import Media
from src.media.schemas import MediaRead

router = APIRouter(prefix="/media", tags=["media"])


@router.get("", response_model=list[MediaRead], dependencies=[Depends(current_superuser)])
async def list_media(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_db),
):
    return await service.get_all(session, limit=limit, offset=offset)


@router.post("/upload", response_model=MediaRead, status_code=status.HTTP_201_CREATED, dependencies=[Depends(current_superuser)])
async def upload_media(file: UploadFile = File(...), session: AsyncSession = Depends(get_db)):
    content = await file.read()
    return await service.upload(
        content=content,
        content_type=file.content_type or "",
        original_name=file.filename or "unknown",
        session=session,
    )


@router.post("/{media_id}/attach/{post_id}", response_model=MediaRead, dependencies=[Depends(current_superuser)])
async def attach_media(
    post_id: uuid.UUID,
    media: Media = Depends(valid_media_id),
    session: AsyncSession = Depends(get_db),
):
    return await service.attach_to_post(media.id, post_id, session)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(current_superuser)])
async def delete_media(media: Media = Depends(valid_media_id), session: AsyncSession = Depends(get_db)):
    await service.delete(media.id, session)
