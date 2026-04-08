# CLAUDE.md — Rift Frontend

## Role

Senior TypeScript/Next.js developer. Write production-quality, type-safe code.
Follow conventions exactly — do not invent patterns.

**Before writing code, read:**
- `../API_CONTRACT.md` — shared API contract (data shapes, endpoints, auth flow)
- `../RULES.md` — business invariants (timezone, post type rules, media, auth, pagination)

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
│   └── proxy.ts                         # protects /mod/* — redirects to /mod/login if no cookie
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

**TipTap document types — `src/types/tiptap.ts`**
Structural types (`TipTapDoc`, `TipTapNode`, `TipTapMark`) live in `src/types/tiptap.ts`.
`RichTextContentProps.content` is typed as `TipTapDoc`. The Zod runtime schema
(`z.record(z.string(), z.unknown())`) retains loose validation since deep recursive
JSON validation is impractical; TypeScript safety is added via `as unknown as z.ZodType<TipTapDoc>` cast.

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

**`PostUpdateSchema` omits `type` — post type is immutable after creation**
`PostUpdateSchema = PostCreateSchema.omit({ type: true })`. Sending `type` in a PUT request
would silently change a NEWS post to a PROMO, breaking slugs, routing, and display logic.
`PostForm` uses `PostCreate` as its form state (so it always knows the type for field
visibility). Admin edit pages omit `type` when calling `updatePost()` — the form type and
the API payload type are intentionally different.

**`ApiError` carries structured `detail` for FastAPI error responses**
FastAPI returns `{"detail": "..."}` (string) or `{"detail": [{loc, msg, type}]}` (array) for 422.
`ApiError.detail: ApiErrorDetail` captures the parsed value. In admin forms, inspect `error.detail`:
if it's an array, iterate and call `form.setError(loc.at(-1), { message: msg })` for each item.
If it's a string, show it as a toast or form-level error. The `message` field always has a
human-readable fallback regardless of `detail` shape.

**`getMoscowTodayStr()` delegates to `getMoscowTodayDateStr()`**
Both functions produce `YYYY-MM-DD` in Moscow time. The private `getMoscowTodayDateStr()` uses
`sv-SE` locale (native ISO format). `getMoscowTodayStr()` (public, used by `Timeline`) was
previously duplicating this with `en-CA` + `formatToParts` — unnecessary verbosity. Fix: delegate
directly. If you need to add a third call site, use `getMoscowTodayStr()` — do not add a third locale.

**Next.js 16: all request-time APIs are async**
`cookies()`, `headers()`, `params`, `searchParams` — always `await` them.

**Next.js 16: middleware file must be named `proxy.ts`**
File is `src/proxy.ts`, export named `proxy`. Next.js 16 deprecated the `middleware.ts`
convention and now expects `proxy.ts` — using `middleware.ts` triggers a build warning and
will stop working in a future version. The matcher config export and `NextRequest`/
`NextResponse` API are unchanged.

**Next.js 16: `experimental.turbopack` → top-level `turbopack`**
Turbopack is default for `next dev` and `next build`. Config moves out of `experimental`.

**Next.js router cache causes stale admin pages after logout**
After logout, previously visited `/mod/*` pages are served from the browser's in-memory
router cache without hitting the proxy. Fix: `experimental.staleTimes: { dynamic: 0 }` in `next.config.ts`
disables the router cache for dynamic routes, ensuring every navigation makes a fresh server
request. Do not remove this setting — without it, authenticated page renders survive logout.

**Next.js font variables must be on `<html>`, not `<body>`**
`@layer base { html { font-family: var(--font-sans) } }` reads CSS variables from `<html>`.
If the variable className is applied to `<body>` instead, the parent can't read it and
the font silently falls back. Always apply font variable classNames to `<html>`.

**Zod v4 (installed via shadcn/ui) — two breaking changes vs v3**
- `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` (key schema required)
- `z.string().datetime()` → removed; use plain `z.string()`

**`next/image` — dev vs production image config**
Next.js 15/16 blocks image optimization for private IPs (127.0.0.1/localhost). In development:
`images: { unoptimized: true }`. In production: `remotePatterns` with the hostname extracted
from `NEXT_PUBLIC_API_URL` at build time. The hostname parsing uses a try/catch with a
"localhost" fallback. Do not set `unoptimized: true` globally — it disables srcset and lazy
loading in production where they add value.
`pathname` must include the full public path prefix. Since Nginx routes `v1.kekl.ru/be/` →
FastAPI and `mediaUrl()` produces `https://v1.kekl.ru/be/uploads/...`, the pattern is
`"/be/uploads/**"` — not `"/uploads/**"`. Always derive this from the `NEXT_PUBLIC_API_URL`
path segment, not just its hostname.

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

