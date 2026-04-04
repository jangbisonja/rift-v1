/**
 * Renders TipTap JSON content as HTML — DOM-free, SSR-safe.
 *
 * TipTap v3's generateHTML requires document.createDocumentFragment and cannot
 * run in Node.js. This renderer traverses the TipTap JSON directly and produces
 * equivalent HTML without any browser dependency.
 *
 * Covers: StarterKit nodes (paragraph, heading, lists, blockquote, code, hr, br)
 *         and the Image extension.
 */

interface TipTapNode {
  type: string;
  text?: string;
  content?: TipTapNode[];
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  attrs?: Record<string, unknown>;
}

function esc(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function a(val: unknown): string {
  return esc(String(val ?? ""));
}

function children(node: TipTapNode): string {
  return (node.content ?? []).map(renderNode).join("");
}

function renderNode(node: TipTapNode): string {
  switch (node.type) {
    case "doc":
      return children(node);
    case "paragraph":
      return `<p>${children(node)}</p>`;
    case "heading": {
      const l = Number(node.attrs?.level ?? 1);
      return `<h${l}>${children(node)}</h${l}>`;
    }
    case "bulletList":
      return `<ul>${children(node)}</ul>`;
    case "orderedList":
      return `<ol>${children(node)}</ol>`;
    case "listItem":
      return `<li>${children(node)}</li>`;
    case "blockquote":
      return `<blockquote>${children(node)}</blockquote>`;
    case "codeBlock": {
      const lang = node.attrs?.language
        ? ` class="language-${a(node.attrs.language)}"`
        : "";
      return `<pre><code${lang}>${children(node)}</code></pre>`;
    }
    case "hardBreak":
      return "<br>";
    case "horizontalRule":
      return "<hr>";
    case "image": {
      const title = node.attrs?.title ? ` title="${a(node.attrs.title)}"` : "";
      return `<img src="${a(node.attrs?.src)}" alt="${a(node.attrs?.alt ?? "")}"${title}>`;
    }
    case "text":
      return renderText(node);
    default:
      return children(node);
  }
}

function renderText(node: TipTapNode): string {
  let out = esc(node.text ?? "");
  for (const mark of node.marks ?? []) {
    switch (mark.type) {
      case "bold":       out = `<strong>${out}</strong>`; break;
      case "italic":     out = `<em>${out}</em>`;         break;
      case "strike":     out = `<s>${out}</s>`;           break;
      case "underline":  out = `<u>${out}</u>`;           break;
      case "code":       out = `<code>${out}</code>`;     break;
      case "link":
        out = `<a href="${a(mark.attrs?.href)}" target="_blank" rel="noopener noreferrer">${out}</a>`;
        break;
    }
  }
  return out;
}

interface RichTextContentProps {
  content: Record<string, unknown>;
}

export function RichTextContent({ content }: RichTextContentProps) {
  let html = "";
  try {
    html = renderNode(content as unknown as TipTapNode);
  } catch {
    html = "";
  }

  return (
    <div
      className="prose prose-lg dark:prose-invert max-w-none"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
