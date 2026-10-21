import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * CSP tanpa nonce agar halaman publik tetap statis/ter-cache CDN. 'unsafe-inline' pada script dibutuhkan
 * oleh payload RSC inline Next; sumber skrip eksternal tetap tertutup. Pusher hanya untuk sinyal realtime.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data:",
  "font-src 'self' data:",
  "connect-src 'self' wss://*.pusher.com https://*.pusher.com",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "manifest-src 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), browsing-topics=(), interest-cohort=()",
  },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  { key: "X-Permitted-Cross-Domain-Policies", value: "none" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Data CMS & ekspor tidak boleh disimpan cache bersama/peramban.
      { source: "/(cms|keamanan|api)/:path*", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
  experimental: {
    // Impor template arsitektur (.xlsx / .zip) lewat server action.
    serverActions: { bodySizeLimit: "12mb" },
    // Hanya ikon/komponen yang dipakai ikut terbundel (paket barrel besar).
    optimizePackageImports: ["@hugeicons/core-free-icons", "radix-ui"],
  },
};

export default nextConfig;
