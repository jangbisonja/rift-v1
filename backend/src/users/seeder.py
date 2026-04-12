"""Seed the prohibited_nickname table with the baseline impersonation/reserved list."""

import uuid

from loguru import logger
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.users.models import ProhibitedNickname

# Baseline list from AUTH.md § Prohibited Nickname List
# Stored lowercase — matching is case-insensitive via nickname_lower
_SEED_WORDS = [
    "admin",
    "moder",
    "moderator",
    "support",
    "staff",
    "rift",
    "bot",
    "system",
    "official",
    "help",
    "dev",
    "owner",
    "game",
    "gm",
]


async def seed_prohibited_nicknames(session: AsyncSession) -> None:
    """Idempotently insert seed words into prohibited_nickname table.

    Only inserts words not already present. Safe to call on every startup.
    """
    inserted = 0
    for word in _SEED_WORDS:
        existing = await session.execute(
            select(ProhibitedNickname).where(ProhibitedNickname.word == word)
        )
        if existing.scalar_one_or_none() is None:
            session.add(ProhibitedNickname(id=uuid.uuid4(), word=word))
            inserted += 1

    if inserted:
        await session.commit()
        logger.info(f"Prohibited nickname seed: inserted {inserted} word(s)")
    else:
        logger.info("Prohibited nickname seed: all words already present")
