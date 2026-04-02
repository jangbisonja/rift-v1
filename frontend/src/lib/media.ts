const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/** Returns the full URL for a media path (e.g. "uploads/2026/01/01/abc.webp") */
export function mediaUrl(path: string): string {
  return `${BASE}/${path}`;
}
