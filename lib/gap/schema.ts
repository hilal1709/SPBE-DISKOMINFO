import { z } from "zod";
import { pdByCode } from "@/lib/probis/reference";
import { muatanKeys } from "@/lib/peta-rencana/muatan";
import { priorityKeys } from "./rules";

/** Temuan manual (mis. kebutuhan SDM, kapasitas server, kebijakan) atau penyesuaian temuan otomatis. */
export const gapInput = z.object({
  period: z.string().trim().min(4, "Pilih periode arsitektur"),
  opd: z
    .string()
    .optional()
    .transform((v) => v || null)
    .refine((v) => !v || pdByCode.has(v), "Perangkat daerah tidak dikenal"),
  domain: z.enum(muatanKeys, { message: "Pilih domain" }),
  subjectName: z.string().trim().min(3, "Isi objek kesenjangan minimal 3 karakter").max(250),
  sasaran: z.string().trim().max(500).optional().transform((v) => v || null),
  asIs: z.string().trim().min(3, "Jelaskan kondisi saat ini").max(1000),
  target: z.string().trim().min(3, "Jelaskan kondisi target").max(1000),
  rekomendasi: z.string().trim().min(3, "Tuliskan rekomendasi").max(500),
  priority: z.enum(priorityKeys).default("sedang"),
});

export type GapInput = z.input<typeof gapInput>;
export type GapValues = z.output<typeof gapInput>;
