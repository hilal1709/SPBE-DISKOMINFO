"use client";
import { LinkPicker } from "@/components/cms/link-picker";
import { Field, FieldLabel } from "@/components/ui/field";
import { securityFields, type Security } from "@/lib/data/reference";
import { kegiatanConfig } from "@/lib/keamanan/jenis";
import { useSecurityRefs } from "./security-context";

/** Jumlah isian dependensi keamanan (untuk ringkasan kartu terlipat). */
export const securityCount = (value: Security) => securityFields.reduce((n, f) => n + (value[f.key]?.length ?? 0), 0);

/**
 * Tujuh dependensi Keamanan SPBE (kolom template Data, Aplikasi, Infrastruktur) ditautkan ke kegiatan keamanan
 * tervalidasi pada periode yang sama. Isian teks lama tetap tampil sebagai chip agar tidak hilang saat disimpan.
 */
export function SecurityLinks({ period, value, onChange, arrow = "←" }: { period: string; value: Security; onChange: (value: Security) => void; arrow?: "←" | "→" }) {
  const security = useSecurityRefs();
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {securityFields.map((f) => {
        const current = value[f.key] ?? [];
        const options = security.options(period, f.key).map((r) => ({ code: r.code, name: r.name, hint: r.code }));
        const legacy = current.filter((v) => !options.some((o) => o.code === v)).map((v) => ({ code: v, name: v, hint: "teks lama" }));
        return (
          <Field key={f.key} data-sec className="rounded-lg">
            <FieldLabel>
              {arrow} {kegiatanConfig[f.key].short}
            </FieldLabel>
            <LinkPicker
              noun={`kegiatan ${kegiatanConfig[f.key].short.toLowerCase()}`}
              disabledText="Pilih periode dulu"
              options={[...options, ...legacy]}
              values={current}
              loading={false}
              disabled={!period}
              onChange={(list) => onChange({ ...value, [f.key]: list })}
            />
          </Field>
        );
      })}
    </div>
  );
}
