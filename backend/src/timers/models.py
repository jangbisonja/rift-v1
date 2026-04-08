import uuid

from sqlalchemy import Boolean, Enum, SmallInteger, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from src.models import Base
from src.timers.constants import TimerType


class TimerSchedule(Base):
    __tablename__ = "timer_schedule"
    __table_args__ = (UniqueConstraint("timer_type", "day_of_week"),)

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    timer_type: Mapped[TimerType] = mapped_column(
        Enum(TimerType, name="timertype"), nullable=False
    )
    day_of_week: Mapped[int] = mapped_column(SmallInteger, nullable=False)
    is_active: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False, server_default="false"
    )
