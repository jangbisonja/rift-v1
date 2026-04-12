/**
 * API client — single entry point for all backend calls.
 *
 * Server-side: pass the JWT via `token` option.
 * Client-side: relies on the browser sending the HTTP-only cookie automatically
 *   (cookie is set by /api/auth/login Route Handler).
 *
 * All errors are surfaced — no silent swallowing.
 *
 * IMPORTANT: Backend /posts uses query params `post_type` and `post_status`
 * (not `type`/`status`). Responses are plain arrays, not paginated objects.
 * Pagination is limit/offset, not page/size.
 */

import type { Post, PostListItem, PostCreate, PostUpdate, Tag, TagCreate, Media, PublicUser, Raid, RaidCreate, PaginatedRaids, RaidBoss, RaidBossCreate, PaginatedRaidBosses } from "@/lib/schemas";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface RequestOptions {
  /** JWT token string — pass on server side. On client the cookie is sent automatically. */
  token?: string;
  revalidate?: number | false;
}

export type ApiErrorDetail =
  | string
  | Array<{ loc: string[]; msg: string; type: string }>;

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public detail?: ApiErrorDetail,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  options: RequestOptions = {},
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  };

  if (options.token) {
    headers["Authorization"] = `Bearer ${options.token}`;
  }

  const fetchOptions: RequestInit & { next?: { revalidate?: number | false } } = {
    ...init,
    headers,
  };

  if (options.revalidate !== undefined) {
    fetchOptions.next = { revalidate: options.revalidate };
  }

  const res = await fetch(`${BASE_URL}${path}`, fetchOptions);

  if (!res.ok) {
    let detail: ApiErrorDetail | undefined;
    let message = `${res.status} ${res.statusText}`;
    try {
      const body = await res.json();
      if (body?.detail !== undefined) {
        detail = body.detail as ApiErrorDetail;
        message = typeof detail === "string" ? detail : message;
      }
    } catch {
      // non-JSON error body — keep default message
    }
    throw new ApiError(res.status, message, detail);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

export async function loginBackend(
  username: string,
  password: string,
): Promise<{ access_token: string; token_type: string }> {
  const body = new URLSearchParams({ username, password });
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) {
    let detail: ApiErrorDetail | undefined;
    let message = "Login failed";
    try {
      const body = await res.json();
      if (typeof body?.detail === "string") {
        detail = body.detail;
        message = body.detail;
      }
    } catch {
      // non-JSON body
    }
    throw new ApiError(res.status, message, detail);
  }
  return res.json();
}

// ─── Posts ────────────────────────────────────────────────────────────────────
// Response: Post[] (plain array). Params: post_type, post_status, slug, limit, offset.

export interface ListPostsParams {
  post_type?: string;
  post_status?: string;
  slug?: string;
  limit?: number;
  offset?: number;
  visibility?: "public" | "all";
}

export async function listPosts(
  params: ListPostsParams = {},
  options: RequestOptions = {},
): Promise<PostListItem[]> {
  const qs = new URLSearchParams();
  if (params.post_type) qs.set("post_type", params.post_type);
  if (params.post_status) qs.set("post_status", params.post_status);
  if (params.slug) qs.set("slug", params.slug);
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  if (params.visibility) qs.set("visibility", params.visibility);
  const query = qs.toString() ? `?${qs}` : "";
  return request<PostListItem[]>(`/posts${query}`, {}, options);
}

export async function getPost(id: string, options: RequestOptions = {}): Promise<Post> {
  return request<Post>(`/posts/${id}`, {}, options);
}

export async function createPost(data: PostCreate, token: string): Promise<Post> {
  return request<Post>("/posts", { method: "POST", body: JSON.stringify(data) }, { token });
}

export async function updatePost(id: string, data: PostUpdate, token: string): Promise<Post> {
  return request<Post>(`/posts/${id}`, { method: "PUT", body: JSON.stringify(data) }, { token });
}

export async function publishPost(id: string, token: string): Promise<Post> {
  return request<Post>(`/posts/${id}/publish`, { method: "PATCH" }, { token });
}

export async function unpublishPost(id: string, token: string): Promise<Post> {
  return request<Post>(`/posts/${id}/unpublish`, { method: "PATCH" }, { token });
}

export async function archivePost(id: string, token: string): Promise<Post> {
  return request<Post>(`/posts/${id}/archive`, { method: "PATCH" }, { token });
}

export async function deletePost(id: string, token: string): Promise<void> {
  return request<void>(`/posts/${id}`, { method: "DELETE" }, { token });
}

// ─── Tags ─────────────────────────────────────────────────────────────────────

export async function listTags(options: RequestOptions = {}): Promise<Tag[]> {
  return request<Tag[]>("/tags", {}, options);
}

export async function createTag(data: TagCreate, token: string): Promise<Tag> {
  return request<Tag>("/tags", { method: "POST", body: JSON.stringify(data) }, { token });
}

export async function deleteTag(id: string, token: string): Promise<void> {
  return request<void>(`/tags/${id}`, { method: "DELETE" }, { token });
}

// ─── Media ────────────────────────────────────────────────────────────────────
// Response: Media[] (plain array). Params: limit, offset.

export async function listMedia(
  params: { limit?: number; offset?: number } = {},
  token: string,
): Promise<Media[]> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return request<Media[]>(`/media${query}`, {}, { token });
}

