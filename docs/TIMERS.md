# Module Spec: Activity Timers

## Purpose

Display countdown timers for recurring "World Boss" and "Rift" events on the
Homepage. Timers follow a strict 7-day schedule controlled by admin toggles.

## Inputs

- **Schedule config** (admin-managed): 7-day array of booleans — one per weekday,
  indicating whether events fire that day. Stored server-side, exposed via API.
- **Current time**: Server UTC clock, converted to Moscow Time for day-boundary logic.

## Outputs

- **Timer state** (API → frontend): For each event type, the time remaining until
  the next occurrence, or a "no events today" indicator.
- **UI**: A 30 px-tall header bar rendered strictly on the Homepage, horizontally
  aligned with the Theme Toggle. Not visible on any other page.

## Algorithm

| Step | Logic |
|---|---|
| 1. Determine current "in-game day" | Current Moscow Time. Day boundary is **06:00 MSK** (03:00 UTC). Before 06:00 = previous calendar day. |
| 2. Check if day is active | Look up today's boolean in the 7-day schedule array. |
| 3. If inactive | Return "no events today" state. Timer bar shows inactivity message. |
| 4. If active | Events fire every hour on the hour (XX:00 MSK). Compute minutes until next XX:00. |
| 5. Render countdown | Display `MM:SS` until next event. After event fires, reset to next hour. |

## Boundaries

- **MUST use:** `Europe/Moscow` timezone for all day-boundary and display logic (see RULES.md #T2, #W1).
- **MUST use:** Server-side schedule storage. Frontend receives computed timer state, does NOT store schedule locally.
- **MUST NOT use:** Client-side date logic for determining the active day. The server is authoritative.
- **MUST NOT invent:** Custom cron or scheduler libraries. The 7-day toggle + hourly cadence is a simple modulo calculation, not a scheduling problem.

## Integration Points

- `backend/src/timers/` (new module) — schedule CRUD + timer state endpoint.
- `frontend/src/components/timer-bar.tsx` (new) — 30 px header bar, Homepage only.
- `frontend/src/app/(public)/page.tsx` — Homepage layout, timer bar insertion point.

## Applicable Rules

RULES.md: #T1, #T2, #T3, #W1, #W2, #W3, #W4
