from pydantic import BaseModel, Field


class TimerScheduleResponse(BaseModel):
    world_boss: list[bool] = Field(..., min_length=7, max_length=7)
    rift: list[bool] = Field(..., min_length=7, max_length=7)

    model_config = {"from_attributes": True}


class TimerScheduleUpdate(BaseModel):
    world_boss: list[bool] = Field(..., min_length=7, max_length=7)
    rift: list[bool] = Field(..., min_length=7, max_length=7)
