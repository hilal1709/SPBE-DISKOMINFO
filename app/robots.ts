import type { MetadataRoute } from "next";
import { absoluteUrl, indexable } from "@/lib/site";

/** Hanya portal publik yang dirayapi; CMS, API, login, dan halaman wajib login dikecualikan. */
export default function robots(): MetadataRoute.Robots {
  // Versi pengembangan/staging: larang seluruh situs (S4).
  if (!indexable) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cms", "/api", "/login", "/design-system", "/keamanan", "/akun"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
