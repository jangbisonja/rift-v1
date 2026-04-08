/**
 * TypeScript types for TipTap JSON document structure.
 * Matches the TipTap StarterKit + Image extension output format.
 * The backend stores this as JSONB; the frontend receives it on Post.content.
 */

export interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

export interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  marks?: TipTapMark[];
  attrs?: Record<string, unknown>;
}

export interface TipTapDoc {
  type: "doc";
  content: TipTapNode[];
}
