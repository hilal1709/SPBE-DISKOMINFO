import { z } from "zod";
import type { RabIndex } from "@/lib/probis/rab-index";
import { pdByCode } from "@/lib/probis/reference";

const optionalText = z.string().trim().max(2000).optional().transform((v) => v || null);

/**
 * Isian layanan — kolom mengikuti template "Domain Arsitektur Layanan.xlsx".
 * Dibuat per versi RAL & RAB milik periode tujuan; dipakai server action, impor, dan seed.
 */
export function makeLayananInput(ral: RabIndex, rab: RabIndex) {
  return z
    .object({
      opd: z.string().refine((v) => pdByCode.has(v), "Pilih Perangkat Daerah"),
      name: z.string().trim().min(3, "Nama layanan minimal 3 karakter").max(200),
      /** Keberadaan periode dicek di server (daftar periode dikelola di CMS). */
      period: z.string().trim().min(4, "Pilih periode arsitektur"),
      tujuan: z.string().trim().min(10, "Tuliskan tujuan layanan (minimal 10 karakter)").max(2000),
      fungsi: optionalText,
      unit: optionalText,
      target: z.enum(["masyarakat", "usaha", "asn", "pemerintah"], { message: "Pilih target layanan" }),
      metode: z.enum(["elektronik", "hybrid", "tatap_muka"], { message: "Pilih metode layanan" }),
      ral3: z
        .string()
        .refine((v) => ral.byCode.get(v)?.level === 3, "Pilih RAL Level 3")
        .refine((v) => ral.active(ral.byCode.get(v)), "RAL Level 3 ini sudah tidak berlaku, pilih penggantinya"),
      ralL4: optionalText,
      ralL5: optionalText,
      /** Urusan pemerintahan (RAB Level 2) — opsional. */
      rab2: z
        .string()
        .optional()
        .transform((v) => v || null)
        .refine((v) => !v || (rab.byCode.get(v)?.level === 2 && rab.active(rab.byCode.get(v))), "Pilih urusan pemerintahan (RAB Level 2) yang berlaku"),
      manfaat: optionalText,
      ekonomi: optionalText,
      risiko: optionalText,
      mitigasi: optionalText,
      kl: optionalText,
      /** Kode proses bisnis yang dilayani (periode yang sama). */
      probis: z.array(z.string().trim().min(1)).max(30, "Maksimal 30 proses bisnis").default([]),
    })
    .superRefine((v, ctx) => {
      // L4/L5: kode terdaftar harus turunan induknya; teks bebas hanya boleh selama referensi di bawah induk belum ada.
      const check = (value: string | null, parent: string | null, path: "ralL4" | "ralL5", level: number) => {
        if (!value) return;
        const known = ral.byCode.get(value);
        if ((known && known.parent !== parent) || (!known && ral.children(parent).length)) {
          ctx.addIssue({ code: "custom", path: [path], message: `Pilih RAL Level ${level} di bawah ${parent || "level di atasnya"}` });
        }
      };
      check(v.ralL4, v.ral3, "ralL4", 4);
      check(v.ralL5, ral.byCode.get(v.ralL4 ?? "")?.level === 4 ? v.ralL4 : null, "ralL5", 5);
      if (v.risiko && !v.mitigasi) ctx.addIssue({ code: "custom", path: ["mitigasi"], message: "Isi mitigasi untuk risiko yang disebutkan" });
    });
}

export type LayananInput = z.input<ReturnType<typeof makeLayananInput>>;
export type LayananValues = z.output<ReturnType<typeof makeLayananInput>>;
