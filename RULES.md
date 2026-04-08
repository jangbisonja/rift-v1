# Business Rules — Rift

These are system invariants. Every rule below MUST be satisfied by any new code.
Before implementing a feature, scan this file for applicable rules. If your code
would violate any rule, stop and raise the conflict.

## How to use this file

- Rules are numbered and permanent. Do not renumber.
- Each rule states: what the invariant is, which layer enforces it, and where.
- When adding a new rule, append to the relevant section with the next number.
- Both `backend/CLAUDE.md` and `frontend/CLAUDE.md` reference this file.
  Domain files must NOT restate rules — reference by number (e.g., "see RULES.md #T1").

---

## Timezone & Locale

- **T1** — All timestamps stored as UTC in PostgreSQL (`TIMESTAMPTZ`). Connection-level enforcement: `server_settings: {"timezone": "UTC"}` in `backend/src/database.py`. _Layer: backend._
- **T2** — All timestamps displayed in `Europe/Moscow` (UTC+3, no DST) on public pages. Conversion via `formatDate()` from `frontend/src/lib/date.ts`. _Layer: frontend._
- **T3** — All public UI text is Russian (`ru-RU` locale). Date formatting, month/day labels, copy. _Layer: frontend._
- **T4** — Frontend datetime inputs must send ISO-8601 with UTC offset (e.g., `2024-01-01T00:00:00Z`). Backend validators reject naive datetimes. _Layer: both._

## Post Types & Field Rules

- **P1** — `PostType` enum: `NEWS`, `ARTICLE`, `PROMO`, `EVENT`. No other values. _Layer: backend (`posts/constants.py`)._
- **P2** — `NEWS`, `ARTICLE`, `EVENT` require `title`. `PROMO` does not — title is optional. _Layer: both (backend validation + frontend field visibility)._
- **P3** — `promo_code` is always stored UPPERCASE. Enforced in `posts/service.py` on both create and update. _Layer: backend._
- **P4** — Slug generation priority: `title` → `promo_code` → UUID fragment (8 chars). For PROMO posts without title, slug derives from `promo_code`. _Layer: backend (`posts/service.py`)._
- **P5** — Post type is immutable after creation. `PostUpdateSchema` omits `type`. _Layer: both._
- **P6** — Type-specific fields (`promo_code`, `start_date`, `end_date`, `external_link`, `redirect_to_external`) are dedicated columns, NOT stored in a metadata blob. _Layer: backend._

## Post Lifecycle

- **L1** — `PostStatus` enum: `DRAFT`, `PUBLISHED`, `ARCHIVE`. _Layer: backend (`posts/constants.py`)._
- **L2** — `published_at` set on first publish. Immutable after that. _Layer: backend._
- **L3** — Expiry grace period: posts remain publicly visible for `EXPIRY_GRACE_DAYS` (default 7) past `end_date`. SQL filter uses `or_(end_date.is_(None), end_date > now() - interval)`. _Layer: backend (`posts/service.py`, `config.py`)._

## Media & Uploads

- **M1** — Accepted MIME types: `image/jpeg`, `image/png`, `image/webp`, `image/gif`. All others rejected. _Layer: backend (`media/constants.py`)._
- **M2** — Max file size: 10 MB. Enforced application-level + nginx `client_max_body_size 10m`. _Layer: backend + infrastructure._
- **M3** — All uploads auto-converted to WebP on ingest. Stored at `uploads/YYYY/MM/DD/{uuid}.webp`. _Layer: backend (`media/service.py`)._
- **M4** — Cover image is `post.cover_media` (via `cover_media_id` FK), NOT `post.media[0]`. _Layer: both._
- **M5** — TipTap body images are unattached assets referenced by URL in `content` JSON. They must NOT be attached via the media attach endpoint. _Layer: both._

## Auth & Security

- **A1** — Admin auth: JWT HS256, 30-minute expiry. Token in HTTP-only cookie named `token`. Never localStorage. _Layer: both._
- **A2** — All admin routes under `/mod/`. Login page at `/mod/login` is excluded from auth redirect. _Layer: frontend (`proxy.ts`)._
- **A3** — Server Functions (if added) must verify token internally. `proxy.ts` does not intercept Server Function POST requests. _Layer: frontend._

## Pagination & API Conventions

- **G1** — All primary keys are UUIDs. Never integer IDs. _Layer: backend._
- **G2** — Pagination: `limit` range 1–100, default 20. `offset` ≥ 0. Query params are `limit`/`offset`, not `page`/`size`. _Layer: backend (`posts/router.py`, `media/router.py`)._
- **G3** — Excerpt: first 10 words of plain text extracted from TipTap JSON `content`. Computed server-side at serialization. _Layer: backend (`posts/utils.py`)._
- **G4** — Public pages use ISR with `revalidate = 60` (60-second TTL). _Layer: frontend (every public route)._

## Frontend Layout Constants

- **F1** — Timeline: 61 columns × 32 px, today at index 29 (30 days back + today + 30 days forward). Month/day labels in Russian. Constants in `frontend/src/components/timeline.tsx`. _Layer: frontend._
- **F2** — All public pages wrapped in `PageContainer` (`max-w-7xl px-4 py-10`). Never hardcode outer width. _Layer: frontend._

## User Authentication

- **U1** — Public user auth is Discord OAuth2 only. No email/password registration, no other social providers. Admin auth (email/password JWT, RULES.md #A1) is a separate system. _Layer: both._
- **U2** — No account recovery flow. Lost Discord access means the account and its characters must be re-verified on a new profile. _Layer: both._

## Nicknames & Profiles

- **N1** — Nicknames must be strictly Cyrillic (RU) or strictly Latin (EN). No mixed scripts within a single nickname. No numbers, no symbols. _Layer: both (backend validation + frontend input masking)._
- **N2** — Nickname uniqueness is case-insensitive. Storage and display preserve the user's original casing. _Layer: backend (DB constraint + service-layer check)._

## Activity Timers (World Events)

- **W1** — "In-game Day" resets at 06:00 Moscow Time (03:00 UTC). Times before 06:00 MSK belong to the previous calendar day. _Layer: both._
- **W2** — Activity schedule is a strict 7-day cycle. Each day is independently toggled active/inactive by admin. _Layer: backend (schedule storage + API)._
- **W3** — Events fire every hour on the hour (XX:00 MSK) if the current in-game day is active. _Layer: both._
- **W4** — Timer UI is a 30 px-tall header bar displayed strictly on the Homepage, horizontally aligned with the Theme Toggle. Not rendered on any other page. _Layer: frontend._
