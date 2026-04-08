import uuid

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.timers.constants import TimerType
from src.timers.models import TimerSchedule


async def seed_timer_schedule(session: AsyncSession) -> None:
    """Idempotently insert all 14 timer schedule rows if they do not exist.

    All rows default to is_active=False. Safe to call on every startup.
    """
    for timer_type in TimerType:
        for day_of_week in range(7):
            existing = await session.execute(
                select(TimerSchedule).where(
                    TimerSchedule.timer_type == timer_type,
                    TimerSchedule.day_of_week == day_of_week,
                )
            )
            if existing.scalar_one_or_none() is None:
                session.add(
                    TimerSchedule(
                        id=uuid.uuid4(),
                        timer_type=timer_type,
                        day_of_week=day_of_week,
                        is_active=False,
                    )
                )

    await session.commit()
    logger.info("Timer schedule seed complete (14 rows guaranteed)")
