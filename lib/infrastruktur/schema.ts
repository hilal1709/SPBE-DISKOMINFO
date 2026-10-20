import { z } from "zod";
import { securityFields } from "@/lib/data/reference";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";
import { jenisConfig, jenisKeys, kepemilikanOptions } from "./jenis";
import { isRaiLeaf } from "./reference";

const optionalText = z.string().trim().max(2000).optional().transform((v) => v || null);
const shortText = z.string().trim().max(200).optional().transform((v) => v || null);
const list = z.array(z.string().trim().min(1).max(300)).max(30).default([]);
const codes = (noun: string) => z.array(z.string().trim().min(1)).max(50, `Maksimal 50 ${noun}`).default([]);

/**
 * Isian komponen infrastruktur — kolom bersama 10 template "Domain Arsitektur Infrastruktur - *.xlsx" dan kolom khusus
 * per komponen (`atribut`, kunci di lib/infrastruktur/jenis.ts). Dibuat per versi RAI milik periode tujuan.
 */
export function makeInfrastrukturInput(rai: RabIndex) {
  return z
    .object({
      /** Instansi (Perangkat Daerah pemilik isian). */
      opd: z.string().refine((v) => pdByCode.has(v), "Pilih instansi pemilik"),
      jenis: z.enum(jenisKeys, { message: "Pilih komponen infrastruktur" }),
      name: z.string().trim().min(2, "Nama komponen minimal 2 karakter").max(200),
      /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
      period: z.string().trim().min(4, "Pilih periode arsitektur"),
      deskripsi: optionalText,
      pemilik: shortText,
      kepemilikan: z
        .enum(kepemilikanOptions.map((o) => o.value) as [string, ...string[]])
        .optional()
        .or(z.literal(""))
        .transform((v) => (v || null) as (typeof kepemilikanOptions)[number]["value"] | null),
      pengelola: shortText,
      /** RAI Level 3, atau Level 2 yang tidak memiliki turunan. */
      rai: z
        .string()
        .refine((v) => isRaiLeaf(rai, v), "Pilih RAI")
        .refine((v) => rai.active(rai.byCode.get(v)), "RAI ini sudah tidak berlaku, pilih penggantinya"),
      atribut: z.record(z.string(), z.string().trim().max(500)).default({}),
      /** Kode komponen infrastruktur lain, aplikasi, data, dan proses bisnis terkait (periode sama). */
      relasi: codes("komponen"),
      aplikasi: codes("aplikasi"),
      data: codes("data"),
      probis: codes("proses bisnis"),
      security: z.object(Object.fromEntries(securityFields.map((f) => [f.key, list])) as Record<(typeof securityFields)[number]["key"], typeof list>).partial().default({}),
    })
    .superRefine((v, ctx) => {
      const cfg = jenisConfig[v.jenis];
      // Relasi ke domain lain hanya bila template komponen memuat kolomnya.
      for (const domain of ["aplikasi", "data", "probis"] as const) {
        if (v[domain].length && !cfg.relasi.includes(domain)) ctx.addIssue({ code: "custom", path: [domain], message: `${cfg.label} tidak memiliki tautan ke ${domain}` });
      }
    })
    .transform((v) => {
      // Kolom khusus: hanya kunci milik komponen ini; isian kosong dibuang.
      const keys = new Set(jenisConfig[v.jenis].attrs.map((a) => a.key));
      return { ...v, atribut: Object.fromEntries(Object.entries(v.atribut).filter(([k, value]) => keys.has(k) && value)) };
    });
}

export type InfrastrukturInput = z.input<ReturnType<typeof makeInfrastrukturInput>>;
export type InfrastrukturValues = z.output<ReturnType<typeof makeInfrastrukturInput>>;
