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
user                  fastapi-users managed (admin)
post                  core content entity
tag                   taxonomy label
post_tag              M2M join (post ↔ tag)
media                 uploaded file record
public_user           public user profiles (Discord OAuth2)
public_oauth_account  Discord OAuth tokens (managed by fastapi-users)
prohibited_nickname   admin-maintained list of banned nickname words
```

### Relationships

```
Post ──< post_tag >── Tag    many-to-many via association table
Post ──<  Media              one-to-many; media.post_id nullable
Post ──◇  Media              cover_media_id; nullable FK, SET NULL on delete
```

All constraint names are explicit via `POSTGRES_INDEXES_NAMING_CONVENTION` on `Base.metadata` — prevents anonymous constraints that break migrations.

## Authentication

### Two independent user systems

There are two completely separate authentication systems. They must never share tables, cookies, or fastapi-users instances.

| System | User table | Cookie | Transport | Expiry | fastapi-users instance |
|---|---|---|---|---|---|
| Admin | `user` | `token` | `BearerTransport` | 30 min | `fastapi_users` in `src/auth/router.py` |
| Public | `public_user` + `public_oauth_account` | `user_token` | `CookieTransport` | 30 days | `public_fastapi_users` in `src/auth/discord.py` |

### Admin auth (current)
Email/password → JWT bearer token via **fastapi-users**. Admin seeded in `lifespan` on startup; idempotent (`UserAlreadyExists` skipped silently).

### Public user auth (Discord OAuth2)
Discord OAuth2 callback → find/create `PublicUser` by `discord_id` → JWT in HTTP-only cookie `user_token`. Implemented in `src/auth/discord.py`.

The standard fastapi-users `get_oauth_router()` is not used directly — a custom router handles:
1. CSRF validation (state JWT)
2. `account_email`-less flow (Discord `identify` scope doesn't guarantee email)
3. Post-login redirect to frontend (instead of 204)

The `PublicUser` model includes synthetic fastapi-users protocol fields (`email`, `hashed_password`, `is_active`, `is_superuser`, `is_verified`) required by the `Authenticator` for `current_user(active=True)` to work. These are never exposed in `PublicUserRead`.

### Guards
- Public endpoints: no dependency
- Admin-only: `dependencies=[Depends(current_superuser)]`
- Public user routes: `Depends(current_public_user)` from `src.auth.discord`

`current_superuser` defined once in `src/auth/router.py`, imported by all other admin routers.
`current_public_user` defined in `src/auth/discord.py`, imported by `src/users/router.py`.

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

### Detail Page Double Fetch
Public post detail pages currently perform two sequential requests: `GET /posts?slug=X` returns a `PostListItem[]` (no content), then `GET /posts/{id}` returns the full `PostRead`. This is the only way to resolve a slug to a full post with the current API shape.

**Current mitigation:** Both requests are fast (indexed slug lookup + PK lookup). At current scale (~100 concurrent users, SSR) the round-trip cost is negligible.
**Trigger to revisit:** If detail page TTFB becomes a concern under load, or if a CDN/caching layer is introduced.
**Migration path:** Add `GET /posts/slug/{slug}` endpoint returning full `PostRead`. This endpoint replaces the two-step lookup with a single query: `SELECT * FROM post WHERE slug = :slug`. Update `API_CONTRACT.md` and the frontend `getPostBySlug()` client function accordingly.

### Inline Media Reference Tracking
Gallery images attached to a post are tracked via a database FK (`Media.post_id`). However, images inserted inline into TipTap rich text are stored as bare URLs inside the JSON blob — no FK, no DB reference. If an admin deletes a `Media` record that is still referenced by URL inside a post's `content` JSON, the image silently breaks with no error or warning.

**Current mitigation:** Admins are responsible for not deleting media that is in use. The MVP has a single admin, making cross-reference awareness feasible.
**Trigger to revisit:** When a second admin is added, or when media management becomes a regular workflow.
**Migration path:** Implement a reference-tracking system: on every `DELETE /media/{id}` request, scan `post.content` JSON blobs for `src` URLs matching the media path before allowing deletion. If references exist, return a 409 with the list of affected post IDs. Alternatively, add a `media_references` join table populated by a background scan. Either approach requires a full-text or JSON-path query on the `post.content` column — add a GIN index on `post.content` before implementing at scale.
