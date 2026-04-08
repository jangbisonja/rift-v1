import { z } from "zod";
import type { TipTapDoc } from "@/types/tiptap";

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
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  promo_code: z.string().nullable(),
  external_link: z.string().nullable(),
  redirect_to_external: z.boolean(),
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
  content: z.record(z.string(), z.unknown()) as unknown as z.ZodType<TipTapDoc>,
  post_metadata: z.record(z.string(), z.unknown()),
  created_at: z.string(),
  updated_at: z.string().nullable(),
  published_at: z.string().nullable(),
  tags: z.array(TagSchema),
  media: z.array(MediaReadSchema),
  cover_media: MediaReadSchema.nullable(),
  start_date: z.string().nullable(),
  end_date: z.string().nullable(),
  promo_code: z.string().nullable(),
  external_link: z.string().nullable(),
  redirect_to_external: z.boolean(),
});
export type Post = z.infer<typeof PostSchema>;

// ─── Post write ───────────────────────────────────────────────────────────────

export const PostCreateSchema = z.object({
  type: PostType,
  // PROMO posts have no title — allow empty; non-PROMO validated below
  title: z.string().max(256).default(""),
  content: (z.record(z.string(), z.unknown()) as unknown as z.ZodType<TipTapDoc>).default({ type: "doc", content: [] }),
  post_metadata: z.record(z.string(), z.unknown()).default({}),
  tag_ids: z.array(z.string().uuid()).default([]),
  cover_media_id: z.string().uuid().nullable().default(null),
  start_date: z.string().nullable().default(null),
  end_date: z.string().nullable().default(null),
  promo_code: z.string().nullable().default(null),
  external_link: z.string().nullable().default(null),
  redirect_to_external: z.boolean().default(false),
}).superRefine((data, ctx) => {
  // Title required for all types except PROMO
  if (data.type !== "PROMO" && !data.title) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Title is required",
      path: ["title"],
    });
  }

  // For EVENT and PROMO: end_date must be after start_date when both are set
  if (
    (data.type === "EVENT" || data.type === "PROMO") &&
    data.start_date &&
    data.end_date
  ) {
    const start = new Date(data.start_date);
    const end = new Date(data.end_date);
    if (end <= start) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End date must be after start date",
        path: ["end_date"],
      });
    }
  }
});
export type PostCreate = z.infer<typeof PostCreateSchema>;

export const PostUpdateSchema = PostCreateSchema.omit({ type: true });
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginFormSchema = z.object({
  username: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;
