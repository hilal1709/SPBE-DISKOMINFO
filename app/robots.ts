import type { MetadataRoute } from "next";
import { absoluteUrl } from "@/lib/site";

/** Hanya portal publik yang dirayapi; CMS, API, login, dan halaman wajib login dikecualikan. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/cms", "/api", "/login", "/design-system", "/keamanan", "/akun"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
