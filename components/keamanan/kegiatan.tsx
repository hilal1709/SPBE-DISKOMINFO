import { kegiatanConfig } from "@/lib/keamanan/jenis";
import type { KegiatanKeamanan } from "@/lib/types";

/** Bagian detail kegiatan keamanan yang dipakai CMS dan dashboard publik. */

const dateFmt = new Intl.DateTimeFormat("id-ID", { dateStyle: "long" });

/** "2025-03-12" → "12 Maret 2025"; kosong → "—". */
export const tanggalText = (value: string | null | undefined) => (value ? dateFmt.format(new Date(`${value}T00:00:00`)) : "—");

/** Kolom khusus kegiatan yang terisi (urutan template); tanggal & nilai kematangan diformat. */
export function kegiatanEntries(r: Pick<KegiatanKeamanan, "jenis" | "atribut">) {
  return kegiatanConfig[r.jenis].attrs
    .filter((a) => r.atribut[a.key])
    .map((a) => ({
      label: a.label,
      value: a.type === "date" ? tanggalText(r.atribut[a.key]) : a.type === "score" ? `${r.atribut[a.key]!.replace(".", ",")} dari 5` : r.atribut[a.key]!,
      wide: a.type === "textarea",
    }));
}
