# CLAUDE.md — Rift Backend

## Role

Senior Python/FastAPI developer. Write production-quality, async-first code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
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
`title`, `slug` (unique), `content` (JSON/TipTap), `post_metadata` (JSON/SEO),
`created_at`, `updated_at`, `published_at`. M2M → `tags` via `post_tag`. O2M → `media`.
FK → `cover_media_id` (nullable, `SET NULL on delete`) — see Cover Image task below.

Two response schemas:
- `PostList` — list endpoint shape: excludes `content`, `post_metadata`, `updated_at`. Includes `media[]`.
- `PostRead` — detail endpoint shape: full post including all fields and `media[]`.

### Pending: Cover Image (`cover_media_id`)

**Context:** The frontend currently uses `post.media[0]` as the cover image — a positional
convention with no semantic backing. This breaks when body images uploaded via the rich
text editor are also attached to `post.media[]`. Full analysis in `frontend/docs/ARCHITECTURE.md`.

**Required backend changes:**

1. **Migration** — add nullable FK column to `post`:
   ```sql
   ALTER TABLE post
     ADD COLUMN cover_media_id UUID REFERENCES media(id) ON DELETE SET NULL;
   ```
   Create as `2026-04-xx_add-cover-media-id.py` (date-named, Alembic autogenerate or hand-written).

2. **`Post` model** (`src/posts/models.py`) — add:
   ```python
   cover_media_id: Mapped[uuid.UUID | None] = mapped_column(
       UUID(as_uuid=True), ForeignKey("media.id", ondelete="SET NULL"), nullable=True
   )
   cover_media: Mapped["Media | None"] = relationship(
       "Media", foreign_keys=[cover_media_id], lazy="selectin"
   )
   ```
   Note: `media` relationship uses `back_populates="post"` from the `Media` side — the new
   `cover_media` relationship is a second relationship to `Media` with an explicit `foreign_keys`
   arg to disambiguate.

3. **`PostCreate` / `PostUpdate` schemas** — add optional field:
   ```python
   cover_media_id: uuid.UUID | None = None
   ```

4. **`PostList` + `PostRead` response schemas** — add:
   ```python
   cover_media: MediaRead | None = None
   ```
   where `MediaRead` is `id, path, original_name` only (same shape already used for `media[]` items).

5. **Service layer** (`src/posts/service.py`) — `create_post` and `update_post` must
   accept and persist `cover_media_id`. No special logic needed — it's a plain nullable FK.

**API contract change (update `rift-v1/CLAUDE.md` after implementing):**
- `POST /posts` and `PUT /posts/{id}` bodies gain optional `cover_media_id: string | null`
- `PostListItem` and `PostRead` responses gain `cover_media: MediaRead | null`

**PostType**: `NEWS`, `ARTICLE`, `PROMO`, `EVENT`
**PostStatus**: `DRAFT`, `PUBLISHED`, `ARCHIVE`

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
