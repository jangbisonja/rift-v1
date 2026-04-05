# CLAUDE.md — Rift Frontend

## Role

Senior TypeScript/Next.js developer. Write production-quality, type-safe code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
- `../API_CONTRACT.md` — shared API contract (data shapes, endpoints, auth flow)

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
│   │   ├── post-hero.tsx                # large featured post card (3:1 cover + title)
│   │   ├── post-row-item.tsx            # horizontal card — cover left, title right
│   │   ├── post-detail.tsx              # full post layout — cover + metadata + rich text
│   │   ├── promo-item.tsx               # compact promo card for right-column list
│   │   ├── rich-text-content.tsx        # server-side TipTap JSON → HTML (custom DOM-free recursive renderer — generateHTML requires DOM)
│   │   ├── theme-toggle.tsx             # Sun/Moon button ("use client")
│   │   ├── providers.tsx               # next-themes ThemeProvider ("use client")
│   │   └── mod/
│   │       ├── sidebar.tsx             # admin nav sidebar
│   │       ├── post-form.tsx           # shared create/edit form (title, type, tags, cover, content, metadata)
│   │       ├── token-context.tsx       # React context providing JWT token to client components
│   │       ├── media-picker-modal.tsx  # gallery picker modal for TipTap editor
│   │       ├── breadcrumbs.tsx         # breadcrumb nav for admin pages
│   │       └── confirm-dialog.tsx      # reusable confirmation dialog
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
- See `../API_CONTRACT.md` for endpoint reference and query param names

## Schemas

Zod schemas in `src/lib/schemas/index.ts` mirror the backend response shapes defined
in `../API_CONTRACT.md`. Keep them in sync — do not redefine data shapes here.

## Media / Cover Images

Cover image: `post.cover_media` (`MediaRead | null`). Use `CoverImage` component which
accepts `cover: MediaRead | null`, handles fill vs fixed size, and shows a muted placeholder
when null. URL: `mediaUrl(cover.path)` from `src/lib/media.ts`.
Backend serves uploads at `GET /uploads/...` (static files, no auth required).
`next/image` remote pattern configured in `next.config.ts` for `localhost:8000/uploads/**`.

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

## Category Rendering

Per-category layout specs (cards, homepage blocks, archive pages): `frontend/docs/CATEGORIES.md`.

## Locale & Timezone

- **Public UI language**: Russian — `ru-RU` locale on all public-facing pages (dates, labels, copy).
- **Timezone**: `Europe/Moscow` (UTC+3, permanently — no DST). Use this for all date formatting and calculations.
- Date formatting: `new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', ... })`
- Days-remaining calculations: interpret `YYYY-MM-DD` dates as end-of-day in Moscow time.
- **Shared date utility**: `src/lib/date.ts` exports `formatDate(dateStr: string): string`. Use this on all public pages wherever a date is displayed. The formatter is instantiated once at module level (not per call) using `ru-RU` locale and `Europe/Moscow` timezone.

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

**`PageContainer` — single source of truth for page layout width**
All public-facing pages and the post detail use `src/components/page-container.tsx`
(`max-w-7xl px-4 py-10`). All content — title, metadata, cover, body — spans the full
`PageContainer` width. Never hardcode `max-w-7xl` directly in a page — use the component.

**Admin panel layout**: Left sidebar (Posts / Tags / Media / Log out) + content area. The
`/mod/layout.tsx` conditionally renders: no token → narrow centered container (login page);
has token → full sidebar layout with `QueryProvider` + `TokenProvider`.

**Post status actions**: Available on both the posts list page *and* the edit page header.
The edit page is the primary place users land after creating a post, so status controls
(Publish / Unpublish / Archive) must be reachable from there.

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

**Next.js router cache causes stale admin pages after logout**
After logout, previously visited `/mod/*` pages are served from the browser's in-memory
router cache without hitting the proxy. Fix: `staleTimes: { dynamic: 0 }` in `next.config.ts`
disables the router cache for dynamic routes, ensuring every navigation makes a fresh server
request. Do not remove this setting — without it, authenticated page renders survive logout.

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

**TipTap v3 `generateHTML` is NOT usable server-side — use the custom renderer**
`generateHTML` from `@tiptap/core` v3 requires `document.createDocumentFragment` (DOM).
In a Server Component (Node.js) this throws `window is not defined` / `createDocumentFragment
is not a function`, silently caught by try/catch → empty content rendered.
Fix: `src/components/rich-text-content.tsx` uses a custom DOM-free recursive renderer.
Never re-introduce `generateHTML` in a Server Component.

**`zodResolver` + Zod schemas with `.default()` — type mismatch with `useForm<T>`**
`zodResolver(schema)` infers the *input* type (fields with `.default()` are optional).
`useForm<PostCreate>` expects a resolver typed against the *output* type (all fields required).
Fix: cast the resolver — `zodResolver(schema) as unknown as Resolver<PostCreate>`.
Import `Resolver` from `react-hook-form`.

**Admin panel token pattern — HTTP-only cookie → React context**
HTTP-only cookies can't be read by client-side JS. Pattern for the `/mod` admin panel:
1. `/mod/layout.tsx` (Server Component) reads the cookie via `getServerToken()`
2. Passes token to `<TokenProvider token={token}>` (Client Component, `src/components/mod/token-context.tsx`)
3. All client components call `useToken()` to get the token for `client.ts` API calls
This avoids creating proxy route handlers for every admin endpoint.

**`/mod/login` must be excluded from the proxy redirect**
The proxy matcher covers all `/mod/*` routes. Without an explicit `pathname === "/mod/login"`
early return, unauthenticated requests loop: proxy redirects to `/mod/login`, which also
matches the middleware, causing infinite redirects.

**Cover image is `post.cover_media`, not `post.media[0]`**
`post.cover_media: MediaRead | null` is the designated cover, set via `cover_media_id` in
create/update requests. `post.media[]` is the gallery (items attached via the attach endpoint,
used by the editor library picker). TipTap body images are uploaded and inserted by URL only —
they must NOT be attached via the attach endpoint. `CoverImage` component accepts `cover: MediaRead | null`.

**Cover image is saved atomically with the post form**
`PostForm` manages the cover via `initialCoverMedia` prop (display) + `onCoverUpload` prop
(upload callback returning `MediaRead`). `cover_media_id` is a hidden form field — on submit,
it goes in the `PUT /posts/{id}` body alongside title/content/etc. No separate mutation needed.

**TipTap media integration — upload + library picker pattern**
`RichEditor` accepts two optional props: `onUploadImage(file) → Promise<string>` (returns URL
to insert) and `mediaLibrary: MediaRead[]` (shows a picker button for gallery-attached media).
Upload/attach logic lives in the page, not the editor. Body images: upload only, no attach.
Gallery images: upload + attach via `POST /media/{id}/attach/{post_id}` — available in picker.
`MediaPickerModal` (`src/components/mod/media-picker-modal.tsx`) shows the gallery grid.
If `mediaLibrary` prop is absent, the editor hides the picker button.

## TODO.md

`frontend/TODO.md` is the living task list. Update it at the start and end of every task.
