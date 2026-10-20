import { z } from "zod";
import { pdByCode } from "@/lib/probis/reference";
import { kegiatanConfig, kegiatanKeys } from "./jenis";

const date = /^\d{4}-\d{2}-\d{2}$/;

/** Isian kegiatan keamanan — kolom bersama 7 template "Domain Arsitektur Keamanan" dan kolom khusus per kegiatan. */
export const keamananInput = z
  .object({
    /** Instansi pelaksana (Perangkat Daerah pemilik isian). */
    opd: z.string().refine((v) => pdByCode.has(v), "Pilih instansi pelaksana"),
    jenis: z.enum(kegiatanKeys, { message: "Pilih jenis kegiatan keamanan" }),
    name: z.string().trim().min(3, "Nama kegiatan minimal 3 karakter").max(250),
    /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
    period: z.string().trim().min(4, "Pilih periode arsitektur"),
    deskripsi: z.string().trim().max(2000).optional().transform((v) => v || null),
    tanggal: z
      .string()
      .trim()
      .optional()
      .transform((v) => v || null)
      .refine((v) => !v || date.test(v), "Tanggal harus berformat YYYY-MM-DD"),
    atribut: z.record(z.string(), z.string().trim().max(2000)).default({}),
  })
  .superRefine((v, ctx) => {
    for (const a of kegiatanConfig[v.jenis].attrs) {
      const value = v.atribut[a.key];
      if (!value) continue;
      if (a.type === "date" && !date.test(value)) ctx.addIssue({ code: "custom", path: ["atribut"], message: `${a.label} harus berformat YYYY-MM-DD` });
      if (a.type === "score" && !(Number(value.replace(",", ".")) >= 0 && Number(value.replace(",", ".")) <= 5)) ctx.addIssue({ code: "custom", path: ["atribut"], message: `${a.label} harus angka 0–5` });
      if (a.type === "date" && a.key === "akhir" && v.tanggal && value < v.tanggal) ctx.addIssue({ code: "custom", path: ["atribut"], message: "Tanggal akhir tidak boleh sebelum tanggal mulai" });
    }
  })
  .transform((v) => {
    // Kolom khusus: hanya kunci milik kegiatan ini; isian kosong dibuang, nilai kematangan dinormalkan.
    const attrs = new Map(kegiatanConfig[v.jenis].attrs.map((a) => [a.key, a]));
    const atribut = Object.fromEntries(
      Object.entries(v.atribut)
        .filter(([k, value]) => attrs.has(k) && value)
        .map(([k, value]) => [k, attrs.get(k)!.type === "score" ? String(Number(value.replace(",", "."))) : value]),
    );
    return { ...v, atribut };
  });

export type KeamananInput = z.input<typeof keamananInput>;
export type KeamananValues = z.output<typeof keamananInput>;
