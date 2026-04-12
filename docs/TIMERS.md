# Module Spec — Activity Timers

## Purpose

Display real-time countdowns for two recurring world events (World Boss and Rift/Chaos) in a 30 px header bar on the Homepage. An admin panel page allows independent per-day activation for each event type across a 7-day cycle.

---

## Inputs

- **Admin**: 14 boolean toggles (2 event types × 7 days) written via `PUT /timers/schedule`.
- **Client clock**: Current wall-clock time, converted to MSK (UTC+3, fixed offset, no DST).

---

## Outputs

- **`GET /timers/schedule`** (public): the 14-toggle grid as two 7-element boolean arrays (see `API_CONTRACT.md`).
- **Timer strip** (frontend, all public pages): two side-by-side countdowns in a 30 px strip above the main nav bar, each showing either `HH:MM:SS` or "Сегодня нет".

---

## Algorithm

### Key Definitions

- **In-game Day**: defined by the admin schedule. Each in-game day runs from 06:00 MSK to 05:59 MSK the following calendar day. The toggle for a given weekday name (e.g. "Tuesday") controls the window 06:00 MSK Tuesday → 05:59 MSK Wednesday.
- **Calendar Day**: 00:00 MSK to 23:59 MSK. Used exclusively by the UI scan window.

These two concepts are strictly separated — the admin configures in-game days; the UI serves the user's calendar-day question.

### In-Game Day for a Given Timestamp

```
if timestamp.hour >= 6:
    in_game_dow = timestamp.weekday()           # ISO: Mon=0, Sun=6
else:
    in_game_dow = (timestamp.date - 1).weekday()
```

### UI Countdown Logic (per timer type, runs client-side)

```
msk_now   = utc_now + 3h   # fixed UTC+3, no DST
next_slot = ceiling(msk_now → next XX:00 MSK)

while next_slot is within calendar day (≤ 23:59 MSK):

    in_game_dow = in_game day of next_slot (see above)

    if schedule[timer_type][in_game_dow] is active:
        display = HH:MM:SS countdown to next_slot
        break

    else:   # whole in-game window is off — skip to next window
        if next_slot.hour < 6:
            next_slot = today at 06:00 MSK   # jump to next in-game window
        else:
            break   # no further in-game windows this calendar day

else:
    display = "Сегодня нет"
```

At most two in-game day checks per evaluation. Maximum countdown value: `00:59:59`.

### Example: 05:15 MSK Tuesday, Tuesday in-game day active

- `next_slot` = 06:00 MSK Tuesday
- `in_game_dow` = Tuesday (hour ≥ 6)
- Tuesday active → countdown to 06:00 ✓

### Example: 01:15 MSK Tuesday, Monday inactive, Tuesday active

- `next_slot` = 02:00 MSK Tuesday → `in_game_dow` = Monday → inactive → jump to 06:00
- `next_slot` = 06:00 MSK Tuesday → `in_game_dow` = Tuesday → active → countdown to 06:00 ✓

---

## Data Model

Table: `timer_schedule`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK (RULES.md #G1) |
| `timer_type` | `TimerType` enum | NOT NULL |
| `day_of_week` | SMALLINT | NOT NULL, 0–6, ISO 8601: Mon=0, Sun=6 |
| `is_active` | BOOLEAN | NOT NULL, default `false` |

Unique constraint: `(timer_type, day_of_week)`.

Seeded on startup via lifespan (idempotent): 14 rows inserted if absent. All default to `false`.

---

## Boundaries

**MUST:**
- Use fixed UTC+3 offset for MSK — never rely on `Intl` timezone database or system timezone for MSK conversion (RULES.md #T2)
- Seed all 14 rows on startup; never leave gaps in the schedule
- Return arrays in ISO weekday order: index 0 = Monday, index 6 = Sunday
- `PUT /timers/schedule` always replaces the full 14-toggle grid atomically — no partial updates
- Timer strip renders above the main nav bar in the root layout, visible on all public pages (RULES.md #W4)
- All UI text in Russian (RULES.md #T3): "Сегодня нет"

**MUST NOT:**
- Store or return a "current time" from the backend — the backend only stores the static schedule
- Add DST handling (MSK has no DST — UTC+3 is permanent)
- Render the bar on any page other than the homepage
- Accept partial schedule updates (e.g., individual toggle PATCH endpoints)

---

## Integration Points

| Layer | Path |
|---|---|
| Backend model | `backend/src/timers/models.py` |
| Backend schema | `backend/src/timers/schemas.py` |
| Backend service | `backend/src/timers/service.py` |
| Backend router | `backend/src/timers/router.py` |
| Backend constants | `backend/src/timers/constants.py` |
| Backend seeder | `backend/src/timers/seeder.py` (called from `main.py` lifespan) |
| Backend migration | `backend/alembic/versions/YYYY-MM-DD_timer-schedule.py` |
| Frontend schedule fetch | `frontend/src/lib/timers.ts` |
| Frontend countdown logic | `frontend/src/components/timer-bar.tsx` (client component — receives schedule as prop, no fetch) |
| Frontend strip wrapper | `frontend/src/components/timer-strip.tsx` (server component — fetches schedule, renders `TimerBar`) |
| Root layout | `frontend/src/app/layout.tsx` (renders `TimerStrip` above `Nav`) |
| Admin schedule page | `frontend/src/app/mod/timers/page.tsx` |
| Timer icons | `frontend/public/assets/timers/world_boss.webp`, `rift.webp` |
| API contract | `API_CONTRACT.md` |

---

## Applicable RULES.md Rules

W1, W2, W3, W4, T2, T3, G1, G4, A1, A2
