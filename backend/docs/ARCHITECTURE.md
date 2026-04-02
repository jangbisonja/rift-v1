# Rift Backend — Architecture

## Overview

Headless CMS API. FastAPI + PostgreSQL. Serves a content management system for news, articles, promos, and events with rich-text content (TipTap JSON), media uploads, and tag taxonomy.

## Request Lifecycle

```
HTTP request
  → Router          path + method matching, auth guard enforcement
  → Dependencies    entity resolution, DB-level validation (runs before handler)
  → Service         business logic + DB queries
  → Schema          Pydantic serializes response
  → HTTP response
```

No business logic in routers. No HTTP concepts in services.

## Layers

| File | Responsibility |
|---|---|
| `router.py` | Path, method, status codes, auth guards |
| `service.py` | Business logic, DB queries, domain rules |
| `dependencies.py` | Entity resolution (`valid_post_id`), auth enforcement |
| `schemas.py` | Input validation + output serialization |
| `models.py` | SQLAlchemy ORM table definitions |

## Database

### Engines
| Purpose | Driver |
|---|---|
| Runtime (FastAPI) | `postgresql+asyncpg` — non-blocking |
| Migrations (Alembic) | `postgresql+psycopg2` — sync |

Single shared `async_sessionmaker` → per-request sessions via `get_db()` dependency.

### Tables

```
user        UUID PK  fastapi-users managed; superuser flag for admin
post        UUID PK  type + status enums; JSON content + metadata; timestamps
tag         UUID PK  unique name + unique slug
post_tag             M2M join (post ↔ tag); CASCADE both sides
media       UUID PK  nullable FK to post; SET NULL on post delete
```

### Relationships

```
Post ──< post_tag >── Tag    many-to-many via association table
Post ──<  Media              one-to-many; media.post_id nullable
```

All constraint names are explicit via `POSTGRES_INDEXES_NAMING_CONVENTION` on `Base.metadata` — prevents anonymous constraints that break migrations.

## Authentication

### MVP (current)
Email/password → JWT bearer token via **fastapi-users**. Admin seeded in `lifespan` on startup; idempotent (`UserAlreadyExists` skipped silently).

### Planned
Discord OAuth2 for public users. fastapi-users supports multiple `auth_backends` in a list — no structural change needed to add it.

### Guards
- Public endpoints: no dependency
- Admin-only: `dependencies=[Depends(current_superuser)]`

`current_superuser` defined once in `src/auth/router.py`, imported by all other routers.

## File Storage

```
uploads/YYYY/MM/DD/{uuid}.webp
```

- All uploads converted to **WebP** on ingest via Pillow
- RGBA images composited onto white before save (prevents color corruption)
- `Media` DB record stores relative path + original filename
- UUID filename: no collisions, no path traversal, no encoding issues
- Date partitioning: prevents directory bloat; enables archival by date

## Configuration

Two `BaseSettings` classes, one `.env` file, both use `extra="ignore"`:

| Class | File | Fields |
|---|---|---|
| `Config` | `src/config.py` | DB connection, `ENVIRONMENT`, admin credentials |
| `AuthConfig` | `src/auth/config.py` | `JWT_SECRET`, `JWT_ALG`, `JWT_EXP` |

## Migrations

- DB URL injected at runtime from `settings` — never hardcoded in `alembic.ini`
- File naming: `YYYY-MM-DD_description.py`
- Always implement `downgrade()` — migrations must be reversible
- Never edit a migration after it has been applied to any environment
