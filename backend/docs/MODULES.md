# Rift Backend — Module Reference

Each module lives at `src/{module}/` and owns a vertical slice of one domain.
Files per module: `router.py`, `schemas.py`, `models.py`, `service.py`, `dependencies.py`, `exceptions.py`, `constants.py`

---

## `auth`

**Purpose**: User identity, login, and access control.

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

**Key files**:
- `models.py` — `User` extends `SQLAlchemyBaseUserTableUUID`; `PublicOAuthAccount` extends `SQLAlchemyBaseOAuthAccountTableUUID` with `user_id` FK overriding the mixin default to point to `public_user.id`
- `service.py` — `get_user_db` generator + `UserManager` subclass for lifecycle hooks
- `router.py` — configures `BearerTransport`, `JWTStrategy`, `AuthenticationBackend`, `FastAPIUsers`; exports `current_user`, `current_superuser`, `auth_router`, `users_router`
- `config.py` — `AuthConfig(BaseSettings)`: `JWT_SECRET`, `JWT_ALG`, `JWT_EXP`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`, `FRONTEND_URL`, `APP_ENV`
- `discord.py` — separate `FastAPIUsers` instance for public users; `CookieTransport` (`user_token`), 30-day JWT; custom OAuth2 callback with redirect; `current_public_user` dependency

**Design decisions**:
- **fastapi-users over custom auth**: battle-tested password hashing, token lifecycle, schema scaffolding — saves ~200 lines of boilerplate
- **JWT only (no sessions)**: stateless; fits headless CMS where frontend holds the token
- **No server-side logout endpoint**: JWT is stateless — there is no token registry to invalidate. Logout is handled client-side by deleting the HTTP-only cookie. A server-side denylist is out of scope for v1; fastapi-users does not provide one either.
- **Admin seeded in `lifespan`**: system is always operable after a fresh migration without manual SQL
- **`current_superuser` exported from this module**: auth guard defined once, imported everywhere via `from src.auth.router import current_superuser`

---

## `posts`

**Purpose**: Core content management — create, read, update, publish, and delete content items.

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

**Key files**:
- `constants.py` — `PostType` enum: `NEWS`, `ARTICLE`, `PROMO`, `EVENT`; `PostStatus` enum: `DRAFT`, `PUBLISHED`, `ARCHIVE`
- `models.py` — `Post` (UUID PK, type, status, title, slug, JSON content, JSON metadata, timestamps, `cover_media_id` FK, `start_date` TIMESTAMPTZ nullable, `end_date` TIMESTAMPTZ nullable, `promo_code` VARCHAR(100) nullable always-uppercase); `post_tag` M2M table
- `schemas.py` — `PostCreate`, `PostUpdate`, `PostRead` (full), `PostListItem` (lightweight list shape; includes computed `excerpt` field); all four schemas carry `start_date`, `end_date`, `promo_code`
- `service.py` — CRUD + `publish()`, `unpublish()`, `archive()`; slug uniqueness enforced here; `extract_excerpt(content, word_limit=10)` pure utility (no DB access); `promo_code` forced uppercase on create and update; `get_all()` accepts `visibility` param — when `"public"` applies `EXPIRY_GRACE_DAYS`-based expiry filter
- `dependencies.py` — `valid_post_id`: resolves post by UUID, raises `PostNotFound` if missing

**Design decisions**:
- **`content` as JSON (TipTap format)**: schema-agnostic to editor version changes; frontend handles rendering
- **`post_metadata` as JSON**: SEO fields only — arbitrary JSON. Type-specific data (`promo_code`, `start_date`, `end_date`) are dedicated nullable columns, not stored here.
- **Typed nullable columns (`start_date`, `end_date`, `promo_code`)**: promoted from `post_metadata` to top-level columns to enable server-side filtering (expiry) and enforce invariants (uppercase `promo_code`) without parsing arbitrary JSON.
- **`EXPIRY_GRACE_DAYS` config (`src/config.py`, default 7)**: number of days past `end_date` that items remain visible on public-facing pages. Applied only when `?visibility=public` is sent to `GET /posts`.
- **Separate `PostListItem` schema**: list endpoints omit `content` and `post_metadata` to reduce payload size; `excerpt` is computed at serialization time via a Pydantic `model_validator(mode="before")` that reads `content` off the ORM object without exposing it as an output field
- **`excerpt` computed in schema validator, not service**: the list query returns ORM objects directly; injecting excerpt in a `mode="before"` validator keeps the router unchanged and avoids a second pass over the result set
- **`publish()` as a dedicated service method**: explicit business operation with its own timestamp (`published_at`), making the publish event auditable and distinguishable from a plain update
- **Slug auto-generated from title via `python-slugify`**: consistent, URL-safe slugs; client never computes them
- **`cover_media_id` as FK on Post (not via attach endpoint)**: cover image is a deliberate editorial choice, distinct from body media; set directly on create/update. TipTap-uploaded images must NOT be attached to the post via the media attach endpoint — they are unattached assets referenced only within `content` JSON.
- **Circular FK handled with `use_alter=True`**: `post.cover_media_id → media.id` and `media.post_id → post.id` form a cycle. `use_alter=True` defers the FK constraint to `ALTER TABLE` so `create_all()` succeeds. All relationships specify `foreign_keys` explicitly to avoid SQLAlchemy `AmbiguousForeignKeys` errors.
- **`cover_media_id` update uses `model_fields_set`**: distinguishes "field omitted" (no-op) from "field explicitly set to null" (clears cover). Other nullable fields on `PostUpdate` do not need this because setting them to null is not a meaningful operation.

---

## `media`

**Purpose**: File upload and management — accepts images, converts to WebP, stores on disk, optionally links to a post.

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

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

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

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

## `timers`

**Purpose**: Store and serve the 14-toggle activity schedule (2 event types × 7 days) for World Boss and Rift world events. Admin writes; public reads.

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

**Key files**:
- `constants.py` — `TimerType` enum: `WORLD_BOSS`, `RIFT`
- `models.py` — `TimerSchedule` (UUID PK, `timer_type` enum NOT NULL, `day_of_week` SMALLINT NOT NULL 0–6, `is_active` BOOLEAN NOT NULL default false); unique constraint on `(timer_type, day_of_week)`
- `schemas.py` — `TimerScheduleResponse` and `TimerScheduleUpdate`: both carry `world_boss: list[bool]` (7 elements) and `rift: list[bool]` (7 elements); index 0 = Monday, index 6 = Sunday (ISO 8601)
- `service.py` — `get_schedule()`: queries all 14 rows, assembles two 7-element arrays; `update_schedule()`: atomically UPDATEs all 14 `is_active` values from input arrays (no DELETE+INSERT)
- `seeder.py` — `seed_timer_schedule()`: idempotent; inserts all 14 rows (existence check per row) if absent, all defaulting to `is_active=False`; called from `main.py` lifespan startup

**Design decisions**:
- **14 rows always present (seeder guarantee)**: eliminates NULL-handling in service — `get_schedule()` never needs to handle missing rows; gaps in the schedule are impossible at runtime
- **UPDATE per row, not DELETE+INSERT**: preserves row UUIDs and avoids FK/constraint churn; atomicity is application-level (all updates in one session before `commit()`)
- **No timezone logic in backend**: the backend stores a static boolean grid only. All MSK conversion, in-game day calculation, and countdown logic live entirely on the frontend (RULES.md #W1, #W3; TIMERS.md algorithm)
- **`GET /timers/schedule` is public**: countdown bar is visible to all users without login (RULES.md #W4); only the PUT write endpoint requires superuser auth

---

---

## `users`

**Purpose**: Public user profiles — nickname management, admin-assigned cosmetics, and prohibited nickname enforcement for Discord-authenticated users.

**Endpoints**: see [`API_CONTRACT.md`](../../API_CONTRACT.md).

**Key files**:
- `constants.py` — `NicknameScript` enum: `CYRILLIC`, `LATIN`; `UserBadge` enum: `VERIFIED`, `FOUNDER`
- `models.py` — `PublicUser` (UUID PK, `discord_id`, `discord_username`, `nickname`, `nickname_lower`, `nickname_script`, `nickname_color`, `badge`, `nickname_changed_at`, timestamps; also includes fastapi-users protocol fields); `ProhibitedNickname` (UUID PK, `word` stored lowercase)
- `schemas.py` — `PublicUserRead` (public API shape; omits `nickname_lower`, email, and internal fastapi-users fields); `NicknameUpdate` (strips whitespace); `NicknameErrorDetail` (structured error with `code`, `message`, `seconds_remaining`); `CosmeticsUpdate`
- `service.py` — `validate_nickname()`: length → script → prohibited → uniqueness checks, raises 422 with `NicknameErrorDetail`; `check_cooldown()`: 10-minute cooldown on updates (not initial set); `set_nickname()`: validates and persists nickname + script + `nickname_lower`
- `router.py` — `PATCH /users/me/nickname` (public user, cooldown-gated); `PATCH /mod/users/{id}/cosmetics` (superuser)
- `prohibited.py` — service + router for `GET/POST/DELETE /mod/prohibited-nicknames`
- `seeder.py` — idempotent startup seed of 14 baseline reserved words; called from `main.py` lifespan

**Design decisions**:
- **Separate `public_user` table from `user`**: admin and public user systems are completely independent; no shared tables, cookies, or fastapi-users instances (see `ARCHITECTURE.md`)
- **`nickname_lower` as a real stored column**: enables a simple DB UNIQUE index for case-insensitive uniqueness (RULES.md #N2). Not computed — stored explicitly so the constraint is enforceable without function indexes.
- **Custom `PublicUserManager.oauth_callback`**: overrides BaseUserManager because (a) `PublicUser` has no email/password and (b) we use `discord_id` (not email) for user lookup. The base class `oauth_callback` is not called.
- **Synthetic `email` field on `PublicUser`**: fastapi-users' `Authenticator` requires an `email` column on the user model. We store `discord:{discord_id}@rift.internal` — it is never exposed in the API and never used for login.
- **10-minute cooldown on nickname updates, not initial set**: `nickname_changed_at` is `NULL` for users who have never updated their nickname (initial set doesn't count). Cooldown only triggers on the second and subsequent changes.
- **`badge` and `nickname_color` admin-assigned only**: not settable via `PATCH /users/me` — only via `PATCH /mod/users/{id}/cosmetics`. The `PublicUserUpdate` schema inherits from `BaseUserUpdate` and deliberately exposes no cosmetics fields.

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
