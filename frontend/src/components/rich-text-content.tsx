/**
 * Renders TipTap JSON content as HTML on the server.
 * Headless — no editor loaded, just the generated HTML.
 *
 * Uses the @tiptap/html package to convert JSON → HTML string server-side.
 * Falls back to empty string if content is malformed.
 */
import { generateHTML } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";

interface RichTextContentProps {
  content: Record<string, unknown>;
}

export function RichTextContent({ content }: RichTextContentProps) {
  let html = "";
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    html = generateHTML(content as any, [StarterKit, Image]);
  } catch {
    html = "";
  }

  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none"
      // Content is generated from our own TipTap JSON — safe to render
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
