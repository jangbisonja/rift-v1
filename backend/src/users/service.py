"""User profile service — nickname validation and management."""

import re
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.constants import NicknameScript
from src.users.models import ProhibitedNickname, PublicUser
from src.users.schemas import NicknameErrorDetail

_COOLDOWN_MINUTES = 10
_NICKNAME_MIN = 3
_NICKNAME_MAX = 24

_CYRILLIC_OR_DIGITS = re.compile(r"^[а-яёА-ЯЁ0-9]+$")
_LATIN_OR_DIGITS    = re.compile(r"^[a-zA-Z0-9]+$")
_HAS_CYRILLIC       = re.compile(r"[а-яёА-ЯЁ]")
_HAS_LATIN          = re.compile(r"[a-zA-Z]")


def _error(code: str, message: str, seconds_remaining: Optional[int] = None) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail=NicknameErrorDetail(
            code=code,
            message=message,
            seconds_remaining=seconds_remaining,
        ).model_dump(exclude_none=True),
    )


async def validate_nickname(
    nickname: str,
    db: AsyncSession,
    user_id: Optional[uuid.UUID] = None,
) -> NicknameScript:
    """Validate a candidate nickname against all business rules.

    Raises HTTPException (422) with a NicknameErrorDetail body on failure.
    Order: length → script → prohibited → uniqueness.
    Returns the detected NicknameScript.
    """
    # Length check (RULES.md #N1)
    if not (_NICKNAME_MIN <= len(nickname) <= _NICKNAME_MAX):
        raise _error(
            "INVALID_LENGTH",
            f"Nickname must be between {_NICKNAME_MIN} and {_NICKNAME_MAX} characters.",
        )

    # Script check — strictly Cyrillic+digits or strictly Latin+digits (RULES.md #N1)
    has_cyr = bool(_HAS_CYRILLIC.search(nickname))
    has_lat = bool(_HAS_LATIN.search(nickname))

    if has_cyr and has_lat:
        raise _error(
            "INVALID_SCRIPT",
            "Nickname must be strictly Cyrillic or strictly Latin — no alphabet mixing.",
        )
    elif has_cyr and _CYRILLIC_OR_DIGITS.match(nickname):
        script = NicknameScript.CYRILLIC
    elif has_lat and _LATIN_OR_DIGITS.match(nickname):
        script = NicknameScript.LATIN
    else:
        raise _error(
            "INVALID_SCRIPT",
            "Nickname must contain at least one letter.",
        )

    lower = nickname.lower()

    # Prohibited word check
    result = await db.execute(
        select(ProhibitedNickname).where(ProhibitedNickname.word == lower)
    )
    if result.scalar_one_or_none() is not None:
        raise _error("NICKNAME_PROHIBITED", "This nickname is not allowed.")

    # Uniqueness check — case-insensitive via nickname_lower column (RULES.md #N2)
    stmt = select(PublicUser).where(PublicUser.nickname_lower == lower)
    if user_id is not None:
        stmt = stmt.where(PublicUser.id != user_id)
    result = await db.execute(stmt)
    if result.scalar_one_or_none() is not None:
        raise _error("NICKNAME_TAKEN", "This nickname is already in use.")

    return script


def check_cooldown(user: PublicUser) -> None:
    """Raise HTTPException if the user is still within the nickname-change cooldown.

    Cooldown applies to updates only (not initial nickname setup). Callers must
    pass is_initial=True when setting the nickname for the first time so this
    check is skipped at the call site.
    """
    if user.nickname_changed_at is None:
        return

    now = datetime.now(timezone.utc)

    # nickname_changed_at may be timezone-naive if returned without tzinfo
    changed_at = user.nickname_changed_at
    if changed_at.tzinfo is None:
        changed_at = changed_at.replace(tzinfo=timezone.utc)

    elapsed = now - changed_at
    cooldown = timedelta(minutes=_COOLDOWN_MINUTES)

    if elapsed < cooldown:
        remaining = int((cooldown - elapsed).total_seconds())
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=NicknameErrorDetail(
                code="NICKNAME_COOLDOWN",
                message=f"You must wait before changing your nickname again.",
                seconds_remaining=remaining,
            ).model_dump(exclude_none=True),
        )


async def set_nickname(
    user: PublicUser,
    nickname: str,
    db: AsyncSession,
    is_initial: bool,
) -> PublicUser:
    """Validate and apply a nickname to the user.

    Args:
        user: The PublicUser to update.
        nickname: The candidate nickname string (already stripped).
        db: Async DB session.
        is_initial: True when this is the first nickname set (skip cooldown update).

    Returns:
        The updated PublicUser (refreshed from DB).
    """
    script = await validate_nickname(nickname, db, user_id=user.id)

    user.nickname = nickname
    user.nickname_lower = nickname.lower()
    user.nickname_script = script

    if not is_initial:
        user.nickname_changed_at = datetime.now(timezone.utc)

    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
