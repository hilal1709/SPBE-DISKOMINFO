"use client";
import { useEffect, useState } from "react";
import { rencanaLinkOptions } from "@/app/cms/peta-rencana/actions";
import { Segmented } from "@/components/blocks/segmented";
import { LinkPicker, type LinkOption } from "@/components/cms/link-picker";
import { useOpd } from "@/components/opd/opd-context";
import { domainKeys, domains, type DomainKey } from "@/lib/domains";
import type { RencanaLink } from "@/lib/types";

/**
 * Pemilih entri arsitektur yang ditangani satu kegiatan Peta Rencana. Pilihan dimuat per domain untuk periode
 * kegiatan; proses bisnis dibatasi ke Perangkat Daerah pelaksana karena jumlahnya ribuan.
 */
export function ArchitectureLinks({ period, opd, value, onChange }: { period: string; opd: string; value: RencanaLink[]; onChange: (value: RencanaLink[]) => void }) {
  const book = useOpd();
  const [domain, setDomain] = useState<DomainKey>("aplikasi");
  const [loaded, setLoaded] = useState<{ key: string; options: LinkOption[] } | null>(null);
  const needsOpd = domain === "probis";
  const key = `${period}|${domain}|${needsOpd ? opd : ""}`;
  const disabled = !period || (needsOpd && !opd);

  useEffect(() => {
    if (disabled) return;
    let active = true;
    rencanaLinkOptions(period, domain, needsOpd ? opd : null).then((r) => {
      if (active) setLoaded({ key, options: r.ok ? r.data.map((o) => ({ code: o.code, name: o.name, hint: needsOpd ? undefined : book.name(o.opd, period) })) : [] });
    });
    return () => {
      active = false;
    };
  }, [key, disabled, period, domain, needsOpd, opd, book]);

  const ready = loaded?.key === key ? loaded.options : null;
  /** Nama entri yang sudah tertaut tetap tampil walau pilihannya belum dimuat. */
  const options = [...(ready ?? []), ...value.filter((l) => l.domain === domain && !ready?.some((o) => o.code === l.code)).map((l) => ({ code: l.code, name: l.name }))];
  const pick = (codes: string[]) =>
    onChange([...value.filter((l) => l.domain !== domain), ...codes.map((code) => ({ domain, code, name: options.find((o) => o.code === code)?.name ?? code }))]);
  const count = (d: DomainKey) => value.filter((l) => l.domain === d).length;

  return (
    <div className="grid gap-3">
      <Segmented
        label="Domain arsitektur"
        value={domain}
        onChange={setDomain}
        options={domainKeys.map((d) => ({ value: d, label: count(d) ? `${domains[d].label} · ${count(d)}` : domains[d].label }))}
      />
      <LinkPicker
        options={options}
        values={value.filter((l) => l.domain === domain).map((l) => l.code)}
        loading={!disabled && !ready}
        disabled={disabled}
        onChange={pick}
        noun={domains[domain].label.toLowerCase()}
        disabledText={period ? "Pilih perangkat daerah pelaksana dulu" : "Pilih periode dulu"}
      />
    </div>
  );
}
