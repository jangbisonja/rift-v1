# Rift Frontend — TODO

## In Progress

_(nothing in progress)_

## Up Next

- [ ] **Admin panel** — `/mod`: posts CRUD, tags, media (Client Components + TanStack Query)

## Done

- [x] **Init Next.js 16** — scaffolded with TypeScript, Tailwind, App Router, src dir. Runs at localhost:3000. ✓
- [x] **Read Next.js 16 breaking changes** — key changes: async APIs (`cookies`, `headers`, `params`), `middleware.ts` → `proxy.ts`, Turbopack default. Documented in CLAUDE.md. ✓
- [x] **Install and configure shadcn/ui** — Tailwind v4 mode, dark theme default, blue-purple primary (violet oklch), Nunito Sans font, `next-themes` toggle in header. ✓
- [x] **Set up API client** — `src/lib/api/client.ts`, typed against full backend contract. Server-side uses explicit token; client-side uses cookie. ✓
- [x] **Set up Zod schemas** — `src/lib/schemas/index.ts`, mirrors backend Pydantic models. Note: Zod v4 (installed by shadcn) — `z.record()` needs 2 args, `.datetime()` removed. ✓
- [x] **Auth flow** — `src/app/api/auth/login/route.ts` + `logout/route.ts` (HTTP-only cookie), `src/proxy.ts` protects `/mod/*`. ✓
- [x] **TipTap editor** — `src/components/editor/rich-editor.tsx` — StarterKit + Image only. ✓
- [x] **Public pages** — homepage (4 sections), `/news` listing, `/news/[slug]` detail, `/articles`, `/promos`, `/events` placeholders. Server Components + 60s revalidation. ✓
