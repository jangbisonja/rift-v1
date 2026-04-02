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
├── uploads/          # YYYY/MM/DD/UUID.webp
└── .env.example      # Copy to .env and fill in values — never commit .env
```

Each module: `router.py`, `schemas.py`, `models.py`, `service.py`,
`dependencies.py`, `exceptions.py`, `constants.py`

## Data Models

**Post** — `id` (UUID PK), `type` (PostType enum), `status` (PostStatus enum),
`title`, `slug` (unique), `content` (JSON/TipTap), `post_metadata` (JSON/SEO),
`created_at`, `updated_at`, `published_at`. M2M → `tags` via `post_tag`. O2M → `media`.

**PostType**: `NEWS`, `ARTICLE`, `PROMO`, `EVENT`
**PostStatus**: `DRAFT`, `PUBLISHED`

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
