import uuid
from datetime import datetime

from pydantic import BaseModel, Field

from src.media.schemas import MediaRead
from src.raids.constants import RaidDifficulty


# --- Input schemas ---


class RaidCreate(BaseModel):
    name: str = Field(max_length=100)
    min_gear_score: int = Field(ge=0)
    difficulty: RaidDifficulty
    groups_count: int = Field(ge=1, le=4)
    phases_count: int = Field(ge=1)
    cover_media_id: uuid.UUID | None = None


class RaidUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    min_gear_score: int | None = Field(default=None, ge=0)
    difficulty: RaidDifficulty | None = None
    groups_count: int | None = Field(default=None, ge=1, le=4)
    phases_count: int | None = Field(default=None, ge=1)
    cover_media_id: uuid.UUID | None = None


class RaidBossCreate(BaseModel):
    name: str = Field(max_length=100)
    phase_number: int = Field(ge=1)
    icon_media_id: uuid.UUID | None = None


class RaidBossUpdate(BaseModel):
    name: str | None = Field(default=None, max_length=100)
    phase_number: int | None = Field(default=None, ge=1)
    icon_media_id: uuid.UUID | None = None


# --- Output schemas ---


class RaidRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    name: str
    min_gear_score: int
    difficulty: RaidDifficulty
    groups_count: int
    phases_count: int
    cover_media_id: uuid.UUID | None
    cover_media: MediaRead | None
    created_at: datetime
    updated_at: datetime


class RaidBossRead(BaseModel):
    model_config = {"from_attributes": True}

    id: uuid.UUID
    raid_id: uuid.UUID
    name: str
    phase_number: int
    icon_media_id: uuid.UUID | None
    icon_media: MediaRead | None
    created_at: datetime
    updated_at: datetime


class PaginatedRaids(BaseModel):
    items: list[RaidRead]
    total: int
    limit: int
    offset: int


class PaginatedRaidBosses(BaseModel):
    items: list[RaidBossRead]
    total: int
    limit: int
    offset: int
