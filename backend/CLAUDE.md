# CLAUDE.md — Rift Backend

## Role

Senior Python/FastAPI developer. Write production-quality, async-first code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
- `../API_CONTRACT.md` — shared API contract (data shapes, endpoints, auth flow)
- `backend/docs/ARCHITECTURE.md` — system design, layers, DB schema, auth model
- `backend/docs/MODULES.md` — per-module purpose, endpoints, design decisions
- `backend/docs/fastapi/AGENTS.md` — FastAPI patterns and examples

## Stack

- FastAPI + SQLAlchemy (async) + PostgreSQL
- fastapi-users (JWT auth), Alembic (migrations), Pydantic v2
- Loguru (logging), Ruff (lint/format), Pillow (WebP conversion)
- python-slugify (slug generation), python-multipart (file uploads)

## Structure

```
backend/
├── src/
│   ├── auth/         # fastapi-users, JWT, admin seed
│   ├── posts/        # Post CRUD + M2M tags
│   ├── media/        # File upload, WebP conversion
│   ├── tags/         # Tag management
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

**Post** — `id` (UUID PK), `type` (PostType enum), `status` (PostStatus enum),
`title`, `slug` (unique), `content` (JSON/TipTap), `post_metadata` (JSON/SEO only),
`created_at`, `updated_at`, `published_at`. M2M → `tags` via `post_tag`. O2M → `media`.
FK → `cover_media_id` (nullable, `SET NULL on delete`).
Typed nullable columns: `start_date` (TIMESTAMPTZ), `end_date` (TIMESTAMPTZ), `promo_code` (VARCHAR 100, always stored uppercase, enforced in service layer). Used by PROMO and EVENT types. Do NOT store these in `post_metadata`.

Response schemas and data shapes: see `../API_CONTRACT.md`.

**Media** — `id` (UUID PK), `post_id` (FK nullable, SET NULL on delete),
`path` (`uploads/YYYY/MM/DD/UUID.webp`), `original_name`, `created_at`.
All uploads must be converted to WebP on save.

**Tag** — `id` (UUID PK), `name` (unique), `slug` (unique, auto-generated).

**User** — via `SQLAlchemyBaseUserTableUUID` mixin (fastapi-users).

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
`connect_args={"options": "-c timezone=UTC"}`. This forces every PostgreSQL
session opened by the pool to run with `timezone=UTC`, regardless of the OS
or `postgresql.conf` setting.

**Timezone-aware validation on PostCreate / PostUpdate**
Pydantic v2 silently accepts naive datetime strings (no `+00:00` suffix) for
`datetime` fields. To catch frontend mistakes early, `PostCreate` and
`PostUpdate` both declare a `@field_validator("start_date", "end_date",
mode="after")` that raises `ValueError` if `tzinfo is None`. The frontend
must always send ISO-8601 strings with a UTC offset (e.g. `2024-01-01T00:00:00Z`).

## Docs Maintenance

**You must keep docs in sync with code. No exceptions.**

| Trigger | Action |
|---|---|
| Adding a new module | Add its entry to `docs/MODULES.md` before writing any code |
| Adding or removing an endpoint | Update that module's **Endpoints** list in `docs/MODULES.md` |
| Changing a schema, model, or service behavior | Update that module's entry in `docs/MODULES.md` |
| Adding a new design decision | Add it to the **Design decisions** block of the relevant module |
| Changing auth, storage, config, or DB structure | Update `docs/ARCHITECTURE.md` |
| Adding a new module to `main.py` | Update the **Structure** tree in this file too |
| Discovering a non-obvious solution or gotcha | Add it to **Known Solutions** in this file |
