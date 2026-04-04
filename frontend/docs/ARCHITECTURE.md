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

## TipTap Media Integration — Proposed Flow

### Current State

The editor supports image insertion via URL prompt only (`window.prompt("Image URL")`).
Images inserted this way are external URLs — they are not uploaded to the backend and
not tracked by the media system. This means:

- Images can become unavailable if the external URL changes.
- There is no association between editor images and the post's media attachments.
- The media section on the edit page is entirely separate from the editor.

### Proposed End-to-End Flow

```
User clicks "Upload Image" in TipTap toolbar
  → Hidden <input type="file"> triggered
  → POST /media/upload  → Media { id, path, original_name }
  → POST /media/{id}/attach/{post_id}
  → editor.chain().setImage({ src: mediaUrl(media.path) }).run()
  → Image appears in editor content at correct backend URL
```

```
User clicks "Pick from Media" in TipTap toolbar
  → MediaPickerModal opens (lists media attached to this post + all unattached)
  → User selects an image
  → If not yet attached: POST /media/{id}/attach/{post_id}
  → editor.chain().setImage({ src: mediaUrl(media.path) }).run()
```

### Required Changes

1. **`RichEditor` props** — add `postId: string` and `token: string` to enable
   server calls from within the toolbar.

2. **Toolbar buttons** — replace/augment the current URL-prompt Image button with:
   - "Upload Image" — file input trigger → upload → attach → insert
   - "Media Library" — opens `MediaPickerModal`

3. **`MediaPickerModal`** — new client component. Fetches `GET /media` (superuser),
   displays a thumbnail grid, returns selected `Media` object on confirm.

4. **Orphan handling** — If a user uploads an image and then discards the post without
   saving, the media record exists but is unattached (`post_id = null`). This is
   acceptable for MVP; orphans are visible and deletable in `/mod/media`. A future
   improvement would be to track all `src` URLs in the saved JSON and reconcile
   attachments on `PUT /posts/{id}`.

### Impact Analysis

| Area | Change required |
|---|---|
| `rich-editor.tsx` | New props (`postId`, `token`); new toolbar buttons; upload/attach logic |
| `post-form.tsx` | Must pass `postId` (undefined on create, post.id on edit) and `token` to `RichEditor` |
| `posts/new/page.tsx` | No post ID available at create time — upload+insert without attach; attach on first save |
| `posts/[id]/page.tsx` | Post ID available — full upload+attach+insert flow |
| New component | `MediaPickerModal` — thumbnail grid with confirm/cancel |
| Backend | No changes required — existing endpoints cover all operations |

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
