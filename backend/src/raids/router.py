import uuid

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.raids import service
from src.raids.dependencies import valid_boss_in_raid, valid_raid_id
from src.raids.models import Raid, RaidBoss
from src.raids.schemas import (
    PaginatedRaidBosses,
    PaginatedRaids,
    RaidBossCreate,
    RaidBossRead,
    RaidBossUpdate,
    RaidCreate,
    RaidRead,
    RaidUpdate,
)

router = APIRouter(dependencies=[Depends(current_superuser)])


# ---------------------------------------------------------------------------
# Raids
# ---------------------------------------------------------------------------


@router.get("", response_model=PaginatedRaids)
async def list_raids(
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.get_all_raids(db, limit=limit, offset=offset)
    return PaginatedRaids(items=items, total=total, limit=limit, offset=offset)


@router.post("", response_model=RaidRead, status_code=status.HTTP_201_CREATED)
async def create_raid(data: RaidCreate, db: AsyncSession = Depends(get_db)):
    return await service.create_raid(db, data)


@router.get("/{raid_id}", response_model=RaidRead)
async def get_raid(raid: Raid = Depends(valid_raid_id)):
    return raid


@router.put("/{raid_id}", response_model=RaidRead)
async def update_raid(
    raid_id: uuid.UUID,
    data: RaidUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await service.update_raid(db, raid_id, data)


@router.delete("/{raid_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_raid(
    raid_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    await service.delete_raid(db, raid_id)


# ---------------------------------------------------------------------------
# Raid Bosses
# ---------------------------------------------------------------------------


@router.get("/{raid_id}/bosses", response_model=PaginatedRaidBosses)
async def list_bosses(
    raid: Raid = Depends(valid_raid_id),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    items, total = await service.get_all_bosses(db, raid.id, limit=limit, offset=offset)
    return PaginatedRaidBosses(items=items, total=total, limit=limit, offset=offset)


@router.post(
    "/{raid_id}/bosses",
    response_model=RaidBossRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_boss(
    data: RaidBossCreate,
    raid: Raid = Depends(valid_raid_id),
    db: AsyncSession = Depends(get_db),
):
    return await service.create_boss(db, raid.id, data)


@router.get("/{raid_id}/bosses/{boss_id}", response_model=RaidBossRead)
async def get_boss(boss: RaidBoss = Depends(valid_boss_in_raid)):
    return boss


@router.put("/{raid_id}/bosses/{boss_id}", response_model=RaidBossRead)
async def update_boss(
    raid_id: uuid.UUID,
    boss_id: uuid.UUID,
    data: RaidBossUpdate,
    db: AsyncSession = Depends(get_db),
):
    return await service.update_boss(db, raid_id, boss_id, data)


@router.delete("/{raid_id}/bosses/{boss_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_boss(
    raid_id: uuid.UUID,
    boss_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    await service.delete_boss(db, raid_id, boss_id)
