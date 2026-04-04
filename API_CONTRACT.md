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

**Two post response shapes:**
- `PostListItem` — returned by `GET /posts`: `id, type, status, title, slug, created_at, published_at, tags[], media[], cover_media`. No `content`, no `post_metadata`.
- `PostRead` — returned by `GET /posts/{id}`: all of the above plus `content`, `post_metadata`, `updated_at`.

**Post `content`** — TipTap JSON: `{ "type": "doc", "content": [...] }`

**Post `post_metadata`** — arbitrary JSON; SEO fields + type-specific data (e.g. `promo_code` for `PROMO`)

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
| GET | `/posts` | public | List posts (`?post_type=`, `?post_status=`, `?slug=`, `?limit=`, `?offset=`) → `PostListItem[]` |
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
