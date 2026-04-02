import io
import uuid
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.media.constants import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE_MB
from src.media.exceptions import FileTooLarge, InvalidFileType, MediaNotFound
from src.media.models import Media

UPLOADS_ROOT = Path("uploads")


def _convert_to_webp(content: bytes) -> bytes:
    img = Image.open(io.BytesIO(content))
    if img.mode in ("RGBA", "LA", "P"):
        img = img.convert("RGBA")
    else:
        img = img.convert("RGB")
    output = io.BytesIO()
    img.save(output, format="WEBP", quality=85, method=6)
    return output.getvalue()


def _get_upload_path() -> tuple[uuid.UUID, Path]:
    file_id = uuid.uuid4()
    now = datetime.now(timezone.utc)
    rel_path = UPLOADS_ROOT / str(now.year) / f"{now.month:02d}" / f"{now.day:02d}" / f"{file_id}.webp"
    return file_id, rel_path


async def get_all(session: AsyncSession, *, limit: int = 20, offset: int = 0) -> list[Media]:
    result = await session.execute(select(Media).order_by(Media.created_at.desc()).limit(limit).offset(offset))
    return list(result.scalars().all())


async def upload(
    content: bytes,
    content_type: str,
    original_name: str,
    session: AsyncSession,
) -> Media:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise InvalidFileType()
    if len(content) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise FileTooLarge()

    webp_bytes = _convert_to_webp(content)

    file_id, rel_path = _get_upload_path()
    rel_path.parent.mkdir(parents=True, exist_ok=True)
    rel_path.write_bytes(webp_bytes)

    media = Media(id=file_id, path=str(rel_path), original_name=original_name)
    session.add(media)
    await session.commit()
    await session.refresh(media)
    return media


async def attach_to_post(media_id: uuid.UUID, post_id: uuid.UUID, session: AsyncSession) -> Media:
    media = await get_by_id(media_id, session)
    media.post_id = post_id
    await session.commit()
    await session.refresh(media)
    return media


async def get_by_id(media_id: uuid.UUID, session: AsyncSession) -> Media:
    result = await session.execute(select(Media).where(Media.id == media_id))
    media = result.scalar_one_or_none()
    if not media:
        raise MediaNotFound()
    return media


async def delete(media_id: uuid.UUID, session: AsyncSession) -> None:
    media = await get_by_id(media_id, session)
    path = Path(media.path)
    if path.exists():
        path.unlink()
    await session.delete(media)
    await session.commit()
