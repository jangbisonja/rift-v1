# Documentation Map

Quick-lookup index. Read this first. Open linked docs only if your task matches the trigger.

| Doc | Purpose | Read when |
|-----|---------|-----------|
| `RULES.md` | Business invariants (numbered rules) | Touching: timers (T–W), posts (P, L), nicknames (N), media (M), auth (A), pagination (Q) — use the category index inside the file |
| `API_CONTRACT.md` | Endpoint table + data shapes (SSOT) | Adding/changing any endpoint, request/response schema, or auth flow |
| `DEPLOY.md` | Server ops, pm2, nginx, deploy commands | Deployment, infrastructure changes |
| `docs/AUTH.md` | Discord OAuth spec + public user model | Touching auth flow, PublicUser, sessions, Discord callbacks |
| `docs/TIMERS.md` | Timer schedule algorithm + rules | Touching timer computation or schedule endpoints |
| `docs/ROADMAP.md` | Phase tracking, feature goals | Planning new features, checking phase gates |
| `docs/CHARACTERS.md` | Character Engine spec (Phase 3, gate-locked) | Only after spec is approved by user |
| `backend/docs/ARCHITECTURE.md` | DB schema, system layers, infra | Changing DB structure, auth model, or adding a new service layer |
| `backend/docs/MODULES.md` | Per-module endpoints + design decisions | Adding a new module or changing an existing module's contract |
| `backend/docs/fastapi/AGENTS.md` | FastAPI patterns + code examples | Implementing new endpoints or unfamiliar FastAPI patterns |
| `.claude/rules/self-documentation.md` | When/how to record non-obvious decisions | Behavioral rule — internalize once, no need to re-read |
| `.claude/rules/collaboration.md` | Communication style | Behavioral rule — internalize once, no need to re-read |

## RULES.md Category Index

| Category | Rules | Topic |
|----------|-------|-------|
| Timezone & Locale | T1–T4 | UTC storage, MSK display, Russian locale, ISO-8601 |
| Post Types & Fields | P1–P6 | PostType enum, required fields, slugs, type immutability |
| Post Lifecycle | L1–L3 | Status enum, published_at immutability, expiry grace |
| Activity Windows | W1–W3 | In-game day boundary at 06:00 MSK, hourly event slots |
| Nicknames | N1–N2 | Cyrillic/Latin+digits, 3-24 chars, cooldown |
| Media | M1–M3 | WebP conversion, UUID filenames, upload paths |
| Auth | A1–A2 | Cookie names, JWT lifetimes |
| Pagination | Q1 | Default page size |
