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

- [ ] **TipTap media integration** — Upload local files + pick from media library in editor toolbar. Full flow in `docs/ARCHITECTURE.md`.
- [ ] **Per-category page variations** — Events: date-grouped; Promos: promo code display; Articles: reading time; News: pinned posts. Container already uniform.

## Done

- [x] **Init Next.js 16** — TypeScript, Tailwind v4, App Router, src dir. Runs at localhost:3000. ✓
- [x] **Read Next.js 16 breaking changes** — async APIs, `proxy.ts`, Turbopack default. Documented in CLAUDE.md. ✓
- [x] **Install and configure shadcn/ui** — Tailwind v4, dark default, blue-purple primary (oklch), Nunito Sans, next-themes toggle. ✓
- [x] **Set up API client** — `src/lib/api/client.ts`. Two post types: `listPosts` → `PostListItem[]`, `getPost` → `Post`. ✓
- [x] **Set up Zod schemas** — `src/lib/schemas/index.ts`. Zod v4 quirks documented. ✓
- [x] **Auth flow** — login/logout Route Handlers, HTTP-only cookie, `proxy.ts` guards `/mod/*`. ✓
- [x] **TipTap editor** — `src/components/editor/rich-editor.tsx` — StarterKit + Image only. ✓
- [x] **Public pages MVP** — Homepage (News+Promos | Events | Articles), listing + detail pages for all 4 types. Cover images via `CoverImage` component + `mediaUrl()`. ✓
- [x] **Admin panel** — `/mod`: login, posts list+create+edit, tags, media. Token passed server→client via React Context. TanStack Query for all data/mutations. ✓
