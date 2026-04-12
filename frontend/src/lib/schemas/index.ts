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

// Base object — no refinements. Used for .omit() (Zod v4: .omit() cannot be
// called on a schema that has .superRefine()/.refine() applied).
const PostCreateBaseSchema = z.object({
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
});

export const PostCreateSchema = PostCreateBaseSchema.superRefine((data, ctx) => {
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

// .omit() called on the base schema (before refinements) — required by Zod v4.
// PostUpdateSchema is the API payload type only; form validation still uses PostCreateSchema.
export const PostUpdateSchema = PostCreateBaseSchema.omit({ type: true });
export type PostUpdate = z.infer<typeof PostUpdateSchema>;

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const LoginFormSchema = z.object({
  username: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});
export type LoginForm = z.infer<typeof LoginFormSchema>;

// ─── Public User ──────────────────────────────────────────────────────────────

export const UserBadgeSchema = z.enum(["VERIFIED", "FOUNDER"]);
export type UserBadge = z.infer<typeof UserBadgeSchema>;

export const NicknameScriptSchema = z.enum(["CYRILLIC", "LATIN"]);
export type NicknameScript = z.infer<typeof NicknameScriptSchema>;

export const PublicUserSchema = z.object({
  id: z.string(),
  display_id: z.number(),
  discord_id: z.string(),
  discord_username: z.string(),
  nickname: z.string().nullable(),
  nickname_script: NicknameScriptSchema.nullable(),
  nickname_color: z.string().nullable(),
  badge: UserBadgeSchema.nullable(),
  nickname_changed_at: z.string().nullable(),
  created_at: z.string(),
});
export type PublicUser = z.infer<typeof PublicUserSchema>;

// ─── Raids ────────────────────────────────────────────────────────────────────

export const RaidDifficultyEnum = z.enum(["NORMAL", "HARD", "TFM", "NIGHTMARE"]);
export type RaidDifficulty = z.infer<typeof RaidDifficultyEnum>;

export const RaidSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  min_gear_score: z.number().int(),
  difficulty: RaidDifficultyEnum,
  groups_count: z.number().int(),
  phases_count: z.number().int(),
  cover_media: MediaReadSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type Raid = z.infer<typeof RaidSchema>;

export const RaidBossSchema = z.object({
  id: z.string().uuid(),
  raid_id: z.string().uuid(),
  name: z.string(),
  phase_number: z.number().int(),
  icon_media: MediaReadSchema.nullable(),
  created_at: z.string(),
  updated_at: z.string(),
});
export type RaidBoss = z.infer<typeof RaidBossSchema>;

export const PaginatedRaidsSchema = z.object({
  items: z.array(RaidSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type PaginatedRaids = z.infer<typeof PaginatedRaidsSchema>;

export const PaginatedRaidBossesSchema = z.object({
  items: z.array(RaidBossSchema),
  total: z.number().int(),
  limit: z.number().int(),
  offset: z.number().int(),
});
export type PaginatedRaidBosses = z.infer<typeof PaginatedRaidBossesSchema>;

export type RaidCreate = {
  name: string;
  min_gear_score: number;
  difficulty: "NORMAL" | "HARD" | "TFM" | "NIGHTMARE";
  groups_count: number;
  phases_count: number;
  cover_media_id?: string | null;
};

export type RaidBossCreate = {
  name: string;
  phase_number: number;
  icon_media_id?: string | null;
};

// ─── Nickname form ─────────────────────────────────────────────────────────────

export const NicknameSchema = z.object({
  nickname: z
    .string()
    .min(3, "От 3 до 24 символов")
    .max(24, "От 3 до 24 символов")
    .refine(
      (val) => {
        const hasCyr = /[а-яёА-ЯЁ]/i.test(val);
        const hasLat = /[a-zA-Z]/.test(val);
        if (hasCyr && hasLat) return false; // mixed alphabets
        if (hasCyr) return /^[а-яёА-ЯЁ0-9]+$/i.test(val);
        if (hasLat) return /^[a-zA-Z0-9]+$/.test(val);
        return false; // all digits or symbols — no letter
      },
      "Только кириллица или только латиница (цифры разрешены)",
    ),
});
export type NicknameFormValues = z.infer<typeof NicknameSchema>;
