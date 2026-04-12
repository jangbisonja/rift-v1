# CLAUDE.md — Rift Backend

## Role

Senior Python/FastAPI developer. Write production-quality, async-first code.
Follow conventions exactly — do not invent patterns.

**Before writing code:** Check `docs/MAP.md` to identify which docs apply to your task. Open only those — do not read all docs by default. Exception: always read the **Known Solutions** section of this file; it's compact and prevents repeated mistakes.

## Stack

- FastAPI + SQLAlchemy (async) + PostgreSQL
- fastapi-users (JWT auth), Alembic (migrations), Pydantic v2
- Loguru (logging), Ruff (lint/format), Pillow (WebP conversion)
- python-slugify (slug generation), python-multipart (file uploads)

## Structure

```
backend/
├── src/
│   ├── auth/         # fastapi-users, JWT, admin seed + Discord OAuth2 setup
│   ├── posts/        # Post CRUD + M2M tags
│   ├── media/        # File upload, WebP conversion
│   ├── tags/         # Tag management
│   ├── timers/       # Activity timer schedule (14-toggle grid)
│   ├── users/        # Public user profiles, nicknames, cosmetics, prohibited words
│   ├── config.py     # Global BaseSettings
│   ├── models.py     # DeclarativeBase + naming convention
│   ├── database.py   # Async engine + session
│   ├── exceptions.py # NotFound, BadRequest, Forbidden
│   └── main.py       # App init, lifespan, router registration
├── alembic/          # Migrations (date-named: YYYY-MM-DD_slug.py)
├── tests/            # pytest + pytest-asyncio, session-scoped AsyncClient
├── uploads/          # YYYY/MM/DD/UUID.webp (runtime, not committed)
└── .env.example      # Copy to .env and fill in values — never commit .env
```

Each module: `router.py`, `schemas.py`, `models.py`, `service.py`,
`dependencies.py`, `exceptions.py`, `constants.py`

## Local Dev

1. Copy `backend/.env.example` → `backend/.env` and fill in values
2. Ensure a PostgreSQL database is running and accessible
3. `cd backend && alembic upgrade head`
4. `cd backend && uvicorn src.main:app --reload`

## Data Models

Field definitions and response schemas → `../API_CONTRACT.md`.

- **Post** — core content entity. M2M → tags via `post_tag`. O2M → media. FK → `cover_media_id`.
- **Media** — uploaded file. All uploads converted to WebP.
- **Tag** — taxonomy label. Unique name + auto-generated slug.
- **User** — via `SQLAlchemyBaseUserTableUUID` mixin (fastapi-users).

## Auth

- Admin: email/password login via fastapi-users JWT. Seeded on startup via `lifespan`.
- Users: OAuth2 (Discord) — planned, not implemented. Architecture must support it.
- All admin-only endpoints: `dependencies=[Depends(current_superuser)]`
- Config split: `src/auth/config.py` → `AuthConfig(BaseSettings)` with `JWT_SECRET`, `JWT_ALG`, `JWT_EXP`
- Both `Config` and `AuthConfig` use `extra="ignore"` (share one `.env`)

## Key Conventions

- All PKs: UUID (never integer)
- Slugs: auto-generated via `python-slugify`, stored as unique column
- `POSTGRES_INDEXES_NAMING_CONVENTION` set on `Base.metadata`
- Cross-module imports: `from src.posts import service as posts_service`
- API docs hidden in production: only visible in `local` and `staging`

## Known Solutions

**httpx `ASGITransport` does not trigger ASGI lifespan**
`httpx.AsyncClient(transport=ASGITransport(app=app))` sends HTTP requests to the
ASGI app but does NOT fire `lifespan.startup` / `lifespan.shutdown` events.
This means `_create_admin()` in `lifespan()` never runs during tests.
Fix: add a session-scoped `autouse=True` fixture in `conftest.py` that calls
`_create_admin()` directly before any test runs. The function is idempotent
(`UserAlreadyExists` is silently skipped).

**Forward references in SQLAlchemy ORM models**
Ruff F821 flags `Mapped["Post"]` / `Mapped["Tag"]` as undefined names when the
referenced class lives in another module. Fix: add `from typing import TYPE_CHECKING`
and import the class under `if TYPE_CHECKING:`. This is safe — SQLAlchemy resolves
relationships via the string argument to `relationship("Post", ...)` at runtime,
not through the type annotation.

**UTC timezone enforcement at the connection level**
The VPS server timezone may not be UTC. To guarantee all timestamps are stored
and returned as UTC, `create_async_engine` in `src/database.py` passes
`connect_args={"server_settings": {"timezone": "UTC"}}`. This forces every PostgreSQL
session opened by the pool to run with `timezone=UTC`, regardless of the OS
or `postgresql.conf` setting.

