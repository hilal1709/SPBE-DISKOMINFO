import { z } from "zod";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { isRadLeaf, securityFields, validitasOptions } from "./reference";

const optionalText = z.string().trim().max(2000).optional().transform((v) => v || null);
const list = z.array(z.string().trim().min(1).max(300)).max(30).default([]);

/**
 * Isian data — kolom mengikuti template "Domain Arsitektur Data dan Informasi.xlsx".
 * Dibuat per versi RAD milik periode tujuan; dipakai server action, impor, dan seed.
 */
export function makeDataInput(rad: RabIndex) {
  return z
    .object({
      /** Wali data (Penanggung Jawab Data). */
      opd: z.string().refine((v) => pdByCode.has(v), "Pilih Perangkat Daerah wali data"),
      name: z.string().trim().min(3, "Nama data minimal 3 karakter").max(200),
      /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
      period: z.string().trim().min(4, "Pilih periode arsitektur"),
      uraian: z.string().trim().min(10, "Tuliskan uraian data (minimal 10 karakter)").max(2000),
      tujuan: z.string().trim().min(10, "Tuliskan tujuan data (minimal 10 karakter)").max(2000),
      /** Produsen data: kode PD, atau nama instansi lain. */
      produsen: optionalText,
      output: optionalText,
      input: optionalText,
      sifat: z.enum(["terbuka", "terbatas", "tertutup"], { message: "Pilih sifat data" }),
      jenis: z.enum(["statistik", "geopasial", "keuangan", "lainnya"], { message: "Pilih jenis data" }),
      validitas: z.enum(validitasOptions as [string, ...string[]], { message: "Pilih validitas data" }),
      interoperabel: z.boolean({ message: "Pilih interoperabilitas" }),
      /** RAD Level 3, atau Level 2 yang tidak memiliki turunan. */
      rad: z
        .string()
        .refine((v) => isRadLeaf(rad, v), "Pilih RAD Level 3")
        .refine((v) => rad.active(rad.byCode.get(v)), "RAD ini sudah tidak berlaku, pilih penggantinya"),
      radL4: optionalText,
      radL5: optionalText,
      /** Kode proses bisnis penghasil data (periode yang sama) — probis adalah master. */
      probis: z.array(z.string().trim().min(1)).min(1, "Pilih minimal satu proses bisnis").max(30, "Maksimal 30 proses bisnis"),
      /** Kode layanan pengguna data (periode yang sama). */
      layanan: z.array(z.string().trim().min(1)).max(30, "Maksimal 30 layanan").default([]),
      security: z.object(Object.fromEntries(securityFields.map((f) => [f.key, list])) as Record<(typeof securityFields)[number]["key"], typeof list>).partial().default({}),
    })
    .superRefine((v, ctx) => {
      // L4/L5: kode terdaftar harus turunan induknya; teks bebas hanya boleh selama referensi di bawah induk belum ada.
      const check = (value: string | null, parent: string | null, path: "radL4" | "radL5", level: number) => {
        if (!value) return;
        const known = rad.byCode.get(value);
        if ((known && known.parent !== parent) || (!known && rad.children(parent).length)) {
          ctx.addIssue({ code: "custom", path: [path], message: `Pilih RAD Level ${level} di bawah ${parent || "level di atasnya"}` });
        }
      };
      check(v.radL4, v.rad, "radL4", 4);
      check(v.radL5, rad.byCode.get(v.radL4 ?? "")?.level === 4 ? v.radL4 : null, "radL5", 5);
    });
}

export type DataInput = z.input<ReturnType<typeof makeDataInput>>;
export type DataValues = z.output<ReturnType<typeof makeDataInput>>;