**Scrollbar customization pattern**
Use the `.scrollbar-thin` utility class defined in `globals.css`. It sets `scrollbar-width: thin` + `scrollbar-color` (standard spec) and `::-webkit-scrollbar` rules (WebKit). Both use `var(--color-border)` so the scrollbar adapts to dark/light theme automatically. Apply to any `overflow-x-auto` or `overflow-y-auto` container that needs a subtle scrollbar.

**Today indicator in Timeline — final architecture**
The indicator is split into two independent elements to avoid the alignment problem entirely:

1. **Triangle** — a single `absolute` div (`w-0 h-0`, CSS border trick) inside the outer `relative pt-[5px]` wrapper. `top: 0`, `left: column_center - 4`. The 5px padding creates the gap; the triangle body (5px tall) fills it, tip flush with the date row top.

2. **Line** — a separate `absolute top-0 bottom-0 w-px` div inside the events container (`relative pt-[10px] pb-[10px]`), same `left: column_center`. Starts strictly below the date row — no overlap with the date cell.

3. **Today date cell** — `bg-primary/10 ring-1 ring-primary`. The ring visually bridges triangle and line.

**Approaches rejected:**
- *Flex centering (original)*: `items-center` on a container whose only child is a 0-width border-trick element gives flexbox nothing to center against — 1px sub-pixel drift between triangle tip and line was unavoidable.
- *Explicit container width (8px)*: Same problem — the 1px line center (X+0.5) and the triangle tip (integer X) can never share the same CSS pixel at 1× DPR.
- *SVG*: Solved the coordinate problem but introduced unnecessary complexity for a layout that should be pure CSS/HTML.
- *Opaque date cell background (`bg-background`)*: Theme-dependent hack — the line was still physically there, just hidden. Failed in practice because `bg-primary/10` on adjacent cells made the mismatch visible at some zoom levels.
- *Split triangle + line (final)*: No alignment needed at all — triangle and line live in separate layout contexts and never touch. The date cell's ring border creates the visual continuity.

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

**Admin post form — conditional field visibility by type**
The Type selector is always first. All other fields are conditionally rendered based on
the selected type (watched via `useWatch`). Field visibility matrix:

| Field            | NEWS | ARTICLE | EVENT | PROMO |
|------------------|------|---------|-------|-------|
| Title            | ✓    | ✓       | ✓     | —     |
| Cover Image      | ✓    | ✓       | ✓     | —     |
| Tags             | ✓    | —       | —     | —     |
| Content (TipTap) | ✓    | ✓       | ✓     | —     |
| Start / End Date | —    | —       | ✓     | ✓     |
| Promo Code       | —    | —       | —     | ✓     |
| Metadata (JSON)  | —    | —       | ✓     | —     |

`promo_code` is a dedicated top-level column — rendered as a labeled text input for PROMO,
never stored in `post_metadata`. For EVENT, `post_metadata.external_link` is exposed as a
dedicated URL input (not a raw JSON editor). Future public-side logic: if `external_link` is
set and a checkbox is checked, the post link redirects to the external URL instead of the
detail page. Start/End dates use `datetime-local` inputs; null = not set (indefinite).

**Post phase label logic — `getPostPhase(startDate, endDate)` in `src/lib/date.ts`**
Both `DaysLabel` components (in `timeline.tsx` and `promo-item.tsx`) share identical
phase-based label logic. The function returns a discriminated union used to render
Russian-language labels. Decision matrix (Moscow time throughout):

| `start_date` | `end_date` | Condition | Label |
|---|---|---|---|
| null | null | — | Бессрочно |
| null | future | — | Осталось X дней |
| null | today | — | Истекает сегодня |
| null | past | — | Истёк X дней назад |
| future | any | before start | Начнётся через X дней |
| today | any | starts today | Начинается сегодня |
| past | null | no end set | Бессрочно |
| past | future | ongoing | Осталось X дней |
| past | today | — | Истекает сегодня |
| past | past | — | Истёк X дней назад |

Key rule: `start_date` takes priority if it's in the future (or today). Once it has
passed, fall through to `end_date` logic. Logic is identical for EVENT and PROMO types.
The old `daysRemaining(endDate)` helper is replaced by `getPostPhase(startDate, endDate)`.

