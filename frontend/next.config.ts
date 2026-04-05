import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Backend already converts all uploads to WebP — no need for Next.js re-optimization.
    // Also avoids the "resolved to private ip" error when fetching from localhost in dev.
    unoptimized: true,
  },
  // Disable client-side router cache for dynamic routes.
  // Without this, previously visited /mod/* pages are served from the browser's in-memory
  // cache after logout — the server (and proxy auth check) is never reached again.
  staleTimes: {
    dynamic: 0,
  },
};

export default nextConfig;
