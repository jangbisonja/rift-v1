# Module Spec: User Authentication (Discord OAuth2)

## Purpose

Authenticate public users via Discord OAuth2. This is the sole authentication
method for non-admin users. Admin auth (email/password JWT) remains unchanged
and separate (see RULES.md #A1–A3).

## Inputs

- **Discord OAuth2 callback**: Authorization code from Discord redirect.
- **Discord user profile**: `id`, `username`, `avatar`, `discriminator` from Discord API.

## Outputs

- **Session**: Authenticated user session (mechanism TBD — likely HTTP-only cookie
  with JWT, mirroring admin pattern from RULES.md #A1).
- **User record**: Created on first login, linked to Discord `id`.

## Algorithm

| Step | Logic |
|---|---|
| 1. User clicks "Login with Discord" | Frontend redirects to Discord OAuth2 authorize URL. |
| 2. Discord redirects back | Backend receives authorization code at callback endpoint. |
| 3. Exchange code for token | Backend calls Discord token endpoint. |
| 4. Fetch Discord profile | Backend calls Discord `/users/@me` with access token. |
| 5. Find or create user | Match on `discord_id`. If new, create user record. If existing, update avatar/username. |
| 6. Issue session | Return JWT in HTTP-only cookie. Redirect to frontend. |

## Boundaries

- **MUST use:** `fastapi-users` OAuth2 integration (already a project dependency).
- **MUST use:** Discord as the sole OAuth provider. No email/password, no other social logins.
- **MUST NOT use:** localStorage for tokens. HTTP-only cookies only (consistent with RULES.md #A1).
- **MUST NOT invent:** Account recovery flows. Lost Discord access = new profile (RULES.md #U2).
- **MUST NOT invent:** Email verification, password reset, or any credential-based auth for public users.

## Integration Points

- `backend/src/auth/` — Extend existing auth module with Discord OAuth2 strategy.
- `backend/src/users/` (new module) — Public user model (distinct from admin User).
- `frontend/src/app/(public)/login/` (new) — Discord login page/button.
- `frontend/src/lib/api/client.ts` — Session handling for public user context.

## Applicable Rules

RULES.md: #A1, #U1, #U2

## Open Questions

- Should public user JWT expiry match admin (30 min) or be longer (e.g., 7 days)?
- Should Discord token be stored for future API calls (e.g., fetching updated avatar)?
- Public user model: same table as admin `User` with a role column, or separate table?
