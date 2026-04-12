# Module Spec — User Authentication & Profiles

## Purpose

Authenticate public users via Discord OAuth2 and manage their display profiles
(nickname, cosmetics). This is the sole authentication method for non-admin users.
Admin auth (email/password JWT) is a completely separate system and must not be
touched by this module.

---

## Inputs

| Source | Data |
|---|---|
| Discord OAuth2 callback | Authorization code issued by Discord redirect |
| Discord `/users/@me` | `id`, `username`, `global_name`, `discriminator` |
| User (frontend) | Chosen nickname on first login; nickname update on profile page |

---

## Outputs

| Output | Description |
|---|---|
| HTTP-only cookie `user_token` | JWT for the authenticated public user session |
| `GET /users/me` response | Full `PublicUserRead` shape (see Data Model) |
| `PATCH /users/me` response | Updated `PublicUserRead` after nickname change |
| Login/Profile modal state | Frontend UI driven by presence of `user_token` cookie |

---

## Algorithm

### OAuth2 Login Flow

| Step | Logic |
|---|---|
| 1. User clicks "Login with Discord" | Frontend calls `GET /auth/discord/authorize` → backend redirects to Discord OAuth2 authorize URL with `identify` scope |
| 2. Discord redirects back | Backend receives authorization code at `GET /auth/discord/callback` |
| 3. Exchange code for token | Backend POSTs to Discord token endpoint; receives `access_token`, `refresh_token`, `expires_in` |
| 4. Fetch Discord profile | Backend calls `GET https://discord.com/api/users/@me` with `access_token` |
| 5. Find or create PublicUser | Match on `discord_id`. If new → create record, auto-assign default nickname `user{display_id:05d}` (e.g. `user00001`), `is_new = True`. If existing → update `discord_username`, `is_new = False` |
| 6. Issue session | Encode `PublicUser.id` into JWT; set as HTTP-only cookie `user_token`; redirect to frontend |
| 7. Redirect target | New users → `{FRONTEND_URL}/?welcome=1`; returning users → `{FRONTEND_URL}`. The `?welcome=1` param causes the frontend to display a one-time "Добро пожаловать!" toast |

### Nickname Validation

| Check | Rule | Error |
|---|---|---|
| Length | 3–24 characters inclusive | `INVALID_LENGTH` |
| Script detection | All letters must be from one script (Cyrillic or Latin). Digits allowed alongside letters. Must contain ≥1 letter. No symbols, spaces, or mixed alphabets. | `INVALID_SCRIPT` |
| Prohibited words | Case-insensitive check against `prohibited_nickname` table | `NICKNAME_PROHIBITED` |
| Uniqueness | Case-insensitive check against `nickname_lower` index | `NICKNAME_TAKEN` |
| Cooldown | `nickname_changed_at IS NULL OR now() - nickname_changed_at >= 10 minutes` | `NICKNAME_COOLDOWN` |

Cooldown applies to **updates only**. Auto-assigned default nicknames have `nickname_changed_at = NULL`
so users can rename immediately after registration with no cooldown. Return remaining seconds in the
error body so the frontend can display a countdown.

