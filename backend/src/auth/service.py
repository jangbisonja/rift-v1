import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, UUIDIDMixin
from fastapi_users.db import SQLAlchemyUserDatabase
from fastapi_users.exceptions import UserAlreadyExists
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.config import auth_settings
from src.auth.models import User
from src.auth.schemas import UserCreate
from src.config import settings
from src.database import async_session_maker, get_db


async def get_user_db(session: AsyncSession = Depends(get_db)):
    yield SQLAlchemyUserDatabase(session, User)


class UserManager(UUIDIDMixin, BaseUserManager[User, uuid.UUID]):
    reset_password_token_secret = auth_settings.JWT_SECRET
    verification_token_secret = auth_settings.JWT_SECRET

    async def on_after_register(self, user: User, request: Optional[Request] = None):
        logger.info(f"User registered: {user.email}")

    async def on_after_login(
        self,
        user: User,
        request: Optional[Request] = None,
        response=None,
    ):
        logger.info(f"User logged in: {user.email}")


async def get_user_manager(user_db=Depends(get_user_db)):
    yield UserManager(user_db)


async def ensure_admin_exists() -> None:
    """Seed the admin user if it doesn't already exist.

    Consumes fastapi-users DI generators outside of request context.
    Idempotent — silently skips if the admin already exists.
    """
    try:
        async with async_session_maker() as session:
            async for user_db in get_user_db(session):
                async for user_manager in get_user_manager(user_db):
                    try:
                        await user_manager.create(
                            UserCreate(
                                email=settings.ADMIN_EMAIL,
                                password=settings.ADMIN_PASSWORD,
                                is_superuser=True,
                                is_active=True,
                                is_verified=True,
                            )
                        )
                        logger.info(f"Admin created: {settings.ADMIN_EMAIL}")
                    except UserAlreadyExists:
                        logger.info(f"Admin already exists: {settings.ADMIN_EMAIL}")
    except Exception as e:
        logger.error(f"Failed to create admin: {e}")
