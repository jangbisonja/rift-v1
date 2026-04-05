import { z } from "zod";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const PostType = z.enum(["NEWS", "ARTICLE", "PROMO", "EVENT"]);
export type PostType = z.infer<typeof PostType>;

export const PostStatus = z.enum(["DRAFT", "PUBLISHED", "ARCHIVE"]);
export type PostStatus = z.infer<typeof PostStatus>;

// ─── Tag ──────────────────────────────────────────────────────────────────────

export const TagSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
});
export type Tag = z.infer<typeof TagSchema>;

export const TagCreateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
});
export type TagCreate = z.infer<typeof TagCreateSchema>;

// ─── Media ────────────────────────────────────────────────────────────────────
// MediaRead — used inside Post/PostListItem (id, path, original_name only)
// Media     — used by the standalone /media endpoint (includes post_id, created_at)

export const MediaReadSchema = z.object({
  id: z.string().uuid(),
  path: z.string(),
  original_name: z.string(),
});
export type MediaRead = z.infer<typeof MediaReadSchema>;

export const MediaSchema = z.object({
  id: z.string().uuid(),
  post_id: z.string().uuid().nullable(),
  path: z.string(),
  original_name: z.string(),
  created_at: z.string(),
});
export type Media = z.infer<typeof MediaSchema>;

// ─── Post list item — returned by GET /posts ──────────────────────────────────
// Matches backend PostList: no content, no post_metadata, no updated_at

export const PostListItemSchema = z.object({
  id: z.string().uuid(),
  type: PostType,
  status: PostStatus,
  title: z.string(),
  slug: z.string(),
  excerpt: z.string(),
  created_at: z.string(),
  published_at: z.string().nullable(),
  tags: z.array(TagSchema),
  media: z.array(MediaReadSchema),
  cover_media: MediaReadSchema.nullable(),
});
export type PostListItem = z.infer<typeof PostListItemSchema>;

// ─── Post full — returned by GET /posts/{id} ──────────────────────────────────
// Matches backend PostRead: includes content, post_metadata, updated_at

export const PostSchema = z.object({
  id: z.string().uuid(),
  type: PostType,
  status: PostStatus,
  title: z.string(),
  slug: z.string(),
  content: z.record(z.string(), z.unknown()),
  post_metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  published_at: z.string().nullable(),
  tags: z.array(TagSchema),
  media: z.array(MediaReadSchema),
  cover_media: MediaReadSchema.nullable(),
});
export type Post = z.infer<typeof PostSchema>;

// ─── Post write ───────────────────────────────────────────────────────────────

export const PostCreateSchema = z.object({
  type: PostType,
  title: z.string().min(1, "Title is required").max(256),
  content: z.record(z.string(), z.unknown()).default({ type: "doc", content: [] }),
  post_metadata: z.record(z.string(), z.unknown()).default({}),
  tag_ids: z.array(z.string().uuid()).default([]),
  cover_media_id: z.string().uuid().nullable().default(null),
});
export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = PostCreateSchema;
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginFormSchema = z.object({
  username: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;
