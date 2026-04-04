# Frontend Architecture

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 — App Router |
| Language | TypeScript |
| Styling | Tailwind CSS v4 + shadcn/ui (base-ui primitives) |
| Editor | TipTap v3 (StarterKit + Image) |
| Forms | React Hook Form v7 + Zod v4 |
| Server state | TanStack Query v5 (admin only) |
| Auth | HTTP-only JWT cookie |
| Icons | lucide-react |

---

## Rendering Strategy

| Context | Mode | Data source |
|---|---|---|
| Public pages | Server Components (SSR) | Direct `client.ts` calls, `revalidate = 60` |
| Admin panel | Client Components | TanStack Query (useQuery / useMutation) |
| TipTap editor | Client Component | Browser only (`immediatelyRender: false`) |
| TipTap content display | Server Component | Custom DOM-free JSON→HTML renderer |

---

## Auth Flow

```
Browser → POST /api/auth/login (Next.js Route Handler)
        → POST /auth/login (FastAPI backend)
        ← access_token
        ← Set-Cookie: token=<jwt>; HttpOnly; SameSite=Lax
```

- Token stored as HTTP-only cookie; never in localStorage.
- `src/proxy.ts` (Next.js middleware) guards all `/mod/*` routes except `/mod/login`.
- Server Components read the cookie via `getServerToken()` (`src/lib/api/server.ts`).
- Client Components receive the token via React context: the mod layout (Server Component)
  reads the cookie and passes it to `<TokenProvider>`, which exposes `useToken()`.
- TanStack Query's `QueryCache` and `MutationCache` intercept 401 responses globally,
  call `/api/auth/logout` (clears the cookie), then redirect to `/mod/login`.

---

## Layout

```
RootLayout (Server)
├── Providers (Client) — next-themes ThemeProvider
├── Nav (Client) — logo, section links, theme toggle
└── <main>
    ├── (public)/ — public-facing pages (Server Components)
    │   └── PageContainer — standardized max-w-7xl wrapper
    └── mod/ — admin panel (Client Components)
        └── ModLayout (Server)
            ├── TokenProvider (Client)
            ├── ToastProvider (Client)
            ├── QueryProvider (Client) — TanStack QueryClient
            ├── ModSidebar (Client) — Posts / Tags / Media / Logout
            └── <page content>
```

### PageContainer

`src/components/page-container.tsx` — All public-facing pages use this for uniform
`max-w-7xl px-4 py-10` layout. Post detail pages use it as the outer container and
constrain only the article prose internally (`max-w-3xl mx-auto`).

---

## API Client

`src/lib/api/client.ts` — Single typed fetch wrapper for all backend calls.

- Public reads: called server-side from Server Components (no token needed).
- Admin reads/writes: called client-side via TanStack Query, with token from `useToken()`.
- Throws `ApiError(status, message)` on non-2xx responses.
- File uploads use raw `FormData` (no `Content-Type: application/json` header override).

---

## TipTap

### Editor (`src/components/editor/rich-editor.tsx`)

Client Component. Extensions: `StarterKit`, `Image` (URL-based). Always set
`immediatelyRender: false` to prevent SSR hydration errors.

Output format: TipTap JSON `{ "type": "doc", "content": [...] }` — stored as
`post.content` on the backend.

### Content Renderer (`src/components/rich-text-content.tsx`)

**DOM-free custom renderer** — does NOT use `generateHTML` from `@tiptap/core`.

**Why:** TipTap v3's `generateHTML` requires `document.createDocumentFragment` even
for pure HTML generation. This throws in Node.js (Server Components), causing the
content to be silently swallowed by the try/catch and rendered as empty HTML.

The custom renderer recursively traverses TipTap JSON and produces HTML string without
any DOM dependency. Supports all StarterKit node types + Image extension.

---

## TipTap Media Integration

### Implemented Flow

`RichEditor` accepts two optional props:
- `onUploadImage(file: File) → Promise<string>` — called when user uploads via toolbar; returns the URL to insert
- `mediaLibrary: MediaRead[]` — the post's currently attached media; shown in the picker modal

Upload/attach logic lives in the page, not the editor:
- **Edit page** (`posts/[id]/page.tsx`): upload → attach to post → `invalidateQueries(["post", id])` → return URL
- **Create page** (`posts/new/page.tsx`): upload only — no postId exists yet; the URL is captured in the TipTap JSON content; the media row is unattached until the user manually attaches it from the media section after post creation

`MediaPickerModal` (`src/components/mod/media-picker-modal.tsx`) shows the post's attached media as a grid. Selecting an image inserts its URL into the editor and closes the modal.

Toolbar buttons:
- `ImagePlus` (upload) — shown when `onUploadImage` prop provided
- `Images` (library picker) — shown when `mediaLibrary` prop provided; disabled (not hidden) when empty
- `Link2` (URL fallback) — shown when `onUploadImage` is NOT provided (backwards-compatible default)

### Orphan Handling

If a user uploads via the editor on the create page and then discards the post, the media row exists unattached (`post_id = null`). This is intentional for MVP — orphans are visible and deletable in `/mod/media`.

---

## Cover Image

Posts have a dedicated `cover_media: MediaRead | null` field (set via `cover_media_id` in
create/update requests). The frontend uses `post.cover_media` directly — there is no
`media[0]` convention. Cover is managed atomically in `PostForm` via a hidden
`cover_media_id` field.

---

## Notification System

`src/components/toast-provider.tsx` — React context + fixed-position toast stack.

- `useToast()` hook exposes `toast(message, variant?)`.
- Variants: `default`, `success` (green border), `error` (red border).
- Auto-dismiss after 3.5 seconds. Manual close button.
- Mounted in mod layout; available to all admin Client Components.
- Admin mutations use `toast("Saved.", "success")` / `toast("Failed…", "error")`.

---

## Known Constraints

- `NEXT_PUBLIC_API_URL` must be set to the backend's **publicly reachable** URL (not
  `localhost`) when frontend and backend run on a server. `localhost` in the browser
  resolves to the user's machine, not the server.
- Backend requires CORS headers allowing the frontend's origin for client-side requests
  (admin panel mutations). Public page fetches are server-to-server and not affected.