Script detection logic (backend, RULES.md #N1):
```python
_CYRILLIC_OR_DIGITS = re.compile(r"^[а-яёА-ЯЁ0-9]+$")
_LATIN_OR_DIGITS    = re.compile(r"^[a-zA-Z0-9]+$")
_HAS_CYRILLIC       = re.compile(r"[а-яёА-ЯЁ]")
_HAS_LATIN          = re.compile(r"[a-zA-Z]")

has_cyr = bool(_HAS_CYRILLIC.search(nickname))
has_lat = bool(_HAS_LATIN.search(nickname))

if has_cyr and has_lat:       → INVALID_SCRIPT (mixed alphabets)
elif has_cyr + digits only:   → CYRILLIC
elif has_lat + digits only:   → LATIN
else (no letter at all):      → INVALID_SCRIPT
```

### Prohibited Nickname List

Managed via a DB table `prohibited_nickname` (admin-maintained, not user-facing).
Seed list on first migration — covers impersonation and universal profanity:

**Impersonation / reserved:** `admin`, `moder`, `moderator`, `support`, `staff`,
`rift`, `bot`, `system`, `official`, `help`, `dev`, `owner`, `game`, `gm`

**Universal profanity seed:** a small, curated baseline list is sufficient for
launch — the admin panel must provide CRUD endpoints to extend it. Do not embed
an external profanity library; the seed list is intentionally minimal and
maintainable. Russian-specific terms to add post-launch via admin panel.

Matching: normalize both stored entry and input to lowercase before comparison.

### Session & Token Lifecycle

- **Cookie name:** `user_token` (distinct from admin `token` — must never collide)
- **JWT expiry:** 30 days (public users expect persistent sessions; 30 min admin
  policy does not apply here)
- **Transport:** HTTP-only, `SameSite=Lax`, `Secure` in production — same security
  posture as admin `token`
- **Discord tokens:** Stored automatically in `public_oauth_account` by the
  fastapi-users OAuth2 flow. Update `discord_username` (and `discord_id` if first
  login) on the `PublicUser` row inside `on_after_oauth_callback` in the
  `PublicUserManager`. Never expose Discord tokens to the frontend.
- **Logout:** Clear `user_token` cookie. Discord token is NOT revoked (stateless
  OAuth — no revocation required for MVP).

---

## Data Model

### Table: `public_user`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK (RULES.md #G1) |
| `display_id` | INTEGER | UNIQUE NOT NULL, `GENERATED ALWAYS AS IDENTITY` — sequential display number; used to auto-assign default nickname |
| `discord_id` | VARCHAR(32) | UNIQUE NOT NULL — denormalized from `OAuthAccount` for fast lookup |
| `discord_username` | VARCHAR(64) | NOT NULL — updated on each login |
| `nickname` | VARCHAR(24) | UNIQUE NOT NULL after registration — auto-assigned `user{display_id:05d}` on first login |
| `nickname_lower` | VARCHAR(24) | UNIQUE NOT NULL after registration — normalized lowercase; uniqueness enforced via DB index |
| `nickname_script` | `NicknameScript` enum | Set on registration: `CYRILLIC` \| `LATIN` |
| `nickname_color` | VARCHAR(7) | NULL — hex color, e.g. `#FF5722`; admin-assigned only |
| `badge` | `UserBadge` enum | NULL — values: `VERIFIED` \| `FOUNDER`; admin-assigned only |
| `nickname_changed_at` | TIMESTAMPTZ | NULL — set on every successful **user-initiated** nickname update; NULL for auto-assigned nicknames so user can rename immediately |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL, default `now()` |

### Table: `public_oauth_account`

Use fastapi-users' `SQLAlchemyBaseOAuthAccountTableUUID` mixin. This table stores
Discord access/refresh tokens and is managed entirely by the fastapi-users OAuth2
flow — do not read from or write to it directly in the users module.

**Notes:**
- `discord_id` and `discord_username` are denormalized from `OAuthAccount` onto
  `PublicUser` on each login so the users module never needs to join `public_oauth_account`.
- `nickname_lower` is derived from `nickname` in the service layer before insert/update.
  It is stored (not computed) so the DB uniqueness index is simple and fast.
- `nickname_color` and `badge` are NULL for all users at launch; fields exist now so
  Phase 3 cosmetics require no schema migration.
- `nickname_changed_at` is not set during initial nickname setup — cooldown applies
  to subsequent changes only.
- No FK to `GameAccount` yet — that link is added in Phase 3. The `id` column is the
  future join target; no placeholder column needed now.

### Table: `prohibited_nickname`

| Column | Type | Constraints |
|---|---|---|
| `id` | UUID | PK |
| `word` | VARCHAR(64) | UNIQUE NOT NULL — stored lowercase |
| `created_at` | TIMESTAMPTZ | NOT NULL, default `now()` |

### Enums (backend constants)

```python
class NicknameScript(str, enum.Enum):
    CYRILLIC = "CYRILLIC"
    LATIN    = "LATIN"

class UserBadge(str, enum.Enum):
    VERIFIED = "VERIFIED"
    FOUNDER  = "FOUNDER"
```

### Response Shape: `PublicUserRead`

```json
{
  "id": "uuid",
  "display_id": 1,
  "discord_id": "123456789",
  "discord_username": "username",
  "nickname": "user00001",
  "nickname_script": "LATIN" | "CYRILLIC" | null,
  "nickname_color": "#FF5722" | null,
  "badge": "VERIFIED" | "FOUNDER" | null,
  "nickname_changed_at": "2026-04-08T12:00:00Z" | null,
  "created_at": "2026-04-08T12:00:00Z"
}
```

No avatar fields. The profile is intentionally minimal — only what is necessary for
identification and business logic. `nickname` is never null after registration (auto-assigned).

---

## Endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/auth/discord/authorize` | public | Redirect to Discord OAuth2 authorize URL |
| GET | `/auth/discord/callback` | public | Receive code, exchange, find-or-create user, set cookie, redirect to `/?welcome=1` (new) or `/` (returning) |
| POST | `/auth/discord/logout` | `current_public_user` | Clear `user_token` cookie |
| GET | `/users/me` | `current_public_user` | Current user profile → `PublicUserRead` |
| PATCH | `/users/me/nickname` | `current_public_user` | Set or update nickname → `PublicUserRead` (10 min cooldown on updates; no cooldown on auto-assigned names) |
| DELETE | `/users/me` | `current_public_user` | Permanently delete account + cascade `public_oauth_account` + clear `user_token` cookie → 204 |
| PATCH | `/mod/users/{id}/cosmetics` | superuser | Set `nickname_color` and/or `badge` on any user |
| GET | `/mod/prohibited-nicknames` | superuser | List prohibited words |
| POST | `/mod/prohibited-nicknames` | superuser | Add prohibited word |
| DELETE | `/mod/prohibited-nicknames/{id}` | superuser | Remove prohibited word |

> These endpoints must be added to `API_CONTRACT.md` before implementation begins.

---

## Boundaries

**MUST:**
- Use `fastapi-users` OAuth2 integration for the Discord strategy — it is already a
  project dependency; do not write custom OAuth2 token exchange logic
- Keep `PublicUser` in a separate `public_user` table — do not add a role column to
  the admin `User` model or merge the two systems
- Issue sessions as JWT in HTTP-only cookies named `user_token` — never `token`,
  never localStorage (RULES.md #A1, #U1)
- Validate nickname script server-side with a strict regex — do not rely solely on
  frontend masking
- Store `nickname_lower` as a real column with a DB UNIQUE index — do not rely on
  `LOWER()` function indexes or application-level checks alone
- Auto-assign `nickname = f"user{display_id:05d}"` on first login; `nickname_changed_at` stays NULL so user can rename immediately
- All timestamps UTC (RULES.md #T1)
- Seed `prohibited_nickname` table on startup (idempotent, like timer seed)

**MUST NOT:**
- Share the admin `fastapi_users` instance or backend with the public user system
- Use the cookie name `token` for public user sessions
- Add account recovery, password reset, email verification, or any non-Discord auth
  path (RULES.md #U1, #U2)
- Expose contents of `public_oauth_account` (Discord tokens) to the frontend
- Store or return any Discord avatar data — no `avatar_hash`, no CDN URLs, no avatar proxy
- Allow nicknames with mixed alphabets, spaces, dots, or non-digit symbols (RULES.md #N1); digits alongside letters are permitted
- Accept duplicate nicknames differing only in case (RULES.md #N2)
- Allow users to set their own `nickname_color` or `badge` — these are admin-assigned only
- Write the Phase 3 `GameAccount` FK or relationship — leave that to Phase 3

---

## Integration Points

| Layer | Path |
|---|---|
| Backend public user model | `backend/src/users/models.py` |
| Backend user schemas | `backend/src/users/schemas.py` |
| Backend user service | `backend/src/users/service.py` |
| Backend user router | `backend/src/users/router.py` |
| Backend user dependencies | `backend/src/users/dependencies.py` |
| Backend user constants | `backend/src/users/constants.py` (`NicknameScript`, `UserBadge`) |
| Backend auth (Discord OAuth2) | `backend/src/auth/discord.py` (new file within existing auth module) |
| Backend prohibited nicknames | `backend/src/users/prohibited.py` (model + router) |
| Backend seed | `backend/src/users/seeder.py` (called from `main.py` lifespan) |
| Backend migration | `backend/alembic/versions/YYYY-MM-DD_public-user.py` |
| Frontend login/profile modal | `frontend/src/components/user-modal.tsx` |
| Frontend user API client | `frontend/src/lib/api/client.ts` (add user functions here, not a separate file) |
| Frontend nav — user button | `frontend/src/components/nav.tsx` — extract `UserButton` as client component; renders `[User icon] Nickname` when logged in, `[User icon]` alone when not; opens `UserModal` |
| Frontend user context/store | `frontend/src/lib/user-context.tsx` |
| API contract | `API_CONTRACT.md` — must be updated before implementation |
| Backend architecture doc | `backend/docs/ARCHITECTURE.md` — must note separate user systems |
| Backend modules doc | `backend/docs/MODULES.md` — add `users/` entry |

---

## Applicable RULES.md Rules

U1, U2, N1, N2, A1, A2, A3, G1, G2, T1, T3
