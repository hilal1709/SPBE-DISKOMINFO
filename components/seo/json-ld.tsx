import { breadcrumbJsonLd } from "@/lib/seo";

/** Data terstruktur schema.org untuk mesin pencari. `<` di-escape agar isi tidak bisa menutup tag script. */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/** Remah roti halaman portal (path harus ada di `publicNav`). */
export const BreadcrumbJsonLd = ({ path }: { path: string }) => <JsonLd data={breadcrumbJsonLd(path)} />;
