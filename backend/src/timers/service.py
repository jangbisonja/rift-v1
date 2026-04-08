from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.timers.constants import TimerType
from src.timers.models import TimerSchedule
from src.timers.schemas import TimerScheduleResponse, TimerScheduleUpdate


async def get_schedule(session: AsyncSession) -> TimerScheduleResponse:
    result = await session.execute(
        select(TimerSchedule).order_by(TimerSchedule.timer_type, TimerSchedule.day_of_week)
    )
    rows = result.scalars().all()

    world_boss = [False] * 7
    rift = [False] * 7

    for row in rows:
        if row.timer_type == TimerType.WORLD_BOSS:
            world_boss[row.day_of_week] = row.is_active
        elif row.timer_type == TimerType.RIFT:
            rift[row.day_of_week] = row.is_active

    return TimerScheduleResponse(world_boss=world_boss, rift=rift)


async def update_schedule(
    session: AsyncSession, data: TimerScheduleUpdate
) -> TimerScheduleResponse:
    type_day_map = {
        TimerType.WORLD_BOSS: data.world_boss,
        TimerType.RIFT: data.rift,
    }

    for timer_type, values in type_day_map.items():
        for day_of_week, is_active in enumerate(values):
            await session.execute(
                update(TimerSchedule)
                .where(
                    TimerSchedule.timer_type == timer_type,
                    TimerSchedule.day_of_week == day_of_week,
                )
                .values(is_active=is_active)
            )

    await session.commit()
    return await get_schedule(session)
