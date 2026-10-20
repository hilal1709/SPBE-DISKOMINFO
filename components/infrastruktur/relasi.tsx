"use client";
import { DetailSection } from "@/components/blocks/detail-dialog";
import { jenisConfig } from "@/lib/infrastruktur/jenis";
import type { Infrastruktur } from "@/lib/types";

/** Bagian detail komponen yang dipakai CMS dan dashboard publik. */

export function Links({ items, empty }: { items: { id: string; name: string }[]; empty: string }) {
  return items.length ? (
    <ul className="grid gap-1.5 text-sm">
      {items.map((p) => (
        <li key={p.id} className="flex items-baseline gap-2">
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{p.id}</span>
          <span>{p.name}</span>
        </li>
      ))}
    </ul>
  ) : (
    <p className="text-sm text-muted-foreground">{empty}</p>
  );
}

/** Kolom khusus komponen (urutan template) yang terisi; kolom bersyarat hanya bila syaratnya terpenuhi. */
export function attrEntries(r: Pick<Infrastruktur, "jenis" | "atribut">) {
  return jenisConfig[r.jenis].attrs.filter((a) => r.atribut[a.key] && (!a.when || r.atribut[a.when.key] === a.when.value)).map((a) => ({ label: a.label, value: r.atribut[a.key]! }));
}

/** Bagian relasi pop-up detail, dipakai CMS dan dashboard publik. */
export function RelasiSection({ r }: { r: Pick<Infrastruktur, "jenis" | "relasi" | "terhubung" | "aplikasi" | "data" | "probis"> }) {
  const cfg = jenisConfig[r.jenis];
  const named = (list: Infrastruktur["relasi"]) => list.map((i) => ({ id: i.id, name: `${i.name} · ${jenisConfig[i.jenis].short}` }));
  const groups = [
    { title: "→ Komponen terkait", items: named(r.relasi), empty: "Belum ditautkan ke komponen lain.", show: cfg.relasi.some((x) => x in jenisConfig) || !!cfg.fungsi },
    { title: "← Ditautkan oleh", items: named(r.terhubung), empty: "", show: r.terhubung.length > 0 },
    { title: `${cfg.relasi.includes("aplikasi") ? "← " : ""}Aplikasi`, items: r.aplikasi, empty: "Belum ada aplikasi.", show: cfg.relasi.includes("aplikasi") || r.aplikasi.length > 0 },
    { title: "Data dan informasi", items: r.data, empty: "Belum ditautkan ke data.", show: cfg.relasi.includes("data") },
    { title: "→ Proses bisnis", items: r.probis, empty: "Belum ditautkan ke proses bisnis.", show: cfg.relasi.includes("probis") },
  ].filter((g) => g.show);
  if (!groups.length) return null;
  return (
    <DetailSection title="Relasi">
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.title} className="grid content-start gap-1.5">
            <p className="text-xs font-medium text-muted-foreground">{g.title}</p>
            <Links items={g.items} empty={g.empty} />
          </div>
        ))}
      </div>
    </DetailSection>
  );
}
