# CLAUDE.md — Rift Frontend

## Role

Senior TypeScript/Next.js developer. Write production-quality, type-safe code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
- `../CLAUDE.md` — project overview, API contract, endpoint reference
- `frontend/docs/ARCHITECTURE.md` — component structure, data flow, auth model
- `frontend/docs/PAGES.md` — per-page purpose, data requirements, components used

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS** + **shadcn/ui** (components are copied into `src/components/ui/`, not a package)
- **TipTap** — headless editor, minimal setup only (see TipTap section below)
- **React Hook Form** + **Zod** — form state and schema validation
- **TanStack Query** — client-side server state (admin panel only)

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (public)/               # public-facing pages (SSR via Server Components)
│   │   │   ├── page.tsx            # homepage — 4 editorial sections
│   │   │   ├── news/               # news listing + detail
│   │   │   └── ...                 # articles, promos, events (placeholders)
│   │   ├── mod/                    # admin panel (Client Components + TanStack Query)
│   │   │   ├── layout.tsx          # reads auth cookie, redirects if missing
│   │   │   ├── login/page.tsx
│   │   │   ├── posts/              # list, new, [id]
│   │   │   ├── tags/
│   │   │   └── media/
│   │   ├── api/                    # Next.js Route Handlers
│   │   │   └── auth/
│   │   │       ├── login/route.ts  # POST: exchanges credentials → sets HTTP-only cookie
│   │   │       └── logout/route.ts # POST: clears cookie
│   │   └── layout.tsx              # root layout
│   ├── components/
│   │   ├── ui/                     # shadcn/ui (do not edit manually)
│   │   └── editor/                 # TipTap editor wrapper (always "use client")
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts           # typed fetch wrapper — reads cookie, attaches Bearer header
│   │   └── schemas/                # Zod schemas mirroring backend Pydantic models
│   └── middleware.ts               # redirects unauthenticated requests away from /mod
```

## Component Boundary Rules

**Server Component** (default — no `"use client"`):
- All public pages: homepage, news listing, post detail
- Fetches data directly on the server using `client.ts` with the request cookie
- No hooks, no interactivity, no browser APIs

**Client Component** (`"use client"` required):
- Everything inside `/mod` that has state or interactivity
- The TipTap editor (uses browser APIs — always needs `"use client"`)
- Forms using React Hook Form
- Components using TanStack Query

Rule: push `"use client"` as deep into the tree as possible. Keep parent layouts as Server Components.

## Auth

**Pattern**: HTTP-only cookie storing the backend JWT.

Flow:
1. User submits login form → POST to `/api/auth/login` (Next.js Route Handler)
2. Route Handler forwards credentials to `POST /auth/login` on the backend
3. On success, Route Handler sets `token` as HTTP-only cookie (`Set-Cookie`)
4. `middleware.ts` checks for the cookie on every `/mod/*` request — redirects to `/mod/login` if missing
5. API calls from Server Components: read cookie from `headers()`, attach as `Authorization: Bearer <token>`
6. API calls from Client Components: `fetch` sends cookie automatically (same origin)
7. Logout: POST to `/api/auth/logout` → Route Handler clears the cookie

Never store the JWT in `localStorage` or expose it to client-side JavaScript.

## API Client

`src/lib/api/client.ts` is the single entry point for all backend calls.

- All functions are typed against the backend contract in `../../CLAUDE.md`
- Server-side calls pass the cookie header explicitly
- Client-side calls rely on the browser sending the cookie automatically
- All errors are surfaced — no silent swallowing

## TipTap Setup

**Minimal scope — do not add extensions beyond this list without explicit instruction.**

Extensions to import:
- `StarterKit` — covers: bold, italic, headings (H1–H6), lists (bullet + ordered),
  code, code block, blockquote, horizontal rule, hard break
- `Image` — inline image insertion (URL-based, resolved from backend media uploads)

Do not import: video, audio, iframe, drag handle, slash commands, color highlighter,
find-and-replace, or any other extension unless explicitly added later.

The editor component lives in `src/components/editor/` and is always a Client Component.
Its output is TipTap JSON (`{ "type": "doc", "content": [...] }`) — this maps directly
to the `content` field on the backend `Post` model.

## Forms

- **React Hook Form** manages form state
- **Zod** schemas live in `src/lib/schemas/` and mirror backend Pydantic models
  (same field names, same constraints where applicable)
- Use `zodResolver` to connect Zod to React Hook Form
- Validation errors should match what the backend would reject

## Data Fetching

| Context | Pattern |
|---|---|
| Public pages | Server Component — `fetch` / `client.ts` directly, no hooks |
| Admin reads | TanStack Query `useQuery` |
| Admin writes | TanStack Query `useMutation` + invalidate affected queries on success |

## Docs Maintenance

**You must keep docs in sync with code. No exceptions.**

| Trigger | Action |
|---|---|
| Adding a new page or route | Add its entry to `docs/PAGES.md` before writing any code |
| Adding a new shared component | Document it in `docs/ARCHITECTURE.md` |
| Changing the API client or auth flow | Update `docs/ARCHITECTURE.md` |
| Discovering a non-obvious solution or gotcha | Add it to a **Known Solutions** section in this file |

## TODO.md

`frontend/TODO.md` is the living task list for frontend development.

Rules:
- Update it at the start and end of every task — mark done, add what's next
- Every task has a clear single outcome, not a vague description
- Do not batch multiple outcomes into one task
- When a task is completed, note any decisions or gotchas inline before moving on

## Design Decisions

**Font**: Nunito Sans (Google Fonts) — loaded via `next/font/google`, applied globally.

**Theme**: Dark by default. Toggle button in the top-right corner of the global header.
Uses `next-themes` with `defaultTheme="dark"` and `attribute="class"`.
Background is not pure black — use `zinc-950` / `zinc-900` range, not `black`.

**Primary color**: Blue-purple, low saturation — mapped to shadcn/ui `violet` palette adjusted
to be less vivid. CSS variable `--primary` set to a muted indigo-violet hue.

**Icons**: `lucide-react` only. Always use named imports: `import { Sun } from 'lucide-react'`.
Never import from sub-paths or use default icon imports. Do not use any other icon library.

## Known Solutions

**Next.js 16: all request-time APIs are async**
`cookies()`, `headers()`, `params`, and `searchParams` no longer have synchronous access.
Always `await` them: `const cookieStore = await cookies()`.
This applies in Server Components, Route Handlers, and layouts.

**Next.js 16: `middleware.ts` → `proxy.ts`**
The file is now named `proxy.ts` (or `src/proxy.ts`). Export a named `proxy` function
(or default export). The `NextRequest`/`NextResponse` API is unchanged.
`matcher` config export is the same.

**Next.js 16: `experimental.turbopack` → top-level `turbopack`**
Turbopack is default for both `next dev` and `next build`.
If configuring turbopack options, use `turbopack: {}` at the top level of `nextConfig`,
not inside `experimental`.

**Zod v4 breaking changes (installed via shadcn/ui)**
shadcn/ui installs Zod v4, which has two breaking changes vs v3:
- `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` (key schema required)
- `z.string().datetime()` → removed; use `z.string()` or `z.iso.datetime()` instead
