import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Locally, a custom folder avoids OneDrive file locks; hosts like Vercel expect the default.
  distDir: process.env.VERCEL ? ".next" : ".next-craftkiya",
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "*.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  experimental: {
    // Studio proof/catalog uploads and review photos are sent through Server Actions.
    // Studio uploads (several slideshow images at once), proofs and review photos go through Server Actions.
    serverActions: { bodySizeLimit: "30mb" },
    // /studio and /account requests pass through src/proxy.ts, which buffers bodies.
    proxyClientMaxBodySize: "30mb",
  },
  // Products were renamed to Single Face / Double Face / Family; keep old links working.
  async redirects() {
    return [
      // One canonical host for search engines: www → apex.
      { source: "/:path*", has: [{ type: "host", value: "www.craftkiya.com" }], destination: "https://craftkiya.com/:path*", permanent: true },
      { source: "/products/mini-string-art-keepsake", destination: "/products/single-face-string-art-portrait", permanent: true },
      { source: "/products/couple-string-art-portrait", destination: "/products/double-face-string-art-portrait", permanent: true },
      { source: "/products/custom-string-art-portrait", destination: "/products/family-string-art-portrait", permanent: true },
      // The pet portraits page was replaced by best-friend gifts.
      { source: "/gifts/pet-string-art-portrait", destination: "/gifts/best-friend-string-art-gift", permanent: true },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
