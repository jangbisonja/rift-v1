"""User profile router — nickname and cosmetics endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_settings
from src.auth.discord import current_public_user
from src.auth.router import current_superuser
from src.database import get_db
from src.users.models import PublicUser
from src.users.schemas import CosmeticsUpdate, NicknameUpdate, PublicUserRead
from src.users.service import check_cooldown, set_nickname

# User-facing routes (mounted at /users)
router = APIRouter()

# Mod/admin routes for users (mounted at /mod/users)
mod_router = APIRouter()


@router.get(
    "/me",
    response_model=PublicUserRead,
    summary="Get current public user profile",
    tags=["users"],
)
async def get_my_profile(
    user: PublicUser = Depends(current_public_user),
) -> PublicUserRead:
    """Return the authenticated public user's profile."""
    return PublicUserRead.model_validate(user)


@router.patch(
    "/me/nickname",
    response_model=PublicUserRead,
    summary="Set or update the current user's nickname",
    tags=["users"],
)
async def update_my_nickname(
    payload: NicknameUpdate,
    user: PublicUser = Depends(current_public_user),
    db: AsyncSession = Depends(get_db),
) -> PublicUserRead:
    """Set or update the authenticated public user's nickname.

    - Initial setup (nickname IS NULL): no cooldown applied.
    - Subsequent updates: 10-minute cooldown enforced.
    Validation: length, script (Cyrillic/Latin), prohibited words, uniqueness.
    """
    is_initial = user.nickname is None

    if not is_initial:
        check_cooldown(user)

    updated_user = await set_nickname(
        user=user,
        nickname=payload.nickname,
        db=db,
        is_initial=is_initial,
    )
    return PublicUserRead.model_validate(updated_user)


@router.delete(
    "/me",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete own account",
    tags=["users"],
)
async def delete_my_account(
    response: Response,
    user: PublicUser = Depends(current_public_user),
    db: AsyncSession = Depends(get_db),
) -> None:
    """Permanently delete the authenticated public user's account.

    Cascades to public_oauth_account (FK ondelete=CASCADE in migration).
    Clears user_token cookie so browser is immediately logged out.
    """
    await db.delete(user)
    await db.commit()
    response.delete_cookie(
        "user_token",
        path="/",
        httponly=True,
        samesite="lax",
        secure=(auth_settings.APP_ENV == "production"),
    )


@mod_router.patch(
    "/{user_id}/cosmetics",
    response_model=PublicUserRead,
    summary="Admin: set nickname_color and/or badge on any user",
    tags=["users"],
    dependencies=[Depends(current_superuser)],
)
async def update_user_cosmetics(
    user_id: uuid.UUID,
    payload: CosmeticsUpdate,
    db: AsyncSession = Depends(get_db),
) -> PublicUserRead:
    """Superuser endpoint to assign cosmetic fields (nickname_color, badge).

    Users cannot set these themselves — admin-assigned only (AUTH.md Boundaries).
    """
    result = await db.execute(
        select(PublicUser).where(PublicUser.id == user_id)
    )
    user: PublicUser | None = result.scalar_one_or_none()
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if payload.nickname_color is not None:
        user.nickname_color = payload.nickname_color
    if payload.badge is not None:
        user.badge = payload.badge

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return PublicUserRead.model_validate(user)
