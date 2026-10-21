import type { Metadata } from "next";
import { publicNav } from "@/lib/navigation";
import { absoluteUrl, siteConfig } from "@/lib/site";

/** Halaman portal yang boleh diindeks mesin pencari (keamanan wajib login). */
export const indexablePages = publicNav.filter((item) => !item.locked);

const pageOf = (path: string) => {
  const item = publicNav.find((entry) => entry.href === path);
  if (!item) throw new Error(`Halaman portal ${path} tidak ada di publicNav.`);
  return item;
};

/** Gambar pratinjau tautan dari app/opengraph-image.tsx. */
const shareImage = { url: "/opengraph-image", width: 1200, height: 630, alt: siteConfig.name };

/** Metadata halaman portal dari `publicNav`: judul, deskripsi, URL kanonis, dan Open Graph. */
export function pageMetadata(path: string): Metadata {
  const { section, description = siteConfig.description, locked } = pageOf(path);
  // Beranda memakai judul lengkap situs, halaman lain "<section> · SPBE Gresik" lewat template root.
  const title = path === "/" ? { absolute: `${section} · ${siteConfig.name}` } : section;
  const shareTitle = path === "/" ? siteConfig.name : `${section} · ${siteConfig.shortName}`;
  // openGraph/twitter halaman menggantikan milik root seluruhnya, jadi gambar & identitas situs ditulis ulang.
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", locale: siteConfig.locale, siteName: siteConfig.name, title: shareTitle, description, url: path, images: [shareImage] },
    twitter: { card: "summary_large_image", title: shareTitle, description, images: [shareImage] },
    ...(locked && { robots: { index: false, follow: false } }),
  };
}

/** Halaman internal (CMS, login, design system) tidak muncul di hasil pencarian. */
export const noIndex: Metadata = { robots: { index: false, follow: false } };

type JsonLd = Record<string, unknown>;

/** Data terstruktur situs: instansi pemerintah dan situs web (schema.org). */
export function siteJsonLd(): JsonLd[] {
  const { organization: org } = siteConfig;
  const orgId = absoluteUrl("/#organisasi");
  return [
    {
      "@context": "https://schema.org",
      "@type": "GovernmentOrganization",
      "@id": orgId,
      name: org.name,
      parentOrganization: { "@type": "GovernmentOrganization", name: org.parent },
      url: absoluteUrl(),
      logo: absoluteUrl("/icon-512.png"),
      address: { "@type": "PostalAddress", addressLocality: org.address.locality, addressRegion: org.address.region, addressCountry: org.address.country },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: siteConfig.name,
      alternateName: siteConfig.shortName,
      description: siteConfig.description,
      url: absoluteUrl(),
      inLanguage: "id-ID",
      publisher: { "@id": orgId },
    },
  ];
}

/** Remah roti halaman portal untuk hasil pencarian. */
export function breadcrumbJsonLd(path: string): JsonLd {
  const crumbs = [{ name: siteConfig.shortName, path: "/" }, ...(path === "/" ? [] : [{ name: pageOf(path).section, path }])];
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({ "@type": "ListItem", position: index + 1, name: crumb.name, item: absoluteUrl(crumb.path) })),
  };
}