**visibility filter must use SQLAlchemy `or_()`, not raw `text()`**
In `get_all()`, the `end_date` expiry check was originally written as a raw
`text()` clause: `"post.end_date IS NULL OR post.end_date > now() - INTERVAL ..."`.
Because SQL `OR` has lower precedence than `AND`, the raw clause bleeds across
the entire `WHERE`, making the `IS NULL` branch bypass all preceding filters
(`post_type`, `post_status`). In production this caused `GET /posts?post_type=EVENT&visibility=public`
to return PROMO records (and vice versa).
Fix: compute the cutoff in Python (`datetime.now(timezone.utc) - timedelta(days=grace_days)`)
and use `or_(Post.end_date.is_(None), Post.end_date > cutoff)` so SQLAlchemy
wraps the OR in parentheses and it composes correctly with all other WHERE clauses.

**Timezone-aware validation on PostCreate / PostUpdate**
Pydantic v2 silently accepts naive datetime strings (no `+00:00` suffix) for
`datetime` fields. To catch frontend mistakes early, `PostCreate` and
`PostUpdate` both declare a `@field_validator("start_date", "end_date",
mode="after")` that raises `ValueError` if `tzinfo is None`. The frontend
must always send ISO-8601 strings with a UTC offset (e.g. `2024-01-01T00:00:00Z`).

**PostgreSQL `CREATE TYPE` has no `IF NOT EXISTS`**
Unlike `CREATE TABLE` / `CREATE INDEX`, PostgreSQL does not support `CREATE TYPE IF NOT EXISTS` for enum types (it's a syntax error on all versions including PG 16). The idempotent pattern for enum creation in Alembic migrations is a `DO` block:
```sql
DO $$ BEGIN
    CREATE TYPE myenum AS ENUM ('A', 'B');
EXCEPTION WHEN duplicate_object THEN null;
END $$;
```
Additionally, column definitions inside `op.create_table()` must use `postgresql.ENUM(..., create_type=False)` (not `sa.Enum`) to prevent SQLAlchemy from firing a second implicit `CREATE TYPE` via its `_on_table_create` event.

**Two fastapi-users instances — never share**
Admin (`User` table, `BearerTransport`, cookie `token`, 30-min JWT) and public
(`PublicUser` table, `CookieTransport`, cookie `user_token`, 30-day JWT) are
completely independent fastapi-users setups. Admin instance: `src/auth/router.py`.
Public instance: `src/auth/discord.py`. Cookie names must never collide.

**Synthetic email for `PublicUser`**
fastapi-users' `Authenticator` calls `is_active` and other protocol fields via
the user model. `PublicUser` does not extend `SQLAlchemyBaseUserTableUUID` but
must implement the same interface. Solution: add `email`, `hashed_password`,
`is_active`, `is_superuser`, `is_verified` columns to `public_user` table.
The `email` value is synthetic: `discord:{discord_id}@rift.internal`. Never
expose it in `PublicUserRead`.

**Custom `oauth_callback` in `PublicUserManager`**
The standard `BaseUserManager.oauth_callback` creates users by `email` field and
tries `get_by_email`. Our `PublicUser` uses `discord_id` as the primary key for
lookup. Solution: completely override `oauth_callback` in `PublicUserManager`
to look up by `discord_id`, create with synthetic email, and update `discord_username`
on every login. Never call `super().oauth_callback()`.

**Custom Discord OAuth router (not `get_oauth_router`)**
fastapi-users `get_oauth_router` raises 400 if `account_email is None`. Discord
`identify` scope does not guarantee an email. Also, the stock callback returns
204 (CookieTransport) but we need a redirect to the frontend. Solution: custom
`/authorize` + `/callback` endpoints in `src/auth/discord.py` that call
`discord_client.get_id_email`, run our `oauth_callback`, then return a
`RedirectResponse` with the cookie set via `public_cookie_transport._set_login_cookie()`.

**`display_id` auto-nickname pattern — flush before nickname assignment**
`PublicUser.display_id` is `GENERATED ALWAYS AS IDENTITY`. SQLAlchemy populates it
after `session.flush()` via PostgreSQL's `RETURNING` clause. The auto-nickname
(`f"user{new_user.display_id:05d}"`) is assigned directly on the ORM object between
`flush()` and `commit()` in `oauth_callback()` — no extra DB round-trip needed.
`nickname_changed_at` is left NULL so the user can rename immediately without cooldown.

## Docs Maintenance

**You must keep docs in sync with code. No exceptions.**

| Trigger | Action |
|---|---|
| Adding a new module | Add its entry to `docs/MODULES.md` before writing any code |
| Adding or removing an endpoint | Update `../API_CONTRACT.md` (SSOT); `docs/MODULES.md` links there automatically |
| Changing a schema, model, or service behavior | Update that module's entry in `docs/MODULES.md` |
| Adding a new design decision | Add it to the **Design decisions** block of the relevant module |
| Changing auth, storage, config, or DB structure | Update `docs/ARCHITECTURE.md` |
| Adding a new module to `main.py` | Update the **Structure** tree in this file too |
| Discovering a non-obvious solution or gotcha | Add it to **Known Solutions** in this file |
