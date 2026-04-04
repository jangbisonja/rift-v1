# CLAUDE.md — Rift Frontend

## Role

Senior TypeScript/Next.js developer. Write production-quality, type-safe code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
- `../CLAUDE.md` — project overview, API contract, endpoint reference

## Stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4** + **shadcn/ui** (components are copied into `src/components/ui/`, not a package)
- **TipTap** — headless editor, minimal setup only (see TipTap section below)
- **React Hook Form** + **Zod v4** — form state and schema validation
- **TanStack Query** — client-side server state (admin panel only)
- **next-themes** — dark/light toggle
- **lucide-react** — icons only

## Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── (public)/                    # public-facing pages (SSR via Server Components)
│   │   │   ├── page.tsx                 # homepage — News+Promos | Events | Articles
│   │   │   ├── news/page.tsx + [slug]/  # news listing + detail
│   │   │   ├── articles/page.tsx + [slug]/
│   │   │   ├── events/page.tsx + [slug]/
│   │   │   └── promos/page.tsx + [slug]/
│   │   ├── mod/                         # admin panel (Client Components + TanStack Query) — TODO
│   │   │   ├── login/page.tsx
│   │   │   ├── posts/
│   │   │   ├── tags/
│   │   │   └── media/
│   │   ├── api/auth/
│   │   │   ├── login/route.ts           # POST: exchanges credentials → sets HTTP-only cookie
│   │   │   └── logout/route.ts          # POST: clears cookie
│   │   └── layout.tsx                   # root layout — Nav + Providers
│   ├── components/
│   │   ├── ui/                          # shadcn/ui (do not edit manually)
│   │   ├── editor/rich-editor.tsx       # TipTap wrapper (always "use client")
│   │   ├── nav.tsx                      # sticky header — logo + section links + theme toggle
│   │   ├── cover-image.tsx              # next/image wrapper with muted placeholder fallback
│   │   ├── post-hero.tsx                # large featured post card (16:9 cover + title)
│   │   ├── post-row-item.tsx            # horizontal card — cover left, title right
│   │   ├── post-detail.tsx              # full post layout — cover + metadata + rich text
│   │   ├── promo-item.tsx               # compact promo card for right-column list
│   │   ├── rich-text-content.tsx        # server-side TipTap JSON → HTML (generateHTML)
│   │   ├── theme-toggle.tsx             # Sun/Moon button ("use client")
│   │   └── providers.tsx               # next-themes ThemeProvider ("use client")
│   ├── lib/
│   │   ├── api/
│   │   │   ├── client.ts               # typed fetch wrapper for all backend endpoints
│   │   │   └── server.ts               # getServerToken() — reads cookie on server side
│   │   ├── schemas/index.ts            # Zod schemas — PostListItem, Post, Tag, Media, etc.
│   │   ├── media.ts                    # mediaUrl(path) — prepends NEXT_PUBLIC_API_URL
│   │   └── post-href.ts               # postHref(type, slug) — maps PostType → URL path
│   └── proxy.ts                        # protects /mod/* — redirects to /mod/login if no cookie
```

## Component Boundary Rules

**Server Component** (default — no `"use client"`):
- All public pages and layouts
- Fetches data directly via `client.ts`
- No hooks, no interactivity, no browser APIs

**Client Component** (`"use client"` required):
- `providers.tsx`, `theme-toggle.tsx` — use hooks from next-themes
- Everything inside `/mod` that has state or interactivity
- The TipTap editor (uses browser APIs)
- Forms using React Hook Form / TanStack Query

Rule: push `"use client"` as deep into the tree as possible.

## Auth

**Pattern**: HTTP-only cookie storing the backend JWT. Never in localStorage.

Flow:
1. User submits login form → POST `/api/auth/login` (Route Handler)
2. Route Handler calls `POST /auth/login` on backend
3. On success, sets `token` as HTTP-only cookie
4. `proxy.ts` checks for the cookie on every `/mod/*` request — redirects to `/mod/login` if missing
5. Server Components: use `getServerToken()` from `lib/api/server.ts`, pass as `token` option to client
6. Client Components: `fetch` sends cookie automatically (same origin)
7. Logout: POST `/api/auth/logout` → clears cookie

## API Client

`src/lib/api/client.ts` — single entry point for all backend calls.

- `listPosts()` returns `PostListItem[]` — list shape (no `content`, no `post_metadata`)
- `getPost(id)` returns `Post` — full shape (includes `content`, `post_metadata`)
- See `../CLAUDE.md` for endpoint reference and query param names

## Schemas

Two distinct types for posts — match the two backend response shapes:

| Type | Source | Has content? | Has media? |
|---|---|---|---|
| `PostListItem` | `GET /posts` | No | Yes (`MediaRead[]`) |
| `Post` | `GET /posts/{id}` | Yes | Yes (`MediaRead[]`) |

`MediaRead` (inside posts) has: `id`, `path`, `original_name`.
`Media` (from `GET /media`) additionally has: `post_id`, `created_at`.

## Media / Cover Images

Cover image URL: `mediaUrl(post.media[0].path)` from `src/lib/media.ts`.
Backend serves uploads at `GET /uploads/...` (static files, no auth required).
`next/image` remote pattern configured in `next.config.ts` for `localhost:8000/uploads/**`.
Use `CoverImage` component — handles the `fill` vs fixed size cases and shows a muted
placeholder div when `media[]` is empty.

## TipTap Setup

**Minimal scope — do not add extensions beyond this list without explicit instruction.**

Extensions:
- `StarterKit` — bold, italic, headings, lists, code, blockquote, etc.
- `Image` — inline image insertion (URL-based)

The editor output is TipTap JSON (`{ "type": "doc", "content": [...] }`) — maps directly
to the `content` field on the backend `Post` model.

`RichTextContent` renders this JSON server-side using `generateHTML` from `@tiptap/core`
(no editor loaded, pure HTML output).

Do not import: video, audio, iframe, drag handle, slash commands, or any other extension.

## Forms

- **React Hook Form** + `zodResolver` + **Zod v4** schemas from `src/lib/schemas/`
- Validation errors should match what the backend would reject

## Data Fetching

| Context | Pattern |
|---|---|
| Public pages | Server Component — `client.ts` directly, `revalidate = 60` |
| Admin reads | TanStack Query `useQuery` |
| Admin writes | TanStack Query `useMutation` + invalidate on success |

## Design Decisions

**Font**: Nunito Sans (Google Fonts) via `next/font/google`. Variable `--font-nunito-sans`
set on `<html>` element (not `<body>`) so CSS inheritance works correctly.

**Theme**: Dark by default (`defaultTheme="dark"` in ThemeProvider). Toggle in top-right
of Nav. Not pure black — background uses `oklch(0.17 0.01 275)` (dark with subtle blue-purple tint).

**Primary color**: Muted blue-purple — `oklch(0.55 0.14 285)` light / `oklch(0.65 0.14 285)` dark.

**Icons**: `lucide-react` only. Named imports: `import { Sun } from 'lucide-react'`.
Never use barrel/default imports or any other icon library.

**Homepage layout**:
```
[ News hero + 3 row items ]  [ Promos list ]
[ Events list                              ]
[ Articles 2-col grid                      ]
```
Sections only render when they have published content.

**Post type → URL mapping** (via `postHref(type, slug)` in `src/lib/post-href.ts`):
- `NEWS` → `/news/[slug]`
- `ARTICLE` → `/articles/[slug]`
- `PROMO` → `/promos/[slug]`
- `EVENT` → `/events/[slug]`

## Known Solutions

**Next.js 16: all request-time APIs are async**
`cookies()`, `headers()`, `params`, `searchParams` — always `await` them.

**Next.js 16: `middleware.ts` → `proxy.ts`**
File is `src/proxy.ts`, export named `proxy` function (or default). Same `NextRequest`/
`NextResponse` API. Same `matcher` config export.

**Next.js 16: `experimental.turbopack` → top-level `turbopack`**
Turbopack is default for `next dev` and `next build`. Config moves out of `experimental`.

**Next.js font variables must be on `<html>`, not `<body>`**
`@layer base { html { font-family: var(--font-sans) } }` reads CSS variables from `<html>`.
If the variable className is applied to `<body>` instead, the parent can't read it and
the font silently falls back. Always apply font variable classNames to `<html>`.

**Zod v4 (installed via shadcn/ui) — two breaking changes vs v3**
- `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` (key schema required)
- `z.string().datetime()` → removed; use plain `z.string()`

**`next/image` with localhost backend — private IP block**
Next.js 15/16 blocks image optimization requests that resolve to private IPs (127.0.0.1).
`remotePatterns` alone is not enough. Fix: `images: { unoptimized: true }` in `next.config.ts`.
This is fine because the backend already converts all uploads to WebP.
In production with a public hostname, switch back to `remotePatterns`.

**TipTap `useEditor` — must set `immediatelyRender: false` in Next.js**
Without this flag, TipTap detects SSR and throws a hydration mismatch error on client
components that render inside a server-rendered tree. Always include it in `useEditor({...})`.

**`PostListItem` vs `Post` — two different backend response shapes**
`GET /posts` returns `PostListItem[]` (no `content`/`post_metadata`/`updated_at`).
`GET /posts/{id}` returns `Post` (full). Detail pages must call `getPost(id)` after the
list lookup to get the content for rendering.

## TODO.md

`frontend/TODO.md` is the living task list. Update it at the start and end of every task.
