import uuid

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.database import get_db
from src.raids import service
from src.raids.models import Raid, RaidBoss


async def valid_raid_id(raid_id: uuid.UUID, db: AsyncSession = Depends(get_db)) -> Raid:
    return await service.get_raid_by_id(db, raid_id)


async def valid_boss_in_raid(
    raid_id: uuid.UUID,
    boss_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
) -> RaidBoss:
    return await service.get_boss_by_id(db, raid_id, boss_id)
