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

import type { Post, PostListItem, PostCreate, PostUpdate, Tag, TagCreate, Media } from "@/lib/schemas";

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
