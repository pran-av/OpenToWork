import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    // Add the qualities you want to allow here
    qualities: [75, 90],
    // Allow LinkedIn profile images
    remotePatterns: [
      {
        protocol: "https",
        hostname: "media.licdn.com",
        pathname: "/**",
      },
    ],
  },
  experimental: {
    // Persistent FS cache for `next build` (Turbopack). Speeds up repeat builds.
    // Stable for dev (on by default since 16.1); experimental for prod builds.
    turbopackFileSystemCacheForBuild: true,
  },
};

export default nextConfig;
