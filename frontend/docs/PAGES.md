# Pages Reference

## Public Pages

All public pages are Server Components. Data is fetched directly from the backend
with `revalidate = 60`. All pages use `PageContainer` for uniform `max-w-7xl` layout.

| Route | File | Description |
|---|---|---|
| `/` | `app/(public)/page.tsx` | Homepage — News+Promos \| Events \| Articles grid |
| `/news` | `app/(public)/news/page.tsx` | News listing — hero card + row items |
| `/news/[slug]` | `app/(public)/news/[slug]/page.tsx` | News post detail |
| `/articles` | `app/(public)/articles/page.tsx` | Articles listing — 2-col grid |
| `/articles/[slug]` | `app/(public)/articles/[slug]/page.tsx` | Article detail |
| `/events` | `app/(public)/events/page.tsx` | Events listing — row items |
| `/events/[slug]` | `app/(public)/events/[slug]/page.tsx` | Event detail |
| `/promos` | `app/(public)/promos/page.tsx` | Promos listing — 3-col grid |
| `/promos/[slug]` | `app/(public)/promos/[slug]/page.tsx` | Promo detail |

### Detail page data flow

Detail pages resolve slugs via `GET /posts?slug=<slug>&post_status=PUBLISHED` (returns
`PostListItem[]`), then fetch the full post via `GET /posts/{id}` to get `content` and
`post_metadata`. `PostDetail` component handles rendering for all four types.

### Navigation

All detail pages render a "← Back to [Section]" link above the content via `PostDetail`.
This is derived from `post.type` — no additional props required.

---

## Admin Pages (`/mod`)

All admin pages are Client Components using TanStack Query. Protected by `src/proxy.ts`
(Next.js middleware) — redirects to `/mod/login` if cookie is absent.

The mod layout provides: `TokenProvider` (JWT context), `ToastProvider`, `QueryProvider`,
and `ModSidebar`.

| Route | File | Description |
|---|---|---|
| `/mod` | `app/mod/page.tsx` | Redirect → `/mod/posts` |
| `/mod/login` | `app/mod/login/page.tsx` | Login form — email + password |
| `/mod/posts` | `app/mod/posts/page.tsx` | Posts table — all statuses, paginated |
| `/mod/posts/new` | `app/mod/posts/new/page.tsx` | Create post form |
| `/mod/posts/[id]` | `app/mod/posts/[id]/page.tsx` | Edit post + media attachment section |
| `/mod/tags` | `app/mod/tags/page.tsx` | Tag list + inline create + delete |
| `/mod/media` | `app/mod/media/page.tsx` | Media grid + upload + delete |

### Posts list

Fetches `GET /posts` without a status filter (all statuses). Paginated: 20 per page via
`limit` / `offset`. Actions per row: edit (link), Publish / Unpublish / Archive, Delete.
Delete uses `ConfirmDialog`. Status changes reflect immediately via query invalidation.

### Post edit page

Loads full post via `GET /posts/{id}` (includes `content`). Form fields: title, type,
tags (checkboxes), TipTap editor, metadata (JSON textarea, collapsed). Status actions
(Publish / Unpublish / Archive) are in the page header alongside the status badge and
slug. Media section below the form: upload & attach, delete with confirm.

### Breadcrumbs

Admin edit and new post pages render `Breadcrumbs` above the page title:
- New post: `Posts → New post`
- Edit post: `Posts → [post title]`

---

## API Route Handlers

| Route | Method | Description |
|---|---|---|
| `/api/auth/login` | POST | Exchange credentials → set HTTP-only cookie |
| `/api/auth/logout` | POST | Clear cookie (maxAge = 0) |

---

## TODO — Planned Page Variations

Per the layout consistency decision (uniform `max-w-7xl` container), visual differences
between post categories are deferred. Planned future work:

- **Events** — calendar view or date-grouped list layout
- **Promos** — dedicated promo card with promo code display, expiry date
- **Articles** — reading time estimate, author metadata (requires backend `post_metadata` fields)
- **News** — breaking news badge, priority/pinned posts
- **Detail pages** — type-specific sidebars or related content sections
