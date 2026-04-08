# Module Spec — Character Engine & Ownership Verification

> **Status: DRAFT — pending user approval before any implementation begins.**
> Per `.claude/rules/self-documentation.md § Phase 3–5 Module Spec Gate`.

---

## Purpose

Parse character records from the official game site, verify character ownership by Rift users, maintain alt-pool integrity across ownership changes, and mirror game assets to local storage.

This spec covers four sub-modules: Character Engine, Ownership Verification, Account Integrity, and CDN & Assets.

---

## Sub-Module 1 — Character Engine

### Purpose

Fetch and store character data from the official game site on demand. Discover a character's full alt-pool from a single character page.

### Inputs

- Character name (string) provided by the user during registration or manual refresh.
- Official site URL pattern: `{GAME_SITE_BASE_URL}/{CHARACTER_NAME}` — base URL stored in backend config, never hardcoded.

### Outputs

- Parsed character record (name, class, level, title, gear snapshot, alt-pool member list).
- Updated `character` and `alt_pool` records in the database.

### Algorithm

| Step | Action |
|---|---|
| 1 | Check rate-limit cooldown for this character name. If within cooldown window, reject with 429. |
| 2 | Fetch `{GAME_SITE_BASE_URL}/{CHARACTER_NAME}`. |
| 3 | If response is 404 → mark character as `DELETED` in DB, trigger Account Integrity flow. |
| 4 | Parse character fields: name, class, level, title, gear hash. |
| 5 | Parse alt-pool member list from the character page. |
| 6 | Upsert character record. Update `last_parsed_at` timestamp. |
| 7 | For each alt in the discovered pool: upsert into `alt_pool` table, link to the same `alt_group`. |
| 8 | Trigger Account Integrity check for any alt whose `alt_group` has changed (see Sub-Module 3). |

### Rate Limiting

- Per-character cooldown: minimum interval between refreshes (exact value TBD at implementation time, suggested 15–60 min).
- No background polling at MVP. All refreshes are on-demand (triggered by user action or admin).
- Rate limit state stored in DB (`last_parsed_at` column on character record) — no Redis required at MVP.

---

## Sub-Module 2 — Ownership Verification (Two-Tier)

### Purpose

Confirm that a Rift user actually controls a given character before linking it to their account.

### Inputs

- `user_id` — the Rift user requesting ownership.
- `character_name` — the character to verify.

### Method A — Automatic (Title/Gear Detection)

**Flow:**

| Step | Action |
|---|---|
| 1 | Assign a specific, user-visible task to the user (e.g., "Equip the [Verification Amulet] item"). Record a snapshot of the character's current title and gear hash. |
| 2 | User performs the task in-game. |
| 3 | On user's next page load or explicit "Check" action, re-parse the character. |
| 4 | Compare new title / gear hash against the snapshot. |
| 5 | If changed → verification passed. Link character to user. Delete snapshot. |
| 6 | If unchanged after a timeout window (TBD) → verification expired. User must restart. |

**Constraint:** The task assigned must be feasible in-game without requiring another player. Gear hash change is preferred over title (titles may be harder to acquire).

### Method B — Semi-Manual (4-Digit PIN via In-Game Mail)

**Flow:**

| Step | Action |
|---|---|
| 1 | Generate a cryptographically random 4-digit PIN. Store `(user_id, character_name, pin, expires_at)`. |
| 2 | Instruct user: "Send an in-game mail from your character `{CHARACTER_NAME}` to the character named `Rift`, with the subject or body containing the PIN `{PIN}`." |
| 3 | Admin checks in-game mail in the game client. |
| 4 | Admin finds the mail from `{CHARACTER_NAME}` containing the PIN. |
| 5 | Admin confirms in the Rift admin panel: marks `(user_id, character_name)` as verified. |
| 6 | System links character to user. Invalidates the PIN record. |

**PIN rules:**
- 4 digits, zero-padded (e.g., `0391`).
- Expires after a fixed window (suggested 24h — exact value TBD).
- Single-use. Restarting generates a new PIN.
- Admin panel must display: pending verifications, character name, user, PIN, expiry.

**Why two methods:** Method A is non-blocking but requires the game site to update title/gear data promptly. Method B requires admin action but is reliable regardless of site update latency. Both methods must be available at launch.

---

## Sub-Module 3 — Account Integrity

### Purpose

Maintain correct ownership links when a character name appears in a new user's alt-pool, or when a previously owned character is no longer reachable.

### Trigger

A character name that is already linked to User A appears in the parsed alt-pool of a character belonging to User B.

### Algorithm

