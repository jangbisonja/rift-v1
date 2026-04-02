from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi_users.exceptions import UserAlreadyExists
from loguru import logger
from sqlalchemy import text

from src.auth.router import auth_router, users_router
from src.auth.schemas import UserCreate
from src.auth.service import get_user_db, get_user_manager
from src.config import settings
from src.database import async_session_maker, engine
from src.media.router import router as media_router
from src.posts.router import router as posts_router
from src.tags.router import router as tags_router


async def _create_admin() -> None:
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting up — checking DB connection...")
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("DB connection OK")
    except Exception as e:
        logger.error(f"DB connection FAILED: {e}")
        raise

    await _create_admin()
    yield
    await engine.dispose()
    logger.info("Shutdown — DB engine disposed")


app_configs: dict = {"title": "Rift API", "lifespan": lifespan}
if settings.ENVIRONMENT not in ("local", "staging"):
    app_configs["openapi_url"] = None

app = FastAPI(**app_configs)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(users_router, prefix="/users", tags=["users"])
app.include_router(tags_router)
app.include_router(posts_router)
app.include_router(media_router)

Path("uploads").mkdir(exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")


@app.get("/health", tags=["system"])
async def health():
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected", "env": settings.ENVIRONMENT}
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        return {"status": "error", "db": str(e)}
