# Rift Frontend — TODO

## In Progress

_(nothing in progress)_

## Up Next

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
