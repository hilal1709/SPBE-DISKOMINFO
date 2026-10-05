"use client";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

/** Warna per tab status, sama dengan badge statusnya (Diajukan kuning, Disetujui teal, Dikembalikan oranye/koral, dst.). */
const tones: Record<string, { ring: string; fill: string }> = {
  all: { ring: "border-brand-charcoal/25", fill: "data-active:bg-brand-charcoal data-active:text-white" },
  draft: { ring: "border-border", fill: "data-active:bg-muted data-active:text-foreground" },
  submitted: { ring: "border-brand-yellow", fill: "data-active:bg-brand-yellow data-active:text-on-brand" },
  verified: { ring: "border-brand-sky", fill: "data-active:bg-brand-sky data-active:text-on-brand" },
  approved: { ring: "border-brand-teal", fill: "data-active:bg-brand-teal data-active:text-on-brand" },
  rejected: { ring: "border-brand-orange", fill: "data-active:bg-brand-orange data-active:text-on-brand" },
  review: { ring: "border-brand-amber", fill: "data-active:bg-brand-amber data-active:text-on-brand" },
};

/** Tab status daftar CMS berbentuk pil bergaris warna status; pil aktif terisi penuh (pola pil filter referensi). */
export function StatusTabs<T extends string>({
  value,
  onChange,
  tabs,
  counts,
}: {
  value: T;
  onChange: (value: T) => void;
  tabs: { value: T; label: string }[];
  counts: Map<string, number>;
}) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as T)} data-reveal>
      <TabsList className="h-auto flex-wrap justify-start gap-2 bg-transparent p-0">
        {tabs.map((t) => {
          const tone = tones[t.value] ?? tones.draft!;
          return (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className={cn("h-8 flex-none gap-1.5 rounded-full border-2 bg-card px-3.5 data-active:border-transparent data-active:font-semibold data-active:shadow-none", tone.ring, tone.fill)}
            >
              {t.label}
              <span className="rounded-full bg-current/15 px-1.5 text-[10px] tabular-nums">{counts.get(t.value) ?? 0}</span>
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
