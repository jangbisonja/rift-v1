# Module Spec — Raid Handbook

**Status:** Approved — ready for implementation  
**Phase:** 2 (active development)  
**Gate:** This spec constitutes the implementation gate. No code may be written before this document is approved.

---

## Purpose

Admin-only management system for Raids and their Boss phases. Serves as the internal game data handbook — the source of truth for raid metadata that future modules (LFG group finder, character statistics, recruitment board) will reference by foreign key. No public navigation or public API surface in this phase.

---

## Data Models

### Table: `raid`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, not null | Generated via `uuid4()` |
| `name` | `VARCHAR(100)` | not null | Display name of the raid |
| `min_gear_score` | `INTEGER` | not null, ≥ 0 | Minimum gear score to enter |
| `difficulty` | `raid_difficulty` (enum) | not null | See enum definition below |
| `groups_count` | `SMALLINT` | not null, 1–4 | Number of groups in the raid |
| `phases_count` | `INTEGER` | not null, ≥ 1 | Total number of phases (editorial, not derived) |
| `cover_media_id` | `UUID` | FK → `media.id`, nullable, `SET NULL` on delete | Raid cover artwork |
| `created_at` | `TIMESTAMPTZ` | not null, default `now()` | UTC, T1 |
| `updated_at` | `TIMESTAMPTZ` | not null, default `now()` | UTC, updated on every write |

### Table: `raid_boss`

| Column | Type | Constraints | Notes |
|---|---|---|---|
| `id` | `UUID` | PK, not null | Generated via `uuid4()` |
| `raid_id` | `UUID` | FK → `raid.id`, not null, `CASCADE DELETE` | Parent raid |
| `name` | `VARCHAR(100)` | not null | Display name of the boss |
| `phase_number` | `INTEGER` | not null, ≥ 1 | Phase this boss belongs to; not unique per raid (multiple bosses may share a phase) |
| `icon_media_id` | `UUID` | FK → `media.id`, nullable, `SET NULL` on delete | Boss icon artwork |
| `created_at` | `TIMESTAMPTZ` | not null, default `now()` | UTC, T1 |
| `updated_at` | `TIMESTAMPTZ` | not null, default `now()` | UTC, updated on every write |

### Enum: `raid_difficulty`

PostgreSQL enum type name: `raid_difficulty`

| DB Key | Frontend Display (RU) |
|---|---|
| `NORMAL` | Обычная |
| `HARD` | Героическая |
| `TFM` | Вызов |
| `NIGHTMARE` | Кошмар |

The database stores the English key. Frontend displays the Russian string via a static mapping constant (see Frontend section).

---

## API Endpoints

All endpoints require `current_superuser`. No public surface in this phase.

