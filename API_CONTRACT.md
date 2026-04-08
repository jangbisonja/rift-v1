# API Contract — Rift

This is the shared contract between backend and frontend. Both sides must treat this
as the source of truth. If the backend changes an endpoint, this file is updated first.

Base URL (local): `http://localhost:8000`
OpenAPI schema: `GET /openapi.json` — available only in `local` and `staging` environments

## Authentication

All write endpoints require a superuser JWT.

```
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=<email>&password=<password>
→ { "access_token": "...", "token_type": "bearer" }
```

Send as: `Authorization: Bearer <access_token>`

## Key Data Shapes

**IDs** — all PKs are UUIDs (string)

**Enums**
- `PostType`: `NEWS` | `ARTICLE` | `PROMO` | `EVENT`
- `PostStatus`: `DRAFT` | `PUBLISHED` | `ARCHIVE`
- `TimerType`: `WORLD_BOSS` | `RIFT`

**Timer schedule shape (`TimerSchedule`):**
```json
{
  "world_boss": [false, false, false, false, false, false, false],
  "rift":       [false, false, false, false, false, false, false]
}
```
Array index 0 = Monday, index 6 = Sunday (ISO 8601). Both arrays always contain exactly 7 elements.

**Two post response shapes:**
- `PostListItem` — returned by `GET /posts`: `id, type, status, title, slug, excerpt, created_at, published_at, tags[], media[], cover_media, start_date, end_date, promo_code, external_link, redirect_to_external`. No `content`, no `post_metadata`.
  - `excerpt: string` — first 10 words of plain text extracted from `content`, computed by the backend. Empty string if content is empty.
  - `start_date: string | null` — ISO 8601 datetime with UTC offset (e.g. `"2026-04-01T00:00:00+03:00"`). Null if not set.
  - `end_date: string | null` — same format. Null if not set (item is indefinite/ongoing).
  - `promo_code: string | null` — always uppercase. Null for non-PROMO types.
  - `external_link: string | null` — external URL. Used by EVENT type. Null if not set.
  - `redirect_to_external: boolean` — if `true`, archive cards should link directly to `external_link` (new tab) instead of the internal post page. EVENT-specific; always `false` for other types.
- `PostRead` — returned by `GET /posts/{id}`: all of the above plus `content`, `post_metadata`, `updated_at`.

**Post `content`** — TipTap JSON: `{ "type": "doc", "content": [...] }`

**Post `post_metadata`** — arbitrary JSON; SEO fields only. Type-specific data (`promo_code`, `start_date`, `end_date`) has moved to dedicated top-level columns — do not put them in `post_metadata`.

**Typed post fields** — stored as dedicated nullable columns on the `post` table (not in `post_metadata` JSON):
- `start_date` / `end_date`: `TIMESTAMPTZ` in PostgreSQL. Returned as ISO 8601 with UTC offset. Used by PROMO and EVENT types. Null means not set.
- `promo_code`: `VARCHAR`, always stored uppercase (enforced server-side). Used by PROMO type only. Null for all other types.
- `external_link`: `VARCHAR`, nullable. Used by EVENT type. Stored as-is (no normalization). Null if not set.
- `redirect_to_external`: `BOOLEAN`, not null, default `false`. EVENT-specific. When `true`, archive cards link directly to `external_link` (new tab) instead of the internal post page. The internal detail page always remains accessible via its slug URL.
- `days_remaining` is computed on the frontend: `end_date` (in Moscow time) minus now (in Moscow time), floored to 0. Display as "Осталось N дней" / "Истёк" when 0.

**Expiry visibility** — controlled server-side via `EXPIRY_GRACE_DAYS` env var (integer, default 7).
- Homepage (`visibility=public`): returns items where `end_date IS NULL OR end_date > now() - INTERVAL '{EXPIRY_GRACE_DAYS} days'`
- Category/admin pages (`visibility=all`, default): no expiry filter applied.

**Post `cover_media`** — `MediaRead | null`. The designated cover image for the post. Set via `cover_media_id` in create/update requests. Distinct from `media[]` (body media attached via the attach endpoint). TipTap-uploaded images must NOT be attached via the attach endpoint — they are unattached assets referenced only within `content` JSON.

**Media `path`** — relative path: `uploads/YYYY/MM/DD/{uuid}.webp` — always WebP.
Served as static files at `GET /uploads/...` (no auth required).
Full URL: `{BASE_URL}/{media.path}`

**Media in posts** — `MediaRead` shape (inside `PostListItem`/`PostRead`): `id, path, original_name` only.
The standalone `GET /media` endpoint returns a fuller shape that also includes `post_id, created_at`.

## Endpoint Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/health` | public | Health check → `{ status, db, env }` |
| POST | `/auth/login` | public | Get JWT token |
| GET | `/users/me` | user | Current user profile |
| PATCH | `/users/me` | user | Update current user (provided by fastapi-users; not used by frontend admin panel) |
| GET | `/posts` | public | List posts (`?post_type=`, `?post_status=`, `?slug=`, `?limit=`, `?offset=`, `?visibility=public\|all`) → `PostListItem[]` |
| GET | `/posts/{id}` | public | Single post → `PostRead` (includes content) |
| POST | `/posts` | superuser | Create post |
| PUT | `/posts/{id}` | superuser | Full update |
| PATCH | `/posts/{id}/publish` | superuser | Publish (sets `published_at`) |
| PATCH | `/posts/{id}/unpublish` | superuser | Revert to DRAFT |
| PATCH | `/posts/{id}/archive` | superuser | Move to ARCHIVE |
| DELETE | `/posts/{id}` | superuser | Delete |
| GET | `/tags` | public | List tags |
| POST | `/tags` | superuser | Create tag |
| DELETE | `/tags/{id}` | superuser | Delete tag |
| GET | `/media` | superuser | List media (`?limit=`, `?offset=`) → `Media[]` |
| POST | `/media/upload` | superuser | Upload image (→ WebP) |
| POST | `/media/{id}/attach/{post_id}` | superuser | Link media to post |
| DELETE | `/media/{id}` | superuser | Delete media |
| GET | `/timers/schedule` | public | Current 14-toggle schedule → `TimerSchedule` |
| PUT | `/timers/schedule` | superuser | Bulk-replace all 14 toggles → `TimerSchedule` |