| Step | Condition | Action |
|---|---|---|
| 1 | Character `C` appears in User B's alt-pool. `C` is currently linked to User A. | Initiate integrity check for User A. |
| 2 | Re-parse User A's primary character. | — |
| 3a | User A's page returns 404. | Mark User A's primary as `DELETED`. Prune all User A's character records. Re-link `C` to User B's alt group. Log the transfer. |
| 3b | User A's page returns valid data, but `C` is no longer in User A's alt-pool. | Character was renamed or transferred. Re-link `C` to User B's alt group. Log the transfer. |
| 3c | User A's page returns valid data, and `C` is still in User A's alt-pool. | Ownership conflict. Both users claim `C`. Flag for manual admin review. Do NOT re-link automatically. |

**Key invariant:** An alt group belongs to exactly one Rift user at any given time. Automatic re-linking only happens when the previous owner's claim is definitively invalidated (404 or `C` absent from their pool). Ambiguous cases always go to admin review.

---

## Sub-Module 4 — CDN & Assets

### Purpose

Mirror external game icons (character classes, items, abilities) to local storage. Serve them from Rift's own domain.

### Motivation

- **Stability**: external game site may go offline, restructure URLs, or block hotlinking.
- **Traffic masking**: prevents the game site from seeing Rift user traffic patterns via referrer/IP logs.

### Algorithm

| Step | Action |
|---|---|
| 1 | During character parse, extract icon URLs referenced on the character page. |
| 2 | For each icon URL not yet in local storage: download, convert to WebP (RULES.md #M3 convention), store at `uploads/icons/{category}/{slug}.webp`. |
| 3 | Store the mapping `{original_url → local_path}` in a `game_asset` table. |
| 4 | All frontend references use the local path via `mediaUrl()`. Never reference the external URL directly in rendered HTML. |

---

## Boundaries

**MUST:**
- Store the game site base URL in backend config (`GAME_SITE_BASE_URL` env var) — never hardcode.
- Rate-limit all parse requests per character (DB-based at MVP, no Redis).
- PIN generation must use a cryptographically secure random source.
- All automatic re-linking must be logged with timestamp, old owner, new owner, and reason.
- Manual admin confirmation required for Method B verification.
- Ambiguous ownership conflicts (Sub-Module 3, case 3c) MUST go to admin review — never auto-resolve.

**MUST NOT:**
- Poll the game site on a schedule at MVP (lazy/on-demand only).
- Expose the game site's base URL in frontend responses.
- Store PINs in plaintext beyond their use (invalidate after confirmation or expiry).
- Re-link a character automatically when the previous owner's claim is still valid (case 3c above).

**MUST NOT invent:**
- A background job scheduler (not in scope for MVP).
- A Redis cache for rate limiting (use DB `last_parsed_at`).
- Any auth method beyond the two specified (Method A and Method B).

---

## Integration Points

_All paths are placeholders — exact module structure to be determined at implementation time._

| Layer | Path |
|---|---|
| Backend — character model | `backend/src/characters/models.py` |
| Backend — ownership model | `backend/src/ownership/models.py` |
| Backend — game assets model | `backend/src/assets/models.py` |
| Backend — parser service | `backend/src/characters/parser.py` |
| Backend — ownership service | `backend/src/ownership/service.py` |
| Backend — integrity service | `backend/src/characters/integrity.py` |
| Backend — config | `GAME_SITE_BASE_URL` in `backend/src/config.py` |
| Admin panel — pending verifications | `frontend/src/app/mod/ownership/page.tsx` |
| Admin panel — integrity flags | `frontend/src/app/mod/integrity/page.tsx` |
| Spec | `docs/CHARACTERS.md` (this file) |
| Roadmap | `docs/ROADMAP.md § Phase 3` |

---

## Open Questions (resolve before implementation)

1. **Rate limit window** — exact cooldown duration per character (suggested 15–60 min). Needs load estimate.
2. **Method A task** — which in-game action is reliable and user-friendly? Title change vs. gear equip?
3. **Method A timeout** — how long before an unconfirmed auto-verification attempt expires?
4. **PIN expiry window** — suggested 24h. Confirm.
5. **Game site base URL** — `website.com` is a placeholder. Provide the real URL before implementation.
6. **Alt-pool discovery** — confirm how alt-pool members are listed on the character page (single table? linked profile section?). Required for parser design.
7. **Gear hash definition** — which gear fields constitute the hash? (slot + item ID? full item name?)

---

## Applicable RULES.md Rules

G1 (UUID PKs), M1–M3 (asset handling), A1–A2 (admin auth), T1 (UTC storage)