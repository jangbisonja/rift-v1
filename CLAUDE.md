# CLAUDE.md — Rift

## Project

Headless CMS. Admin-only writes; public reads. Projected scale: ~100 concurrent users.

## Layout

```
rift-v1/
├── backend/             # FastAPI API — see backend/CLAUDE.md for implementation detail
└── .github/workflows/ci.yml
```

## Local Dev

1. Copy `backend/.env.example` → `backend/.env` and fill in values
2. Ensure a PostgreSQL database is running and accessible
3. `cd backend && alembic upgrade head`
4. `cd backend && uvicorn src.main:app --reload`

## API Contract

Base URL (local): `http://localhost:8000`  
OpenAPI schema: `GET /openapi.json` — available only in `local` and `staging` environments

### Authentication

All write endpoints require a superuser JWT.

```
POST /auth/login
Content-Type: application/x-www-form-urlencoded

username=<email>&password=<password>
→ { "access_token": "...", "token_type": "bearer" }
```

Send as: `Authorization: Bearer <access_token>`

### Key Data Shapes

**IDs** — all PKs are UUIDs (string)

**Enums**
- `PostType`: `NEWS` | `ARTICLE` | `PROMO` | `EVENT`
- `PostStatus`: `DRAFT` | `PUBLISHED`

**Post `content`** — TipTap JSON: `{ "type": "doc", "content": [...] }`

**Post `post_metadata`** — arbitrary JSON; SEO fields + type-specific data (e.g. `promo_code` for `PROMO`)

**Media `path`** — relative path: `uploads/YYYY/MM/DD/{uuid}.webp` — always WebP

### Endpoint Summary

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/auth/login` | public | Get JWT token |
| GET | `/users/me` | user | Current user profile |
| GET | `/posts` | public | List posts (`?type=`, `?status=`, `?slug=`, paginated) |
| GET | `/posts/{id}` | public | Single post |
| POST | `/posts` | superuser | Create post |
| PUT | `/posts/{id}` | superuser | Full update |
| PATCH | `/posts/{id}/publish` | superuser | Publish |
| DELETE | `/posts/{id}` | superuser | Delete |
| GET | `/tags` | public | List tags |
| POST | `/tags` | superuser | Create tag |
| DELETE | `/tags/{id}` | superuser | Delete tag |
| GET | `/media` | superuser | List media (paginated) |
| POST | `/media/upload` | superuser | Upload image (→ WebP) |
| POST | `/media/{id}/attach/{post_id}` | superuser | Link media to post |
| DELETE | `/media/{id}` | superuser | Delete media |
