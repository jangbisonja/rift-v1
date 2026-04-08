# Roadmap — Rift

Post-MVP features and modules. Each entry is a high-level goal; detailed specs
live in dedicated module docs (linked where available).

---

## Phase 2 — Core Platform *(Active Development)*

**Activity Timers**
- Two timer types: World Boss and Rift
- Strict 7-day weekly schedule; each day toggled independently via admin panel
- "In-game Day" resets at 06:00 Moscow Time; events fire every hour (XX:00) on active days
- UI: Slim 30px header bar, homepage-only, aligned with the Theme Toggle
- Spec: `docs/TIMERS.md` *(in progress)*

**Discord-Only Authentication**
- Provider: Discord OAuth2 exclusively — no email/password, no account recovery
- Nicknames: strictly Cyrillic (RU) or strictly Latin (EN) — no mixed scripts, no numbers, no symbols
- Uniqueness: case-insensitive check; original casing preserved for display
- Spec: `docs/AUTH.md` *(in progress)*

---

## Phase 3 — Character Engine & Integrity *(Draft / Under Discussion)*

_This phase is under active discussion. Full module specifications (module docs in `docs/`) are pending and must be written and approved before implementation begins._

**Character Engine**
- Backend parser fetches character data from `website.com/NAME`
- Alt discovery: identify a character's alt-pool from a single character page
- Lazy Updates: on-demand refresh per character with rate limiting (no background polling at MVP)

**Ownership Verification (Two-Tier)**
- Method A (Auto): detect Title/Gear changes on the official site after a specific task is assigned to the user
- Method B (Semi-Manual): 4-digit PIN sent via in-game mail to character name "Rift"; admin confirms in the panel

**Account Integrity**
- When a character name appears in a new alt-pool, re-parse the previous owner
- If the previous owner returns 404 (deleted or renamed), prune old records and re-link to the new owner

**CDN & Assets**
- Mirror external game icons (classes, items) to local storage
- Purpose: stability and traffic masking from upstream sources

**Spec:** Pending.

---

## Phase 4 — Social & Recruitment *(Draft / Under Discussion)*

_This phase is under active discussion. Full module specifications (module docs in `docs/`) are pending and must be written and approved before implementation begins._

**LFG (Quick Group Finder)**
- Real-time raid group formation with slot management
- Two roles only: DD / Support
- Mandatory experience tags on every group: [Try], [Semi-Try], [Exp] — used for strict filtering
- Unverified players may create/join groups but are displayed with a distinct visual warning

**Recruitment Board**
- Moderated advertisements for Guilds and Static Groups (CP)
- Image banners supported (pre-moderation required before publish)
- Zero-tolerance policy for NSFW content — instant account ban
- Direct links to external social media/Discord; no internal chat system

**Spec:** Pending.

---

## Phase 5 — Cosmetics & Statistics *(Draft / Under Discussion)*

_This phase is under active discussion. Full module specifications (module docs in `docs/`) are pending and must be written and approved before implementation begins._

**Premium Identity**
- Color-coded nicknames for verified/premium users
- Status badges

**Global Statistics**
- Aggregate data from parsed character records (e.g., class popularity rankings)

**Spec:** Pending.

---

## Technical Debt

Known debt is tracked at the layer that owns it; this section is an index only.

- **Backend** — [`backend/docs/ARCHITECTURE.md § Future Scaling & Technical Debt`](../backend/docs/ARCHITECTURE.md): 5 items (Excerpt Generation, Media Orphan Accumulation, Upload Memory Safety, Detail Page Double Fetch, Inline Media Reference Tracking).
- **Frontend** — [`frontend/TODO.md § Technical Debt`](../frontend/TODO.md): 2 items (Field-level error surfacing in admin forms, listPosts query param DRY).
