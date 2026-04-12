from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from loguru import logger
from sqlalchemy import text

from src.auth.discord import (
    discord_auth_router,
    discord_oauth_router,
)
from src.auth.router import auth_router, users_router
from src.auth.service import ensure_admin_exists
from src.config import settings
from src.database import async_session_maker, engine
from src.media.router import router as media_router
from src.posts.router import router as posts_router
from src.raids.router import router as raids_router
from src.tags.router import router as tags_router
from src.timers.router import router as timers_router
from src.timers.seeder import seed_timer_schedule
from src.users.prohibited import prohibited_router
from src.users.router import mod_router as users_mod_router
from src.users.router import router as users_profile_router
from src.users.seeder import seed_prohibited_nicknames


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

    await ensure_admin_exists()

    async with async_session_maker() as session:
        await seed_timer_schedule(session)

    async with async_session_maker() as session:
        await seed_prohibited_nicknames(session)

    yield
    await engine.dispose()
    logger.info("Shutdown — DB engine disposed")


app_configs: dict = {"title": "Rift API", "lifespan": lifespan}
if settings.ENVIRONMENT not in ("local", "staging"):
    app_configs["openapi_url"] = None

app = FastAPI(**app_configs)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
    allow_headers=["Authorization", "Content-Type"],
)

app.include_router(auth_router, prefix="/auth", tags=["auth"])
# Public user profile routes registered BEFORE admin users_router so that
# GET /users/me → public handler (CookieTransport / user_token cookie).
# Admin GET /users/me (BearerTransport) is provided by users_router below but
# is shadowed; the admin panel does not call GET /users/me in practice.
app.include_router(users_profile_router, prefix="/users", tags=["users"])
# Admin user routes (fastapi-users auto-generated: GET/PATCH /users/{id}, etc.)
app.include_router(users_router, prefix="/users", tags=["users"])
# Discord OAuth2 routes
app.include_router(discord_oauth_router, prefix="/auth/discord", tags=["auth:discord"])
app.include_router(discord_auth_router, prefix="/auth/discord", tags=["auth:discord"])
app.include_router(users_mod_router, prefix="/mod/users", tags=["users"])
app.include_router(prohibited_router)
app.include_router(tags_router)
app.include_router(posts_router)
app.include_router(media_router)
app.include_router(timers_router)
app.include_router(raids_router, prefix="/raids", tags=["raids"])

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
