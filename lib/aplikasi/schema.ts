import { z } from "zod";
import { securityFields } from "@/lib/data/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { isRaaLeaf } from "./reference";

const optionalText = z.string().trim().max(2000).optional().transform((v) => v || null);
const shortText = z.string().trim().max(200).optional().transform((v) => v || null);
const list = z.array(z.string().trim().min(1).max(300)).max(30).default([]);
const codes = (noun: string) => z.array(z.string().trim().min(1)).max(50, `Maksimal 50 ${noun}`).default([]);

/**
 * Isian aplikasi — kolom mengikuti template "Domain Arsitektur Aplikasi.xlsx".
 * Dibuat per versi RAA milik periode tujuan; dipakai server action, impor, dan seed.
 */
export function makeAplikasiInput(raa: RabIndex) {
  return z
    .object({
      /** Unit operasional teknologi (Perangkat Daerah pemilik isian). */
      opd: z.string().refine((v) => pdByCode.has(v), "Pilih unit operasional teknologi"),
      name: z.string().trim().min(2, "Nama aplikasi minimal 2 karakter").max(200),
      /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
      period: z.string().trim().min(4, "Pilih periode arsitektur"),
      uraian: z.string().trim().min(10, "Tuliskan uraian aplikasi (minimal 10 karakter)").max(2000),
      fungsi: z.string().trim().min(10, "Tuliskan fungsi utama aplikasi (minimal 10 karakter)").max(2000),
      luaran: z.string().trim().min(3, "Tuliskan luaran aplikasi").max(2000),
      /** Mesin basis data (notulen: bukan "nama basis data"), mis. PostgreSQL. */
      mesin: shortText,
      basis: z.enum(["web", "desktop", "mobile", "cloud"], { message: "Pilih basis aplikasi" }),
      lisensi: z.enum(["open_source", "proprietary"], { message: "Pilih tipe lisensi" }),
      bahasa: z.string().trim().min(1, "Isi bahasa pemrograman (atau “Tidak diketahui”)").max(100),
      kerangka: shortText,
      /** Unit pengembang: kode PD, atau nama K/L/penyedia. Kepemilikan diturunkan darinya. */
      pengembang: z.string().trim().min(2, "Isi unit pengembang").max(200),
      /** RAA Level 3, atau Level 2 yang tidak memiliki turunan. */
      raa: z
        .string()
        .refine((v) => isRaaLeaf(raa, v), "Pilih RAA")
        .refine((v) => raa.active(raa.byCode.get(v)), "RAA ini sudah tidak berlaku, pilih penggantinya"),
      raaL4: optionalText,
      raaL5: optionalText,
      /** Kode proses bisnis terkait (periode sama, wajib disetujui) — aplikasi wajib selaras probis (notulen). */
      probis: z.array(z.string().trim().min(1)).min(1, "Pilih minimal satu proses bisnis yang sudah disetujui").max(50, "Maksimal 50 proses bisnis"),
      /** Kode layanan yang didukung dan data yang digunakan (periode sama). */
      layanan: codes("layanan"),
      data: codes("data"),
      inputData: optionalText,
      outputData: optionalText,
      supplier: optionalText,
      customer: optionalText,
      cloud: shortText,
      server: shortText,
      splp: shortText,
      jip: shortText,
      security: z.object(Object.fromEntries(securityFields.map((f) => [f.key, list])) as Record<(typeof securityFields)[number]["key"], typeof list>).partial().default({}),
    })
    .superRefine((v, ctx) => {
      // L4/L5: kode terdaftar harus turunan induknya; teks bebas hanya boleh selama referensi di bawah induk belum ada.
      const check = (value: string | null, parent: string | null, path: "raaL4" | "raaL5", level: number) => {
        if (!value) return;
        const known = raa.byCode.get(value);
        if ((known && known.parent !== parent) || (!known && raa.children(parent ?? "").length)) {
          ctx.addIssue({ code: "custom", path: [path], message: `Pilih RAA Level ${level} di bawah ${parent || "level di atasnya"}` });
        }
      };
      check(v.raaL4, v.raa, "raaL4", 4);
      check(v.raaL5, raa.byCode.get(v.raaL4 ?? "")?.level === 4 ? v.raaL4 : null, "raaL5", 5);
    });
}

export type AplikasiInput = z.input<ReturnType<typeof makeAplikasiInput>>;
export type AplikasiValues = z.output<ReturnType<typeof makeAplikasiInput>>;
