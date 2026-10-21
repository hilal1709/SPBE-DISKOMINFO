import { z } from "zod";
import { pdByCode } from "@/lib/probis/reference";
import { muatanKeys, sourceKeys, statusKeys } from "./muatan";

const optional = (max: number) => z.string().trim().max(max).optional().transform((v) => v || null);

/** Isian kegiatan Peta Rencana (kolom tabel Peta Rencana SPBE Gresik + kolom evaluasi & realisasi dari notulen). */
export const rencanaInput = z
  .object({
    opd: z.string().refine((v) => pdByCode.has(v), "Pilih perangkat daerah pelaksana"),
    /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
    period: z.string().trim().min(4, "Pilih periode arsitektur"),
    year: z.coerce.number().int("Tahun tidak valid").min(2000, "Tahun tidak valid").max(2100, "Tahun tidak valid"),
    sasaran: z.string().trim().min(3, "Pilih sasaran strategis").max(500),
    inisiatif: optional(250),
    muatan: z.enum(muatanKeys, { message: "Pilih muatan" }),
    program: optional(250),
    name: z.string().trim().min(3, "Nama kegiatan minimal 3 karakter").max(250),
    target: optional(500),
    jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0").default(1),
    satuan: z.string().trim().min(1).max(40).default("Kegiatan"),
    status: z.enum(statusKeys).default("direncanakan"),
    realisasi: optional(2000),
    evaluasi: optional(2000),
    source: z.enum(sourceKeys).default("manual"),
    sourceRef: optional(120),
  })
  .superRefine((v, ctx) => {
    const [start, end] = v.period.split(/[–-]/).map(Number);
    if (start && end && (v.year < start || v.year > end)) ctx.addIssue({ code: "custom", path: ["year"], message: `Tahun harus di dalam periode ${v.period}` });
    if (v.status === "terlaksana" && !v.realisasi) ctx.addIssue({ code: "custom", path: ["realisasi"], message: "Isi realisasi untuk kegiatan yang terlaksana" });
  });

export type RencanaInput = z.input<typeof rencanaInput>;
export type RencanaValues = z.output<typeof rencanaInput>;

export const indicatorInput = z.object({
  id: z.string().uuid().optional(),
  period: z.string().trim().min(4, "Pilih periode arsitektur"),
  sasaran: z.string().trim().min(3, "Pilih sasaran strategis"),
  inisiatif: optional(250),
  indikator: z.string().trim().min(2, "Isi nama indikator").max(250),
  targets: z.record(z.string().regex(/^\d{4}$/), z.string().trim().max(60)).default({}),
});

export type IndicatorValues = z.output<typeof indicatorInput>;
