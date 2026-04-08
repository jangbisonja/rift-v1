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

Field-level definitions → [`API_CONTRACT.md`](../../API_CONTRACT.md) § Data Shapes.

```
user        fastapi-users managed
post        core content entity
tag         taxonomy label
post_tag    M2M join (post ↔ tag)
media       uploaded file record
```

### Relationships

```
Post ──< post_tag >── Tag    many-to-many via association table
Post ──<  Media              one-to-many; media.post_id nullable
Post ──◇  Media              cover_media_id; nullable FK, SET NULL on delete
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
| `Config` | `src/config.py` | DB connection, `ENVIRONMENT`, admin credentials, `EXPIRY_GRACE_DAYS` |
| `AuthConfig` | `src/auth/config.py` | `JWT_SECRET`, `JWT_ALG`, `JWT_EXP` |

## Migrations

- DB URL injected at runtime from `settings` — never hardcoded in `alembic.ini`
- File naming: `YYYY-MM-DD_description.py`
- Always implement `downgrade()` — migrations must be reversible
- Never edit a migration after it has been applied to any environment

## Future Scaling & Technical Debt

Decisions made to keep the MVP simple. Revisit when the noted trigger condition is met.

### Excerpt Generation
Excerpts (`PostListItem.excerpt`) are computed on-the-fly during Pydantic serialization by walking the TipTap JSON tree for every post returned in a list response. This is correct and fast at current scale (~100 concurrent users, shallow content).

**Trigger to revisit:** If `GET /posts` list latency degrades under profiling.
**Migration path:** Add a `excerpt TEXT` column to the `post` table. Populate it in `service.create()` and `service.update()` alongside `slug`. Remove `inject_excerpt` from `schemas.py`.

### Media Orphan Accumulation
When a Post is deleted, its associated `Media` rows have `post_id` set to `NULL` (via `ondelete="SET NULL"`). The `.webp` files on disk are not deleted. Orphaned files accumulate silently.

**Current mitigation:** The `/mod/media` admin page lists all media, allowing manual deletion.
**Trigger to revisit:** When disk usage becomes a concern or a second admin is added.
**Migration path:** Add a bulk-delete action to the media admin UI, or implement a `purge_unreferenced_media` management script that deletes `Media` rows where `post_id IS NULL AND created_at < now() - interval '30 days'` and calls `storage.delete()` for each.

### Upload Memory Safety
The current upload flow reads the entire file into memory (`await file.read()`) before checking the size limit. The application-level check (`len(content) > MAX_FILE_SIZE_MB * 1024 * 1024`) fires after the allocation.

**Current mitigation:** The Nginx reverse proxy enforces `client_max_body_size 10m` at the transport layer, rejecting oversized requests before they reach FastAPI.
**Trigger to revisit:** If the system moves to a multi-admin model, direct S3/object-storage uploads, or accepts uploads from untrusted sources.
**Migration path:** Replace `await file.read()` with a streaming approach using `file.chunks()` and a running byte counter; raise `FileTooLarge` as soon as the counter exceeds the limit without buffering the full payload.
