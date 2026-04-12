import uuid
from datetime import datetime
from typing import Optional

from fastapi_users import schemas as fu_schemas
from pydantic import BaseModel, ConfigDict, field_validator

from src.users.constants import NicknameScript, UserBadge


class PublicUserRead(BaseModel):
    """Public-facing user profile shape.

    Excludes internal fastapi-users fields (email, hashed_password, is_active,
    is_superuser, is_verified) and the derived nickname_lower column.
    """

    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_id: int
    discord_id: str
    discord_username: str
    nickname: Optional[str] = None
    nickname_script: Optional[NicknameScript] = None
    nickname_color: Optional[str] = None
    badge: Optional[UserBadge] = None
    nickname_changed_at: Optional[datetime] = None
    created_at: datetime


class PublicUserUpdate(fu_schemas.BaseUserUpdate):
    """Minimal update schema used by fastapi-users' PATCH /users/me.

    We keep this to satisfy the get_users_router type contract.
    Actual nickname changes go through PATCH /users/me/nickname.
    """

    pass


class NicknameUpdate(BaseModel):
    """Input for PATCH /users/me/nickname."""

    nickname: str

    @field_validator("nickname", mode="before")
    @classmethod
    def strip_whitespace(cls, v: str) -> str:
        if isinstance(v, str):
            return v.strip()
        return v


class NicknameErrorDetail(BaseModel):
    """Structured error body for nickname validation failures."""

    code: str
    message: str
    seconds_remaining: Optional[int] = None


class CosmeticsUpdate(BaseModel):
    """Input for PATCH /mod/users/{id}/cosmetics."""

    nickname_color: Optional[str] = None
    badge: Optional[UserBadge] = None
