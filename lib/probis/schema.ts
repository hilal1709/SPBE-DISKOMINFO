import { z } from "zod";
import type { RabIndex } from "./rab-index";
import { pdByCode } from "./reference";

const optionalText = z.string().trim().max(2000).optional().transform((v) => v || null);

/**
 * Isian probis — kolom mengikuti template "Domain Arsitektur Proses Bisnis.xlsx".
 * Dibuat per versi RAB (versi milik periode tujuan); dipakai server action, impor, dan seed.
 */
export function makeProbisInput(rab: RabIndex) {
  return z
    .object({
      opd: z.string().refine((v) => pdByCode.has(v), "Pilih Perangkat Daerah"),
      name: z.string().trim().min(3, "Nama proses bisnis minimal 3 karakter").max(200),
      description: optionalText,
      probisStatus: z.enum(["new", "upgrade", "as_is"]),
      /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
      period: z.string().trim().min(4, "Pilih periode arsitektur"),
      rab3: z
        .string()
        .refine((v) => rab.byCode.get(v)?.level === 3, "Pilih RAB Level 3")
        .refine((v) => rab.active(rab.byCode.get(v)), "RAB Level 3 ini sudah tidak berlaku, pilih penggantinya"),
      rabL4: optionalText,
      rabL5: optionalText,
      strategicGoal: optionalText,
      iku: optionalText,
      ikuTarget: optionalText,
      ikuRealization: optionalText,
    })
    .superRefine((v, ctx) => {
      // L4/L5: kode terdaftar harus turunan induknya; teks bebas hanya boleh selama referensi di bawah induk belum ada.
      const check = (value: string | null, parent: string | null, path: "rabL4" | "rabL5", level: number) => {
        if (!value) return;
        const known = rab.byCode.get(value);
        if ((known && known.parent !== parent) || (!known && rab.children(parent).length)) {
          ctx.addIssue({ code: "custom", path: [path], message: `Pilih RAB Level ${level} di bawah ${parent || "level di atasnya"}` });
        }
      };
      check(v.rabL4, v.rab3, "rabL4", 4);
      check(v.rabL5, rab.byCode.get(v.rabL4 ?? "")?.level === 4 ? v.rabL4 : null, "rabL5", 5);
    });
}

export type ProbisInput = z.input<ReturnType<typeof makeProbisInput>>;
export type ProbisValues = z.output<ReturnType<typeof makeProbisInput>>;
