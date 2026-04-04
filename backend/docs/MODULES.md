# Rift Backend — Module Reference

Each module lives at `src/{module}/` and owns a vertical slice of one domain.
Files per module: `router.py`, `schemas.py`, `models.py`, `service.py`, `dependencies.py`, `exceptions.py`, `constants.py`

---

## `auth`

**Purpose**: User identity, login, and access control.

**Endpoints**:
- `POST /auth/login` — email/password → JWT token (public)
- `POST /auth/logout` — invalidate token (authenticated)
- `GET /users/me` — current user profile (authenticated)
- `PATCH /users/me` — update own profile (authenticated)

**Key files**:
- `models.py` — `User` extends `SQLAlchemyBaseUserTableUUID`; no extra columns yet
- `service.py` — `get_user_db` generator + `UserManager` subclass for lifecycle hooks
- `router.py` — configures `BearerTransport`, `JWTStrategy`, `AuthenticationBackend`, `FastAPIUsers`; exports `current_user`, `current_superuser`, `auth_router`, `users_router`
- `config.py` — `AuthConfig(BaseSettings)`: `JWT_SECRET`, `JWT_ALG`, `JWT_EXP`

**Design decisions**:
- **fastapi-users over custom auth**: battle-tested password hashing, token lifecycle, schema scaffolding — saves ~200 lines of boilerplate
- **JWT only (no sessions)**: stateless; fits headless CMS where frontend holds the token
- **Admin seeded in `lifespan`**: system is always operable after a fresh migration without manual SQL
- **`current_superuser` exported from this module**: auth guard defined once, imported everywhere via `from src.auth.router import current_superuser`

---

## `posts`

**Purpose**: Core content management — create, read, update, publish, and delete content items.

**Endpoints**:
- `GET /posts` — list posts, filterable by `type`/`status`/`slug`, paginated (public)
- `GET /posts/{id}` — single post (public)
- `POST /posts` — create (superuser)
- `PUT /posts/{id}` — full update (superuser)
- `PATCH /posts/{id}/publish` — set status to PUBLISHED, records `published_at` (superuser)
- `PATCH /posts/{id}/unpublish` — set status back to DRAFT (superuser)
- `PATCH /posts/{id}/archive` — set status to ARCHIVE (superuser)
- `DELETE /posts/{id}` — delete (superuser)

**Key files**:
- `constants.py` — `PostType` enum: `NEWS`, `ARTICLE`, `PROMO`, `EVENT`; `PostStatus` enum: `DRAFT`, `PUBLISHED`, `ARCHIVE`
- `models.py` — `Post` (UUID PK, type, status, title, slug, JSON content, JSON metadata, timestamps, `cover_media_id` FK); `post_tag` M2M table
- `schemas.py` — `PostCreate`, `PostUpdate`, `PostRead` (full), `PostList` (lightweight)
- `service.py` — CRUD + `publish()`, `unpublish()`, `archive()`; slug uniqueness enforced here
- `dependencies.py` — `valid_post_id`: resolves post by UUID, raises `PostNotFound` if missing

**Design decisions**:
- **`content` as JSON (TipTap format)**: schema-agnostic to editor version changes; frontend handles rendering
- **`post_metadata` as JSON**: SEO fields + type-specific data (e.g. `promo_code` for PROMO) live here — avoids nullable columns per content type
- **Separate `PostList` schema**: list endpoints omit `content` and `media` to reduce payload size
- **`publish()` as a dedicated service method**: explicit business operation with its own timestamp (`published_at`), making the publish event auditable and distinguishable from a plain update
- **Slug auto-generated from title via `python-slugify`**: consistent, URL-safe slugs; client never computes them
- **`cover_media_id` as FK on Post (not via attach endpoint)**: cover image is a deliberate editorial choice, distinct from body media; set directly on create/update. TipTap-uploaded images must NOT be attached to the post via the media attach endpoint — they are unattached assets referenced only within `content` JSON.
- **Circular FK handled with `use_alter=True`**: `post.cover_media_id → media.id` and `media.post_id → post.id` form a cycle. `use_alter=True` defers the FK constraint to `ALTER TABLE` so `create_all()` succeeds. All relationships specify `foreign_keys` explicitly to avoid SQLAlchemy `AmbiguousForeignKeys` errors.
- **`cover_media_id` update uses `model_fields_set`**: distinguishes "field omitted" (no-op) from "field explicitly set to null" (clears cover). Other nullable fields on `PostUpdate` do not need this because setting them to null is not a meaningful operation.

---

## `media`

**Purpose**: File upload and management — accepts images, converts to WebP, stores on disk, optionally links to a post.

**Endpoints**:
- `GET /media` — list all media, paginated (superuser)
- `POST /media/upload` — upload file, returns `Media` record (superuser)
- `POST /media/{id}/attach/{post_id}` — link existing media to a post (superuser)
- `DELETE /media/{id}` — delete record + file from disk (superuser)

**Key files**:
- `models.py` — `Media` (UUID PK, `post_id` FK nullable, `path`, `original_name`, `created_at`)
- `service.py` — `upload()`: WebP conversion + date-partitioned path + disk write + DB record; `attach_to_post()`, `get_by_id()`, `delete()` (removes file from disk too)
- `dependencies.py` — `valid_media_id`: resolves media by UUID

**Design decisions**:
- **`post_id` nullable with `SET NULL` on post delete**: media can be uploaded before a post exists (decouple upload from publish flow); orphaned automatically when post is deleted rather than cascading
- **WebP on ingest**: single format across all stored media; simplifies CDN/cache rules; smaller files vs JPEG/PNG
- **UUID filename**: no collisions, no path traversal, no character encoding issues
- **RGBA handling**: images with transparency composited onto white before WebP save to prevent color corruption

---

## `tags`

**Purpose**: Content taxonomy — create and manage labels that attach to posts via M2M.

**Endpoints**:
- `GET /tags` — list all tags (public)
- `POST /tags` — create tag (superuser)
- `DELETE /tags/{id}` — delete tag (superuser)

**Key files**:
- `models.py` — `Tag` (UUID PK, `name` unique, `slug` unique)
- `schemas.py` — `TagCreate`, `TagRead`
- `service.py` — `get_all()`, `get_by_id()`, `create()` (slug auto-generated, duplicate check), `delete()`
- `dependencies.py` — `valid_tag_id`: resolves tag by UUID

**Design decisions**:
- **Tags are global, not per-user**: a tag is reused across posts via M2M — enables tag-based filtering without duplicating labels
- **Slug stored separately from name**: slug stays stable even if display name is corrected (e.g. capitalisation)
- **No `PUT` endpoint**: tag names treated as stable identifiers; renaming is delete + create to keep slug history clean

---

## Global Files

### `src/main.py`
App entry point. Registers all routers, configures OpenAPI visibility by environment, runs `lifespan` (DB connectivity check + admin seed).

### `src/config.py`
`Config(BaseSettings)` reads from `.env`. Provides `database_url` (asyncpg) and `database_url_sync` (psycopg2) as computed properties.

### `src/database.py`
Shared async engine + `async_sessionmaker`. Provides `get_db()` async generator used as a FastAPI dependency across all routers.

### `src/models.py`
`Base(DeclarativeBase)` with `POSTGRES_INDEXES_NAMING_CONVENTION` on metadata. All ORM models inherit from this `Base`.

### `src/exceptions.py`
Global HTTP exception classes: `NotFound` (404), `BadRequest` (400), `Forbidden` (403). Domain modules subclass these or raise `HTTPException` directly.
