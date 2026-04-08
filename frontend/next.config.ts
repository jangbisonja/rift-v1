import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// Extract hostname from NEXT_PUBLIC_API_URL for production remotePatterns.
// Falls back to "localhost" if the env var is unset or unparseable.
let apiHostname = "localhost";
try {
  apiHostname = new URL(
    process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"
  ).hostname;
} catch {
  // keep default
}

const nextConfig: NextConfig = {
  images: isDev
    ? {
        // In development, Next.js blocks optimization for private IPs (127.0.0.1 / localhost).
        // Backend already converts all uploads to WebP, so optimization adds no value here.
        unoptimized: true,
      }
    : {
        remotePatterns: [
          {
            protocol: "https",
            hostname: apiHostname,
            pathname: "/be/uploads/**",
          },
        ],
      },
  experimental: {
    // Disable client-side router cache for dynamic routes.
    // Without this, previously visited /mod/* pages are served from the browser's in-memory
    // cache after logout — the server (and proxy auth check) is never reached again.
    staleTimes: {
      dynamic: 0,
    },
  },
};

export default nextConfig;
