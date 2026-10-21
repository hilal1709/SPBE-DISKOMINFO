import type { MetadataRoute } from "next";
import { indexablePages } from "@/lib/seo";
import { absoluteUrl } from "@/lib/site";

/** Peta situs portal publik; data dashboard diperbarui harian lewat CMS. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return indexablePages.map(({ href }) => ({
    url: absoluteUrl(href),
    lastModified,
    changeFrequency: "daily",
    priority: href === "/" ? 1 : 0.8,
  }));
}
