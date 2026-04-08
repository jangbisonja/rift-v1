## Technical Debt

Items identified but deferred. Revisit when the noted trigger is met.

### Field-level error surfacing in admin forms
`ApiError.detail` is now typed as `string | Array<{loc: string[], msg: string, type: string}>`.
The infrastructure is in place in `src/lib/api/client.ts`. However, no admin form has been
updated to use it — `post-form.tsx` and other forms show all errors as generic toasts/messages
instead of calling `form.setError("fieldName", { message })` for field-level FastAPI validation errors.

**Pattern to implement (per Section 8 of the Module Addition & UI Extension Protocol in CLAUDE.md):**
```ts
} catch (err) {
  if (err instanceof ApiError && Array.isArray(err.detail)) {
    for (const item of err.detail) {
      const field = item.loc.at(-1) as string;
      form.setError(field, { message: item.msg });
    }
  }
}
```
**Trigger:** When a second admin is added, or when form validation UX becomes a complaint.

### `listPosts` query param DRY
`src/lib/api/client.ts` builds query strings with manual `if (params.x) qs.set(...)` chains.
At 6 params it is borderline; at 10+ it becomes maintenance debt. A typed `toQueryString()`
utility that iterates defined params and skips `undefined` values would centralise this.

**Trigger:** When `listPosts` grows beyond 8 query parameters, or when a second list endpoint
with similar params is added.

---

# Rift Frontend — TODO

## In Progress

_(nothing in progress)_

## Recently Completed

- [x] **PromoItem unified layout — remove `compact` prop** — Collapsed both layout branches into one. Single `<article className="flex flex-col gap-2 border bg-card p-3">` with centered promo code (three-column flex spacer) + right-aligned copy button (Row 1), and start date left / DaysLabel right (Row 2). Copy confirmation changed from text span to `<Check size={14} className="text-green-500" />`. `compact` prop removed from component and homepage call site. ✓

## Up Next

- [x] **Border radius = 0 (site-wide)** — `--radius: 0rem` in `:root`; all `rounded-*` classes removed from public components (`post-hero`, `post-row-item`, `promo-item`, `post-detail`). Admin components untouched. Type scale documented in `globals.css`. ✓
- [x] **Public breadcrumb component** — `src/components/breadcrumb-nav.tsx`; added to all 4 archive pages (news/articles/events/promos) and replaced back-arrow link in `post-detail.tsx` with full `Home / Category / Title` trail. ✓
- [x] **News archive: uniform cards (no hero)** — Removed `PostHero` from `news/page.tsx`; all posts now rendered as `PostRowItem`. `PostHero` import removed. ✓
- [x] **Typography audit** — All public pages/components confirmed consistent: `text-3xl font-bold` (page h1), `text-2xl font-bold` (section h2), `text-xl font-bold` (hero card), `text-sm font-semibold` (row card), `text-4xl font-bold` (detail h1). Type scale comment added to `globals.css`. ✓

## Previously Completed

- [x] **Pagination** — posts list: prev/next with limit/offset, Next disabled when fewer than PAGE_SIZE results. ✓
- [x] **Admin loading skeletons & error states** — skeleton rows/cards on posts, tags, media, edit page; retry buttons on error. ✓
- [x] **Confirm dialog** — `ConfirmDialog` component replaces `window.confirm` on all destructive actions. ✓
- [x] **Slug display on edit page** — read-only mono slug below the title. ✓
- [x] **TipTap content rendering** — fixed: `generateHTML` (DOM-dependent) replaced with custom SSR-safe JSON→HTML renderer. ✓
- [x] **Hero image size** — reduced from `aspect-[16/9]` to `aspect-[3/1]`. ✓
- [x] **Layout consistency** — `PageContainer` component centralizes `max-w-7xl` layout; applied to all public pages and detail view. ✓

## Upcoming

- [x] **TipTap media integration** — Upload local files + pick from media library in editor toolbar. ✓
- [x] **News cards — excerpt display on hero and row items** — `excerpt` added to `PostListItemSchema`; rendered below title+date in `PostHero` and `PostRowItem` with `…` suffix; empty string suppressed. ✓
- [x] **Typed promo fields** — `start_date`, `end_date`, `promo_code` added to `PostListItemSchema` and `PostSchema`; `listPosts()` accepts `visibility` param; `promo-item.tsx` redesigned with copy-to-clipboard, days-remaining logic, and "Промокоды" label rename. ✓
- [x] **Post detail container** — Removed inner `max-w-3xl mx-auto` prose constraint; content now spans full `PageContainer` width. Cover image set to `h-[300px]` fixed height, center-cropped via `object-cover object-center`. ✓
- [x] **Excerpt ellipsis rendering fix** — `\u2026` in JSX text nodes was rendering as literal backslash-u characters (JSX text does not process JS escape sequences). Replaced with the actual `…` character (U+2026) in `post-hero.tsx` and `post-row-item.tsx`. ✓
- [x] **Router cache / auth persistence fix** — Added `staleTimes: { dynamic: 0 }` to `next.config.ts`. Without this, previously visited `/mod/*` pages were served from the browser's in-memory router cache after logout, bypassing the proxy auth check. ✓
- [x] **Post form — conditional field visibility by type** — Type selector moved to top; `useWatch` drives per-type field matrix (Title/Cover/Tags/Content/Dates/PromoCode/Metadata); `start_date`, `end_date`, `promo_code` added to `PostCreateSchema`. ✓
- [x] **EVENT external_link input** — Raw Metadata JSON `<details>` block removed; replaced with a labeled URL input for EVENT that reads/writes `post_metadata.external_link`; key omitted when empty. ✓

## Done

- [x] **Russian localization — public UI and date formatting** — nav labels, section headings, empty states, back-link labels, post type badges all in Russian; `formatDate()` utility in `src/lib/date.ts` (`ru-RU`, `Europe/Moscow`) used by all public date displays. ✓

- [x] **Init Next.js 16** — TypeScript, Tailwind v4, App Router, src dir. Runs at localhost:3000. ✓
- [x] **Read Next.js 16 breaking changes** — async APIs, `proxy.ts`, Turbopack default. Documented in CLAUDE.md. ✓
- [x] **Install and configure shadcn/ui** — Tailwind v4, dark default, blue-purple primary (oklch), Nunito Sans, next-themes toggle. ✓
- [x] **Set up API client** — `src/lib/api/client.ts`. Two post types: `listPosts` → `PostListItem[]`, `getPost` → `Post`. ✓
- [x] **Set up Zod schemas** — `src/lib/schemas/index.ts`. Zod v4 quirks documented. ✓
- [x] **Auth flow** — login/logout Route Handlers, HTTP-only cookie, `proxy.ts` guards `/mod/*`. ✓
- [x] **TipTap editor** — `src/components/editor/rich-editor.tsx` — StarterKit + Image only. ✓
- [x] **Public pages MVP** — Homepage (News+Promos | Events | Articles), listing + detail pages for all 4 types. Cover images via `CoverImage` component + `mediaUrl()`. ✓
- [x] **Admin panel** — `/mod`: login, posts list+create+edit, tags, media. Token passed server→client via React Context. TanStack Query for all data/mutations. ✓
