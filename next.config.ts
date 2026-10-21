import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: {
    // Impor template arsitektur (.xlsx / .zip) lewat server action.
    serverActions: { bodySizeLimit: "12mb" },
    // Hanya ikon/komponen yang dipakai ikut terbundel (paket barrel besar).
    optimizePackageImports: ["@hugeicons/core-free-icons", "radix-ui"],
  },
};

export default nextConfig;
