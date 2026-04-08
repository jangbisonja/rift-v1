from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.timers import service as timers_service
from src.timers.schemas import TimerScheduleResponse, TimerScheduleUpdate

router = APIRouter(prefix="/timers", tags=["timers"])


@router.get("/schedule", response_model=TimerScheduleResponse)
async def get_schedule(session: AsyncSession = Depends(get_db)):
    return await timers_service.get_schedule(session)


@router.put(
    "/schedule",
    response_model=TimerScheduleResponse,
    dependencies=[Depends(current_superuser)],
)
async def update_schedule(
    data: TimerScheduleUpdate,
    session: AsyncSession = Depends(get_db),
):
    return await timers_service.update_schedule(session, data)
