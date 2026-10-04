import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Impor template arsitektur (.xlsx / .zip) lewat server action.
    serverActions: { bodySizeLimit: "12mb" },
  },
};

export default nextConfig;
