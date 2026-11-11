import type { Column } from "@/components/blocks/data-table";
import { securityFields } from "@/lib/data/reference";

/** Sel tabel CMS untuk kolom templat spreadsheet arsitektur (teks panjang, tautan, dan dependensi keamanan). */

export const clamp = (text: string | null | undefined) => <span className="line-clamp-2 text-muted-foreground">{text || "—"}</span>;

/** Isian multibaris (kode/nama dipisah baris) menjadi satu baris ringkas. */
export const lines = (text: string | null | undefined) => clamp(text?.split("\n").filter(Boolean).join(", "));

export const links = (items: { id: string; name: string }[]) =>
  items.length ? <span className="line-clamp-2 text-muted-foreground" title={items.map((i) => `${i.id} ${i.name}`).join("\n")}>{items.map((i) => i.name).join(", ")}</span> : "—";

/** Tujuh kolom dependensi Keamanan SPBE, urut sesuai `order` templat domain. */
export function securityColumns<T extends { security: Partial<Record<string, string[]>> }>(order: readonly string[] = securityFields.map((f) => f.key)): Column<T>[] {
  return order.map((key) => ({
    header: securityFields.find((f) => f.key === key)!.label.replace(" Keamanan SPBE", "").replace(" SPBE", ""),
    hideable: true,
    defaultHidden: true,
    sortValue: (r: T) => r.security[key]?.length ?? 0,
    cell: (r: T) => lines(r.security[key]?.join("\n")),
  }));
}
