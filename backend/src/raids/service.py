import uuid
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.media.models import Media
from src.raids.exceptions import (
    RaidBossIconNotFound,
    RaidBossNotFound,
    RaidCoverNotFound,
    RaidNotFound,
)
from src.raids.models import Raid, RaidBoss
from src.raids.schemas import RaidBossCreate, RaidBossUpdate, RaidCreate, RaidUpdate


# ---------------------------------------------------------------------------
# Raids
# ---------------------------------------------------------------------------


async def get_all_raids(
    db: AsyncSession, limit: int = 20, offset: int = 0
) -> tuple[list[Raid], int]:
    count_result = await db.execute(select(func.count()).select_from(Raid))
    total = count_result.scalar_one()

    result = await db.execute(
        select(Raid).order_by(Raid.created_at.desc()).limit(limit).offset(offset)
    )
    items = list(result.scalars().all())
    return items, total


async def get_raid_by_id(db: AsyncSession, raid_id: uuid.UUID) -> Raid:
    result = await db.execute(select(Raid).where(Raid.id == raid_id))
    raid = result.scalar_one_or_none()
    if not raid:
        raise RaidNotFound()
    return raid


async def _validate_cover_media(db: AsyncSession, cover_media_id: uuid.UUID) -> None:
    media = await db.get(Media, cover_media_id)
    if not media:
        raise RaidCoverNotFound()


async def _validate_icon_media(db: AsyncSession, icon_media_id: uuid.UUID) -> None:
    media = await db.get(Media, icon_media_id)
    if not media:
        raise RaidBossIconNotFound()


async def create_raid(db: AsyncSession, data: RaidCreate) -> Raid:
    if data.cover_media_id is not None:
        await _validate_cover_media(db, data.cover_media_id)

    raid = Raid(
        name=data.name,
        min_gear_score=data.min_gear_score,
        difficulty=data.difficulty,
        groups_count=data.groups_count,
        phases_count=data.phases_count,
        cover_media_id=data.cover_media_id,
    )
    db.add(raid)
    await db.commit()
    await db.refresh(raid)
    return raid


async def update_raid(db: AsyncSession, raid_id: uuid.UUID, data: RaidUpdate) -> Raid:
    if "cover_media_id" in data.model_fields_set and data.cover_media_id is not None:
        await _validate_cover_media(db, data.cover_media_id)

    raid = await get_raid_by_id(db, raid_id)
    for field in data.model_fields_set:
        setattr(raid, field, getattr(data, field))

    raid.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(raid)
    return raid


async def delete_raid(db: AsyncSession, raid_id: uuid.UUID) -> None:
    raid = await get_raid_by_id(db, raid_id)
    await db.delete(raid)
    await db.commit()


# ---------------------------------------------------------------------------
# Raid Bosses
# ---------------------------------------------------------------------------


async def get_all_bosses(
    db: AsyncSession, raid_id: uuid.UUID, limit: int = 20, offset: int = 0
) -> tuple[list[RaidBoss], int]:
    count_result = await db.execute(
        select(func.count()).select_from(RaidBoss).where(RaidBoss.raid_id == raid_id)
    )
    total = count_result.scalar_one()

    result = await db.execute(
        select(RaidBoss)
        .where(RaidBoss.raid_id == raid_id)
        .order_by(RaidBoss.phase_number.asc())
        .limit(limit)
        .offset(offset)
    )
    items = list(result.scalars().all())
    return items, total


async def get_boss_by_id(
    db: AsyncSession, raid_id: uuid.UUID, boss_id: uuid.UUID
) -> RaidBoss:
    result = await db.execute(
        select(RaidBoss).where(RaidBoss.id == boss_id, RaidBoss.raid_id == raid_id)
    )
    boss = result.scalar_one_or_none()
    if not boss:
        raise RaidBossNotFound()
    return boss


async def create_boss(
    db: AsyncSession, raid_id: uuid.UUID, data: RaidBossCreate
) -> RaidBoss:
    if data.icon_media_id is not None:
        await _validate_icon_media(db, data.icon_media_id)

    boss = RaidBoss(
        raid_id=raid_id,
        name=data.name,
        phase_number=data.phase_number,
        icon_media_id=data.icon_media_id,
    )
    db.add(boss)
    await db.commit()
    await db.refresh(boss)
    return boss


async def update_boss(
    db: AsyncSession, raid_id: uuid.UUID, boss_id: uuid.UUID, data: RaidBossUpdate
) -> RaidBoss:
    if "icon_media_id" in data.model_fields_set and data.icon_media_id is not None:
        await _validate_icon_media(db, data.icon_media_id)

    boss = await get_boss_by_id(db, raid_id, boss_id)
    for field in data.model_fields_set:
        setattr(boss, field, getattr(data, field))

    boss.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(boss)
    return boss


async def delete_boss(db: AsyncSession, raid_id: uuid.UUID, boss_id: uuid.UUID) -> None:
    boss = await get_boss_by_id(db, raid_id, boss_id)
    await db.delete(boss)
    await db.commit()
