import type { MetadataRoute } from "next";

/** Manifest PWA; ikon dari kit logo "Gapura Lapisan" (docs/logo/). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arsitektur SPBE Kabupaten Gresik",
    short_name: "SPBE Gresik",
    start_url: "/",
    display: "standalone",
    background_color: "#2D2D2F",
    theme_color: "#2D2D2F",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
