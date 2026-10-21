/** Identitas situs: satu sumber untuk metadata, manifest, sitemap, Open Graph, dan data terstruktur. */
export const siteConfig = {
  name: "Arsitektur SPBE Kabupaten Gresik",
  shortName: "SPBE Gresik",
  tagline: "Arsitektur SPBE Kabupaten Gresik 2025–2029",
  description:
    "Portal resmi Arsitektur Sistem Pemerintahan Berbasis Elektronik (SPBE) Kabupaten Gresik: proses bisnis, layanan, data, aplikasi, infrastruktur, dan peta rencana SPBE 2025–2029.",
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, ""),
  locale: "id_ID",
  keywords: [
    "SPBE Gresik", "Arsitektur SPBE", "Sistem Pemerintahan Berbasis Elektronik", "Kabupaten Gresik",
    "Diskominfo Gresik", "e-government Gresik", "proses bisnis pemerintah", "layanan publik digital", "peta rencana SPBE",
  ],
  organization: {
    name: "Dinas Komunikasi dan Informatika Kabupaten Gresik",
    parent: "Pemerintah Kabupaten Gresik",
    address: { locality: "Gresik", region: "Jawa Timur", country: "ID" },
  },
  /** Sama dengan token `--brand-charcoal` di app/globals.css (metadata dan manifest tidak bisa membaca CSS). */
  themeColor: "#2D2D2F",
} as const;

export const absoluteUrl = (path = "/") => `${siteConfig.url}${path}`;
