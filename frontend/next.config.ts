import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Backend already converts all uploads to WebP — no need for Next.js re-optimization.
    // Also avoids the "resolved to private ip" error when fetching from localhost in dev.
    unoptimized: true,
  },
};

export default nextConfig;