export async function uploadMedia(file: File, token: string): Promise<Media> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE_URL}/media/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    let detail: ApiErrorDetail | undefined;
    let message = "Upload failed";
    try {
      const body = await res.json();
      if (body?.detail !== undefined) {
        detail = body.detail as ApiErrorDetail;
        message = typeof detail === "string" ? detail : message;
      }
    } catch {
      // non-JSON body
    }
    throw new ApiError(res.status, message, detail);
  }
  return res.json();
}

export async function attachMedia(mediaId: string, postId: string, token: string): Promise<Media> {
  return request<Media>(`/media/${mediaId}/attach/${postId}`, { method: "POST" }, { token });
}

export async function deleteMedia(id: string, token: string): Promise<void> {
  return request<void>(`/media/${id}`, { method: "DELETE" }, { token });
}

// ─── Timers ───────────────────────────────────────────────────────────────────

export interface TimerSchedule {
  /** 7-element boolean array. Index 0 = Monday, index 6 = Sunday (ISO 8601). */
  world_boss: boolean[];
  /** 7-element boolean array. Index 0 = Monday, index 6 = Sunday (ISO 8601). */
  rift: boolean[];
}

export async function getTimerSchedule(options: RequestOptions = {}): Promise<TimerSchedule> {
  return request<TimerSchedule>("/timers/schedule", {}, options);
}

export async function updateTimerSchedule(data: TimerSchedule, token: string): Promise<TimerSchedule> {
  return request<TimerSchedule>(
    "/timers/schedule",
    { method: "PUT", body: JSON.stringify(data) },
    { token },
  );
}

// ─── Raids ────────────────────────────────────────────────────────────────────

export async function listRaids(
  params: { limit?: number; offset?: number } = {},
  token?: string,
): Promise<PaginatedRaids> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return request<PaginatedRaids>(`/raids${query}`, {}, { token });
}

export async function createRaid(data: RaidCreate, token?: string): Promise<Raid> {
  return request<Raid>("/raids", { method: "POST", body: JSON.stringify(data) }, { token });
}

export async function getRaid(id: string, token?: string): Promise<Raid> {
  return request<Raid>(`/raids/${id}`, {}, { token });
}

export async function updateRaid(id: string, data: Partial<RaidCreate>, token?: string): Promise<Raid> {
  return request<Raid>(`/raids/${id}`, { method: "PUT", body: JSON.stringify(data) }, { token });
}

export async function deleteRaid(id: string, token?: string): Promise<void> {
  return request<void>(`/raids/${id}`, { method: "DELETE" }, { token });
}

export async function listRaidBosses(
  raidId: string,
  params: { limit?: number; offset?: number } = {},
  token?: string,
): Promise<PaginatedRaidBosses> {
  const qs = new URLSearchParams();
  if (params.limit != null) qs.set("limit", String(params.limit));
  if (params.offset != null) qs.set("offset", String(params.offset));
  const query = qs.toString() ? `?${qs}` : "";
  return request<PaginatedRaidBosses>(`/raids/${raidId}/bosses${query}`, {}, { token });
}

export async function createRaidBoss(raidId: string, data: RaidBossCreate, token?: string): Promise<RaidBoss> {
  return request<RaidBoss>(`/raids/${raidId}/bosses`, { method: "POST", body: JSON.stringify(data) }, { token });
}

export async function getRaidBoss(raidId: string, bossId: string, token?: string): Promise<RaidBoss> {
  return request<RaidBoss>(`/raids/${raidId}/bosses/${bossId}`, {}, { token });
}

export async function updateRaidBoss(raidId: string, bossId: string, data: Partial<RaidBossCreate>, token?: string): Promise<RaidBoss> {
  return request<RaidBoss>(`/raids/${raidId}/bosses/${bossId}`, { method: "PUT", body: JSON.stringify(data) }, { token });
}

export async function deleteRaidBoss(raidId: string, bossId: string, token?: string): Promise<void> {
  return request<void>(`/raids/${raidId}/bosses/${bossId}`, { method: "DELETE" }, { token });
}

// ─── Public User ──────────────────────────────────────────────────────────────

/**
 * GET /users/me — returns the current public user, or null on 401 (not logged in).
 * Never throws on 401; all other errors propagate normally.
 */
export async function getMe(): Promise<PublicUser | null> {
  try {
    return await request<PublicUser>("/users/me", { credentials: "include" });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) return null;
    throw err;
  }
}

/**
 * PATCH /users/me/nickname — set or update the current user's nickname.
 * Throws ApiError on validation/cooldown errors; caller handles error codes.
 */
export async function updateNickname(nickname: string): Promise<PublicUser> {
  return request<PublicUser>(
    "/users/me/nickname",
    { method: "PATCH", body: JSON.stringify({ nickname }), credentials: "include" },
  );
}

/**
 * DELETE /users/me — permanently deletes the current user account.
 * The backend cascades oauth_accounts and clears the user_token cookie.
 */
export async function deleteMe(): Promise<void> {
  await request<void>("/users/me", { method: "DELETE", credentials: "include" });
}

/**
 * POST /api/auth/discord/logout — clears user_token via Next.js route handler.
 * Never throws — best-effort, caller continues regardless.
 */
export async function logoutPublicUser(): Promise<void> {
  try {
    await fetch("/api/auth/discord/logout", { method: "POST" });
  } catch {
    // ignore — cookie will expire naturally
  }
}

/**
 * Returns the Discord OAuth2 authorize URL.
 * Navigating here starts the login flow (backend redirects to Discord).
 */
export function discordAuthorizeUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  return `${base}/auth/discord/authorize`;
}
