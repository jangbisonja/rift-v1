# Rift Frontend — TODO

## In Progress

_(nothing in progress)_

## Up Next

- [ ] **Admin panel** — `/mod`: posts CRUD, tags, media (Client Components + TanStack Query)

## Done

- [x] **Init Next.js 16** — TypeScript, Tailwind v4, App Router, src dir. Runs at localhost:3000. ✓
- [x] **Read Next.js 16 breaking changes** — async APIs, `proxy.ts`, Turbopack default. Documented in CLAUDE.md. ✓
- [x] **Install and configure shadcn/ui** — Tailwind v4, dark default, blue-purple primary (oklch), Nunito Sans, next-themes toggle. ✓
- [x] **Set up API client** — `src/lib/api/client.ts`. Two post types: `listPosts` → `PostListItem[]`, `getPost` → `Post`. ✓
- [x] **Set up Zod schemas** — `src/lib/schemas/index.ts`. Zod v4 quirks documented. ✓
- [x] **Auth flow** — login/logout Route Handlers, HTTP-only cookie, `proxy.ts` guards `/mod/*`. ✓
- [x] **TipTap editor** — `src/components/editor/rich-editor.tsx` — StarterKit + Image only. ✓
- [x] **Public pages MVP** — Homepage (News+Promos | Events | Articles), listing + detail pages for all 4 types. Cover images via `CoverImage` component + `mediaUrl()`. ✓
