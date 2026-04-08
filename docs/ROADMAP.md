# Roadmap — Rift

Post-MVP features and modules. Each entry is a high-level goal; detailed specs
live in dedicated module docs (linked where available).

---

## Phase 2 — Core Platform

### Activity Timers
Countdown timers for "World Boss" and "Rift" events displayed in a slim header bar
on the Homepage. Strict 7-day schedule toggled per-day via admin. "In-game Day"
resets at 06:00 Moscow Time. Events fire every hour (XX:00) on active days.

**Spec:** [docs/TIMERS.md](TIMERS.md)

### User Authentication (Discord OAuth2)
Discord-only login for public users. No email/password registration. If Discord
access is lost, the account and its characters must be re-verified on a new profile —
no recovery flow.

**Spec:** [docs/AUTH.md](AUTH.md)

### User Profiles & Nicknames
User profiles tied to Discord identity. Nicknames must be strictly Cyrillic (RU) or
strictly Latin (EN) — no mixed scripts, no numbers, no symbols. Uniqueness is
case-insensitive; display preserves original casing. Premium features include
color-coded nicknames and status badges.

**Spec:** Pending (depends on Auth module).

---

## Phase 3 — Game Systems

_Placeholder for future game-layer modules (LFG, guild management, etc.)._