**`suppressHydrationWarning` on all date-dependent text spans**
`DaysLabel` calls `new Date()` at render time. Server render and client hydration
timestamps can differ, causing React error #418 (text node mismatch). Fix: add
`suppressHydrationWarning` to every `<span>` that renders dynamic date text.
This applies to both `timeline.tsx` and `promo-item.tsx`.

**Shared `DaysLabel` component — `src/components/days-label.tsx`**
`getPostPhase(startDate, endDate)` is rendered identically across post-detail, post-row-item,
timeline, and promo-item. All callers pass `className="text-xs"` except post-detail (inherits
from parent). `suppressHydrationWarning` is required on every span because `getPostPhase()`
calls `new Date()` at render time, causing a server/client text node mismatch (React error #418).
The component is a Server Component — no `"use client"` needed since it has no state or browser APIs.

**PromoItem clipboard island — `src/components/promo-copy-button.tsx`**
`PromoItem` is a Server Component. Only the copy-to-clipboard interaction requires a client
boundary — extracted into `PromoCopyButton` (accepts `promoCode: string`). This is the
`"use client"` push-down pattern: isolate browser API usage into the smallest possible subtree.

**Timeline layout constants — `TIMELINE_CONFIG` object in `timeline.tsx`**
`COL_WIDTH`, `TOTAL_COLS`, and `TODAY_IDX` are interdependent (STRIP_WIDTH = TOTAL_COLS × COL_WIDTH;
TODAY_IDX must satisfy TODAY_IDX < TOTAL_COLS). Grouping them in `TIMELINE_CONFIG as const` makes
the dependency explicit and prevents silent drift. Destructured at usage so the rest of the file
reads unchanged.

**Timeline day window uses UTC Date arithmetic**
`buildDayWindow()` constructs dates via `Date.UTC(y, m, d) + i * 86_400_000` and reads them
back with `getUTCDate()`, `getUTCMonth()`, `getUTCDay()`. This makes column placement
completely timezone-independent: a visitor in UTC-8 and a visitor in UTC+9 see identical
column indices for any given event. The `today` string (Moscow time, `YYYY-MM-DD`) is
provided by the parent via `getMoscowTodayStr()` — the Timeline component itself never
calls `new Date()`.

**`export const revalidate` is not in the v16 route segment config table**
`revalidate`, `dynamic`, and `fetchCache` were removed from the route segment config options
in Next.js v16.0.0 — but only when `cacheComponents` is enabled in `next.config.ts`. We do
NOT enable `cacheComponents`, so `export const revalidate = 60` still works on all public
pages and will continue to do so.
Do not add `cacheComponents: true` to `next.config.ts` without reading the official
"Caching and Revalidating (Previous Model)" migration guide. The new alternatives are
`cacheLife()` and `cacheTag()` from `next/cache`. Until a migration is needed, keep using
`revalidate = 60` on all public listing and detail pages.

**`proxy.ts` does not protect Server Functions (Server Actions)**
The official docs explicitly warn: "Always verify authentication and authorization inside
each Server Function rather than relying on Proxy alone." A Proxy matcher that covers a page
route does NOT intercept `POST` requests to Server Functions defined on that page — they are
handled as a separate POST to the same route and bypass Proxy matching.
Rift currently has no Server Functions. If any are added (e.g., `'use server'` form actions),
each function must verify the token internally — do not rely on `proxy.ts` for their protection.

**`PageProps<'/route/[slug]'>` — strongly typed page props in Next.js 16**
Next.js 16 provides a globally available `PageProps` generic that gives strict typing for
`params` and `searchParams` — no import needed after running `next build` or `next typegen`.
```tsx
// Instead of:
export default async function Page({ params }: { params: Promise<{ slug: string }> }) {

// You can write:
export default async function Page(props: PageProps<'/news/[slug]'>) {
  const { slug } = await props.params
```
The route literal (`'/news/[slug]'`) enables autocomplete and prevents typos in param key
names. It is generated from the file system during `next dev` or `next build`. Static routes
resolve `params` to `{}`. Either style is correct — use `PageProps` when the stricter typing
is valuable.

## Module Addition & UI Extension Protocol

Mandatory checklist. Every step must be completed in order. No skipping.

### 0. Pre-work (every change)

- [ ] Read `API_CONTRACT.md` — never assume a field or endpoint exists
- [ ] Read the existing components you are touching before writing anything
- [ ] Check `src/components/ui/` for a shadcn primitive that already covers the need
- [ ] Check **Design Decisions** in this file for established patterns
- [ ] **Next.js 16: all request-time APIs are async** — `await params`, `await searchParams`, `await cookies()`, `await headers()` wherever you call them in Server Components or Route Handlers. Never call them synchronously.
- [ ] **Route protection:** `/mod/*` is auto-covered by `proxy.ts` matcher. If adding a new protected route **outside** `/mod/`, update the `matcher` array in `src/proxy.ts`. Never create a second middleware/proxy file.
- [ ] **Server Functions / Server Actions:** if adding `'use server'` functions, do NOT rely on `proxy.ts` for auth. Verify the token inside each Server Function — the proxy does not intercept Server Function POST requests.

### 1. API Alignment — contract first

For any new data display or mutation:

- [ ] Confirm the endpoint exists in `API_CONTRACT.md`
- [ ] Add or update the Zod schema in `src/lib/schemas/index.ts` to mirror the response shape exactly
- [ ] Add the typed fetch function to `src/lib/api/client.ts`
- [ ] If a new field is needed: update `API_CONTRACT.md` first, then the backend, then the schema — never the other way around

Write schemas before components. Never write a component that uses a type you invented.

### 2. New public section or post type

**If adding a new PostType value:**
- [ ] Add to `PostType` enum in backend `src/posts/models.py` + Alembic migration
- [ ] Update `API_CONTRACT.md` with the new type and any type-specific fields
- [ ] Add the new value to `PostType` in `src/lib/schemas/index.ts`
- [ ] Add the URL mapping to `postHref()` in `src/lib/post-href.ts`

**For every new public section (with or without a new PostType):**
- [ ] Create `src/app/(public)/[section]/page.tsx` — archive/listing page
- [ ] Create `src/app/(public)/[section]/[slug]/page.tsx` — detail page
- [ ] Wrap every page in `PageContainer` — never hardcode `max-w-7xl`; never bypass it
- [ ] Add the section link to `src/components/nav.tsx` (desktop list + mobile menu — both)
- [ ] Add a homepage block to `src/app/(public)/page.tsx` if the section needs homepage presence; only render when content exists (non-empty array guard); respect block order: News+Promos | Events | Articles
- [ ] Add the type to the `BACK` and `TYPE_LABEL` maps in `src/components/post-detail.tsx`
- [ ] Add `export const revalidate = 60` to every listing page (`[section]/page.tsx`). Detail pages (`[section]/[slug]/page.tsx`) also use `revalidate = 60` unless the content type warrants a different TTL.
- [ ] Detail page data fetching: use the two-step pattern — `listPosts({ slug })` to get the ID, then `getPost(id)` for the full shape. A direct `GET /posts/slug/{slug}` endpoint does not yet exist (tracked in `backend/docs/ARCHITECTURE.md` § Detail Page Double Fetch).
- [ ] In dynamic route segments (`[slug]/page.tsx`), always `await params` before accessing `.slug`: `const { slug } = await params`.
- [ ] Any span that renders output from `getPostPhase()`, `formatDate()`, or any `new Date()` call at render time **must** have `suppressHydrationWarning` — server and client timestamps differ, causing React hydration error #418.
- [ ] Update the **Structure** tree in this file
- [ ] Update the **Post type → URL mapping** table in this file

### 3. New admin section

- [ ] New routes under `/mod/` are automatically protected by the `proxy.ts` matcher (`/mod/:path*`). No proxy changes needed. If you create a protected route outside `/mod/`, update the matcher.
- [ ] Create `src/app/mod/[section]/page.tsx` — list/index view
- [ ] Create `src/app/mod/[section]/[id]/page.tsx` — edit view (if needed)
- [ ] Add a sidebar link in `src/components/mod/sidebar.tsx`
- [ ] Data fetching: `useQuery` for reads, `useMutation` for writes (TanStack Query)
- [ ] Token: always via `useToken()` from `src/components/mod/token-context.tsx`
- [ ] Invalidate affected query keys on every mutation success — never leave stale cache
- [ ] Update the **Structure** tree in this file

### 4. Layout sync rules

**Nav (`src/components/nav.tsx`):**
- Nav links are section-level only: `/news`, `/articles`, `/events`, `/promos`
- Every new top-level public section gets a link in both desktop and mobile menus
- Keep link order consistent with homepage block order

**Homepage (`src/app/(public)/page.tsx`):**
- One block per content type; block only renders when its data array is non-empty
- Block order: News+Promos | Events | Articles — do not reorder unless explicitly instructed
- New sections append after Articles unless the design specifies otherwise

**PageContainer:**
- Source: `src/components/page-container.tsx` (`max-w-7xl px-4 py-10`)
- Required on every public page and post detail — no exceptions
- Admin pages use the mod layout (`sidebar + flex-1` content area from `mod/layout.tsx`) — do not use PageContainer in admin

### 5. Design tokens

**Color:**
- Use Tailwind semantic classes only: `bg-primary`, `text-muted-foreground`, `border-input`, `bg-card`, `bg-destructive`, `bg-background`, `text-foreground`
- Opacity modifiers: `bg-primary/10` — never custom rgba
- Status-indicator exceptions allowed: `text-yellow-500` (warning), `text-green-500` (success), `text-destructive` (error)
- Never hardcode hex, RGB, or oklch values in component files — those belong in `globals.css` as CSS custom properties only

**Typography:**
- Body: inherit; do not set font-size on containers unless overriding prose
- Russian UI copy: always `ru-RU`; dates always via `formatDate()` from `src/lib/date.ts`
- Rich text containers: always include `dark:prose-invert` alongside `prose`

**Dark mode:**
- Every class must work in both light and dark — use `dark:` only when the base semantic class is insufficient
- Never use `dark:bg-[#...]` with hardcoded values

**Spacing/sizing:**
- Tailwind spacing scale only (multiples of 4px)
- Avoid arbitrary values like `w-[137px]` unless implementing pixel-precise layout
- Any pixel-precise layout constants belong in a `CONFIG as const` object (pattern: `TIMELINE_CONFIG` in `timeline.tsx`) — never inline magic numbers

**Date and timezone arithmetic:**
- Never use `new Date(year, month, day)` for calendar logic — this creates local-timezone midnight and produces wrong column placement for visitors outside UTC.
- Always use `Date.UTC(year, month, day) + offset_ms` for construction and `getUTCDate()`, `getUTCMonth()`, `getUTCDay()` for reading back.
- `today` context always comes from `getMoscowTodayStr()` in `src/lib/date.ts` — never call `new Date()` directly in a component to get "today".
- All date-rendering spans (anything that calls `getPostPhase()`, `formatDate()`, or `new Date()` at render time) require `suppressHydrationWarning` to suppress React hydration error #418.

### 6. Component choice — decision tree

Run these checks in order before creating anything:

1. **Does `src/components/ui/` have it?** → Use it. Never re-implement Button, Badge, Dialog, Select, etc.
2. **Display only, no state, no browser APIs?** → Server Component. No `"use client"`.
3. **Needs state or browser APIs?** → Find the smallest possible subtree and add `"use client"` only there (island pattern — see `PromoCopyButton`). The parent stays a Server Component.
4. **Same rendering logic in 2+ places?** → Extract to `src/components/` shared component immediately. Do not defer. (Lesson: `DaysLabel` was duplicated across 4 files before extraction.)
5. **Admin-only?** → `src/components/mod/`
6. **Icons:** `lucide-react` named imports only — `import { Sun } from 'lucide-react'`. No other icon library.
7. **Animation:** Tailwind transitions only (`transition-colors`, `transition-opacity`). No Framer Motion without explicit approval.

### 7. Schema and type discipline

- All Zod schemas: `src/lib/schemas/index.ts` — one file
- `PostCreateSchema` and `PostUpdateSchema` are **separate** — `PostUpdate` omits `type` (`type` is immutable after creation)
- New field in a schema: update Zod schema + TS type + every component consuming that type — no partial updates
- TipTap content: always `TipTapDoc` from `src/types/tiptap.ts` — never `Record<string, unknown>`
- Never widen a type to silence a compiler error — fix the root cause

### 8. Error handling

- `ApiError` carries a structured `detail` field: `string` for simple errors, `Array<{loc, msg}>` for FastAPI field-level validation errors
- In admin forms: catch `ApiError`, inspect `error.detail`, call `form.setError("fieldName", { message })` for field-level errors — surface them inline, not just in a toast
- In public pages: `console.error` + graceful fallback UI — never crash the page
- Never swallow errors silently anywhere

### 9. Documentation sync — mandatory

| Trigger | Action |
|---|---|
| New public route | Update **Structure** tree in this file |
| New admin route | Update **Structure** tree in this file |
| New post type | Update `API_CONTRACT.md` + **Post type → URL mapping** table in this file |
| New component with non-obvious pattern | Add to **Design Decisions** in this file |
| New gotcha or workaround | Add to **Known Solutions** in this file |
| New or changed API endpoint | Update `API_CONTRACT.md` (SSOT) — never restate in domain files |
| New nav link | Update the nav link comment in `nav.tsx` listing all current links |
| New protected route outside `/mod/*` | Update `matcher` array in `src/proxy.ts` |

---

## TODO.md

`frontend/TODO.md` is the living task list. Update it at the start and end of every task.