### Raids

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/raids` | 200 | List raids, paginated |
| `POST` | `/raids` | 201 | Create raid |
| `GET` | `/raids/{id}` | 200 | Single raid |
| `PUT` | `/raids/{id}` | 200 | Full update |
| `DELETE` | `/raids/{id}` | 204 | Delete raid (cascades bosses) |

### Bosses (nested under raid)

| Method | Path | Status | Description |
|---|---|---|---|
| `GET` | `/raids/{id}/bosses` | 200 | List bosses for raid, ordered by `phase_number ASC` |
| `POST` | `/raids/{id}/bosses` | 201 | Create boss |
| `GET` | `/raids/{id}/bosses/{boss_id}` | 200 | Single boss |
| `PUT` | `/raids/{id}/bosses/{boss_id}` | 200 | Full update |
| `DELETE` | `/raids/{id}/bosses/{boss_id}` | 204 | Delete boss |

---

## Data Shapes

### `RaidRead`
```json
{
  "id": "uuid",
  "name": "string",
  "min_gear_score": 0,
  "difficulty": "NORMAL | HARD | TFM | NIGHTMARE",
  "groups_count": 1,
  "phases_count": 1,
  "cover_media": { "id": "uuid", "path": "uploads/...", "original_name": "..." } | null,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

`cover_media` uses the same `MediaRead` shape (id, path, original_name) as in `PostListItem`. No separate shape needed.

### `RaidCreate` / `RaidUpdate`
```json
{
  "name": "string",
  "min_gear_score": 0,
  "difficulty": "NORMAL",
  "groups_count": 1,
  "phases_count": 1,
  "cover_media_id": "uuid | null"
}
```
All fields required on create. `RaidUpdate` uses `model_fields_set` — omitted fields are no-ops, `null` explicitly clears `cover_media_id`.

### `RaidBossRead`
```json
{
  "id": "uuid",
  "raid_id": "uuid",
  "name": "string",
  "phase_number": 1,
  "icon_media": { "id": "uuid", "path": "uploads/...", "original_name": "..." } | null,
  "created_at": "2026-01-01T00:00:00Z",
  "updated_at": "2026-01-01T00:00:00Z"
}
```

### `RaidBossCreate` / `RaidBossUpdate`
```json
{
  "name": "string",
  "phase_number": 1,
  "icon_media_id": "uuid | null"
}
```
`raid_id` is taken from the URL path parameter, not the request body.

### List response wrapper (both raids and bosses)
```json
{
  "items": [...],
  "total": 0,
  "limit": 20,
  "offset": 0
}
```

---

## Algorithm — Decision Table

### Raid Operations

| Operation | Precondition Check | Action | Error |
|---|---|---|---|
| Create | `name` not blank; `min_gear_score ≥ 0`; `groups_count` in 1–4; `phases_count ≥ 1`; `difficulty` valid enum | Insert `raid` row; resolve `cover_media` for response | 422 on validation failure |
| Create with `cover_media_id` | Record exists in `media` table | FK set on insert | 404 `RaidCoverNotFound` if media missing |
| List | — | `SELECT` with `LIMIT`/`OFFSET`; return total count + items | — |
| Get single | Raid UUID exists | Return `RaidRead` with joined `cover_media` | 404 `RaidNotFound` |
| Update | Raid exists | Apply only `model_fields_set` fields; update `updated_at` | 404 `RaidNotFound` |
| Update `cover_media_id = null` | — | Explicitly clears FK (distinguished from omitted field) | — |
| Delete | Raid exists | DB `CASCADE DELETE` removes all child `raid_boss` rows; `SET NULL` fires on `media.cover_media_id` references | 404 `RaidNotFound` |

### Boss Operations

| Operation | Precondition Check | Action | Error |
|---|---|---|---|
| Create | Parent raid exists; `name` not blank; `phase_number ≥ 1` | Insert `raid_boss` row with `raid_id` from path | 404 `RaidNotFound` if parent missing |
| Create with `icon_media_id` | Record exists in `media` table | FK set on insert | 404 `RaidBossIconNotFound` if media missing |
| List | Parent raid exists | `SELECT WHERE raid_id = :id ORDER BY phase_number ASC` | 404 `RaidNotFound` |
| Get single | Boss UUID exists AND `boss.raid_id == path raid_id` | Return `RaidBossRead` | 404 `RaidBossNotFound` |
| Update | Boss exists and belongs to raid | Apply `model_fields_set` fields; update `updated_at` | 404 `RaidBossNotFound` |
| Delete | Boss exists | Row deleted; `SET NULL` fires on `media.icon_media_id` if referenced | 404 `RaidBossNotFound` |

### Media FK Behavior

| FK | On raid/boss delete | On media delete |
|---|---|---|
| `raid.cover_media_id` | No action on media | `SET NULL` → raid loses cover but is not deleted |
| `raid_boss.icon_media_id` | No action on media | `SET NULL` → boss loses icon but is not deleted |
| `raid_boss.raid_id` | N/A | `CASCADE DELETE` → deleting a raid removes all its bosses |

---

## Validation Constraints

| Field | Rule |
|---|---|
| `raid.name` | Not blank; max 100 characters |
| `raid.min_gear_score` | Integer ≥ 0 |
| `raid.groups_count` | Integer, 1–4 inclusive |
| `raid.phases_count` | Integer ≥ 1 |
| `raid.difficulty` | One of: `NORMAL`, `HARD`, `TFM`, `NIGHTMARE` |
| `raid_boss.name` | Not blank; max 100 characters |
| `raid_boss.phase_number` | Integer ≥ 1 |

---

## Boundaries

### MUST

- All PKs are UUID (`uuid4()`). Rule G1.
- `created_at` / `updated_at` stored as `TIMESTAMPTZ` with UTC connection-level enforcement. Rule T1.
- All list endpoints support `?limit=` (1–100, default 20) and `?offset=` (≥ 0). Rule G2.
- Difficulty stored as a PostgreSQL enum type `raid_difficulty`. Migration uses the DO-block pattern (see `backend/CLAUDE.md § Known Solutions` — "PostgreSQL `CREATE TYPE` has no `IF NOT EXISTS`").
- `op.create_table()` in the migration must use `postgresql.ENUM(..., create_type=False)` for the difficulty column. Same Known Solution.
- `cover_media_id` and `icon_media_id` must reference existing rows in the `media` table. Resolve via `valid_media_id` dependency or equivalent lookup before inserting.
- Media FK behavior on entity delete: `SET NULL` (not CASCADE) — removing the artwork must not destroy the parent entity.
- All endpoints require `dependencies=[Depends(current_superuser)]`.
- Boss list responses ordered by `phase_number ASC` in all cases.
- `updated_at` must be explicitly updated on every `PUT` operation (not auto-managed by DB trigger — set in service layer, same pattern as other modules).
- Add new endpoints to `API_CONTRACT.md` before writing any implementation code.
- Add `raids` module entry to `backend/docs/MODULES.md` before writing any implementation code.
- Update the `backend/CLAUDE.md` structure tree when adding `src/raids/`.

### MUST NOT

- Store `difficulty` as plain `VARCHAR` or unconstrained text.
- Store `icon_media_id` / `cover_media_id` as raw URL strings — only UUID FKs to the `media` table.
- Expose any public (unauthenticated) GET endpoint in this phase. Public read surface requires a spec revision.
- Cascade-delete media when a raid/boss is deleted — media records are independent assets.
- Add slugs to `raid` or `raid_boss` — this is game reference data, not routed content.
- Use `page`/`size` query parameters — pagination is always `limit`/`offset`. Rule G2.

### MUST NOT invent

- New image upload or storage mechanism — reuse `POST /media/upload` exclusively.
- Boss uniqueness constraint on `(raid_id, phase_number)` — multiple bosses may share a phase.
- Any `raid_boss` → `raid` relationship that is not a simple FK with `CASCADE DELETE`.

---

## Frontend

### Admin Routes

| Route | Purpose |
|---|---|
| `/mod/raids` | Paginated list of all raids; each row shows name, difficulty (RU), min GS, cover thumbnail |
| `/mod/raids/new` | Create raid form |
| `/mod/raids/[id]` | Edit raid metadata and cover artwork |
| `/mod/raids/[id]/bosses` | Manage boss phases for the selected raid — list, create, edit, delete |

### Difficulty Localization

A static mapping constant must be defined in `frontend/src/lib/game.ts` (create if absent):

```ts
export const RAID_DIFFICULTY_LABELS: Record<string, string> = {
  NORMAL:    "Обычная",
  HARD:      "Героическая",
  TFM:       "Вызов",
  NIGHTMARE: "Кошмар",
};
```

Rule T3: all UI text is Russian. The DB key (`NORMAL` etc.) must never be displayed raw.

### Media Flow (both cover and boss icon)

1. Admin selects image → `POST /media/upload` → receives `{ id, path }`
2. Store the returned `id` in component state
3. On form submit, send `cover_media_id` / `icon_media_id` as the UUID in the create/update payload
4. On render, construct the full image URL: `{BASE_URL}/{media.path}`

No new upload mechanism. Reuse the existing media picker pattern from the post editor.

### No Public Navigation

No links to `/mod/raids` from any public page or public navigation component. The admin panel sidebar may add an entry — that is within `/mod/` scope (Rule A2).

---

## Integration Points

| File | Action |
|---|---|
| `backend/src/raids/models.py` | New — `Raid` + `RaidBoss` ORM models |
| `backend/src/raids/schemas.py` | New — `RaidCreate`, `RaidUpdate`, `RaidRead`, `RaidBossCreate`, `RaidBossUpdate`, `RaidBossRead` |
| `backend/src/raids/service.py` | New — CRUD for raids and bosses; media FK resolution |
| `backend/src/raids/router.py` | New — all 10 endpoints; `current_superuser` on every route |
| `backend/src/raids/dependencies.py` | New — `valid_raid_id`, `valid_boss_id` (resolves + 404 guard) |
| `backend/src/raids/exceptions.py` | New — `RaidNotFound`, `RaidBossNotFound`, `RaidCoverNotFound`, `RaidBossIconNotFound` |
| `backend/src/raids/constants.py` | New — `RaidDifficulty` Python enum |
| `backend/src/main.py` | Register `raids_router` |
| `backend/alembic/versions/YYYY-MM-DD_raids.py` | New migration — `raid_difficulty` enum (DO-block) + `raid` table + `raid_boss` table |
| `frontend/src/app/mod/raids/page.tsx` | New — raid list page |
| `frontend/src/app/mod/raids/new/page.tsx` | New — create raid form |
| `frontend/src/app/mod/raids/[id]/page.tsx` | New — edit raid form |
| `frontend/src/app/mod/raids/[id]/bosses/page.tsx` | New — boss management sub-page |
| `frontend/src/lib/game.ts` | New — `RAID_DIFFICULTY_LABELS` mapping constant |
| `API_CONTRACT.md` | Add `raid` and `raid_boss` shapes + 10 endpoint rows |
| `backend/docs/MODULES.md` | Add `raids` module entry |
| `backend/CLAUDE.md` | Add `src/raids/` to the structure tree |

---

## Applicable Rules

| Rule | Requirement |
|---|---|
| G1 | UUID PKs on both tables |
| G2 | `limit`/`offset` pagination on all list endpoints |
| T1 | `TIMESTAMPTZ` UTC for `created_at` / `updated_at` |
| T3 | Russian display text for difficulty via `RAID_DIFFICULTY_LABELS` constant |
| M1–M3 | Media reuse: WebP-converted uploads, UUID filenames, `uploads/YYYY/MM/DD/` paths |
| A1–A2 | Admin JWT via `current_superuser`; all admin UI under `/mod/` |

---

## Future Considerations (out of scope — do not implement)

- **Public read endpoints** (`GET /raids`, `GET /raids/{id}/bosses`) for LFG and statistics pages — requires spec revision when Phase 4 begins.
- **Raid slug** — only needed if raids get public detail pages.
- **Boss kill tracking / statistics** — Phase 5 scope; will add FK from a future `statistics` module into `raid_boss.id`.
