"""Prohibited nickname management — service + router."""

import uuid
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.router import current_superuser
from src.database import get_db
from src.users.models import ProhibitedNickname


# ---------------------------------------------------------------------------
# Schemas (local — no separate schemas.py needed for this simple resource)
# ---------------------------------------------------------------------------


class ProhibitedNicknameRead(BaseModel):
    id: uuid.UUID
    word: str

    class Config:
        from_attributes = True


class ProhibitedNicknameCreate(BaseModel):
    word: str


# ---------------------------------------------------------------------------
# Service helpers
# ---------------------------------------------------------------------------


async def list_prohibited(db: AsyncSession) -> List[ProhibitedNickname]:
    result = await db.execute(select(ProhibitedNickname).order_by(ProhibitedNickname.word))
    return list(result.scalars().all())


async def add_prohibited(word: str, db: AsyncSession) -> ProhibitedNickname:
    normalized = word.strip().lower()
    if not normalized:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Word must not be empty.",
        )

    # Idempotency: return existing entry if already present
    existing = await db.execute(
        select(ProhibitedNickname).where(ProhibitedNickname.word == normalized)
    )
    entry = existing.scalar_one_or_none()
    if entry is not None:
        return entry

    new_entry = ProhibitedNickname(id=uuid.uuid4(), word=normalized)
    db.add(new_entry)
    await db.commit()
    await db.refresh(new_entry)
    return new_entry


async def delete_prohibited(entry_id: uuid.UUID, db: AsyncSession) -> None:
    result = await db.execute(
        select(ProhibitedNickname).where(ProhibitedNickname.id == entry_id)
    )
    entry = result.scalar_one_or_none()
    if entry is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Prohibited nickname entry not found.",
        )
    await db.delete(entry)
    await db.commit()


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

prohibited_router = APIRouter(
    prefix="/mod/prohibited-nicknames",
    tags=["users"],
    dependencies=[Depends(current_superuser)],
)


@prohibited_router.get(
    "",
    response_model=List[ProhibitedNicknameRead],
    summary="List prohibited nicknames",
)
async def get_prohibited(db: AsyncSession = Depends(get_db)):
    return await list_prohibited(db)


@prohibited_router.post(
    "",
    response_model=ProhibitedNicknameRead,
    status_code=status.HTTP_201_CREATED,
    summary="Add a prohibited nickname word",
)
async def create_prohibited(
    payload: ProhibitedNicknameCreate,
    db: AsyncSession = Depends(get_db),
):
    return await add_prohibited(payload.word, db)


@prohibited_router.delete(
    "/{entry_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Remove a prohibited nickname word",
)
async def remove_prohibited(
    entry_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
):
    await delete_prohibited(entry_id, db)
