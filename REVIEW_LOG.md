# Review Log — Rift

Tracks periodic code reviews. Each entry records the reviewed commit range,
areas covered, and issues found.

## Review #1 — 2026-04-06

| Field | Value |
|---|---|
| Commit range | `73b3fe6` + uncommitted working tree |
| Date | 2026-04-06 |
| Scope | All 22 modified/new files (backend models/schemas/service/migration, frontend components/pages/schemas/css) |

**Found & fixed:**

| # | Severity | Area | Issue | Status |
|---|---|---|---|---|
| 1 | Critical | `service.py` | `redirect_to_external` unconditionally overwritten on update | Fixed |
| 2 | Critical | `schemas.py` | `PostUpdate.redirect_to_external` default prevented toggling | Fixed |
| 3 | Critical | `schemas.py` | `PostRead` missing `excerpt` field | Fixed |
| 4 | Critical | `post-detail.tsx` | Hardcoded English "Visit Event" in Russian app | Fixed |
| 5 | Critical | `post-row-item.tsx`, `events/page.tsx` | Non-null assertion on nullable `external_link` | Fixed |
| 6 | Warning | `timeline.tsx` | English month/day abbreviations in Russian UI | Fixed |
| 7 | Warning | `promo-item.tsx`, `timeline.tsx` | Duplicate `daysRemaining` logic + timezone issue | Fixed → extracted to `lib/date.ts` |
| 8 | Warning | migration | `external_link` column unbounded `String()` | Fixed → `String(2048)` |
| 9 | Warning | `mod/posts/page.tsx` | Silent mutation errors (no toast) | Fixed |
| 10 | Suggestion | `timeline.tsx` | Today indicator missing `aria-hidden` | Fixed |

---

## Baseline

| Field | Value |
|---|---|
| Last reviewed commit | `73b3fe6` |
| Date | 2026-04-06 |
| Scope | Initial baseline — no review performed yet |
| Notes | All code up to this SHA is considered the starting point. First review will cover changes after this commit, or a targeted sweep of existing code. |
