"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Add01Icon, ArrowRight01Icon, FileImportIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { Segmented } from "@/components/blocks/segmented";
import { StatCard } from "@/components/blocks/stat-card";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can, type Actor } from "@/lib/permissions";
import type { SubmissionStatus } from "@/lib/types";

type Activity = { id: string; name: string; actorName: string | null; toStatus: SubmissionStatus; note: string | null; createdAt: string; kind?: "probis" | "layanan" };
type Summary = { counts: Partial<Record<SubmissionStatus, number>>; /** Perlu pemetaan ulang referensi (RAB/RAL). */ review: number };
type Domain = "probis" | "layanan";

/** Teks & tautan per domain. */
const domains = {
  probis: { noun: "probis", total: "Total proses bisnis", ref: "RAB", list: "/cms/proses-bisnis", base: "/cms/proses-bisnis" },
  layanan: { noun: "layanan", total: "Total layanan", ref: "RAL", list: "/cms/layanan", base: "/cms/layanan" },
} as const;

/** Tindakan tertunda untuk satu domain, urut prioritas. */
function steps(actor: Actor, domain: Domain, { counts, review }: Summary) {
  const d = domains[domain];
  const list: { text: string; href: string; label: string }[] = [];
  if (review > 0 && can.create(actor)) list.push({ text: `${review} ${d.noun} perlu dipetakan ulang karena versi ${d.ref} periodenya berganti.`, href: d.list, label: "Petakan ulang" });
  if (can.verify(actor) && counts.submitted) list.push({ text: `${counts.submitted} ajuan ${d.noun} OPD menunggu verifikasi tim Bagian Organisasi.`, href: `${d.base}/verifikasi`, label: "Buka verifikasi" });
  if (can.validate(actor) && counts.verified) list.push({ text: `${counts.verified} ${d.noun} terverifikasi menunggu validasi tim Diskominfo.`, href: `${d.base}/validasi`, label: "Buka validasi" });
  if (can.create(actor) && counts.rejected) list.push({ text: `${counts.rejected} ${d.noun} dikembalikan dan perlu diperbaiki.`, href: d.list, label: "Perbaiki" });
  if (can.create(actor) && counts.draft) list.push({ text: `${counts.draft} draf ${d.noun} belum diajukan.`, href: d.list, label: "Lihat draf" });
  return list;
}

/** Warna titik linimasa sama dengan warna badge statusnya. */
const dotTone: Record<SubmissionStatus, string> = {
  draft: "bg-muted-foreground/40",
  submitted: "bg-brand-yellow",
  verified: "bg-brand-sky",
  approved: "bg-brand-teal",
  rejected: "bg-brand-orange",
  archived: "bg-muted-foreground/40",
};

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Beranda CMS: ringkasan status per domain dalam cakupan pengguna, tindakan berikutnya, dan aktivitas terbaru. */
export function CmsHome({ actor, probis, layanan, recent }: { actor: Actor; probis: Summary; layanan: Summary; recent: Activity[] }) {
  const timeline = useRef<HTMLOListElement>(null);
  const [domain, setDomain] = useState<Domain>("probis");
  const counts = (domain === "probis" ? probis : layanan).counts;
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("li", { opacity: 0, x: -10, stagger: 0.06, duration: 0.4, delay: 0.3, clearProps: "all" });
      });
    },
    { scope: timeline },
  );

  // Maksimal tiga tindakan terpenting dari kedua domain.
  const next = [...steps(actor, "probis", probis), ...steps(actor, "layanan", layanan)].slice(0, 3);

  return (
    <Reveal className="grid gap-5">
      <Segmented
        label="Domain ringkasan"
        className="w-fit"
        value={domain}
        onChange={setDomain}
        options={[
          { value: "probis", label: "Proses bisnis" },
          { value: "layanan", label: "Layanan" },
        ]}
      />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard tone="teal" label={domains[domain].total} value={total} />
        <StatCard tone="orange" label="Menunggu verifikasi" value={counts.submitted ?? 0} hint="tim Bagian Organisasi" />
        <StatCard tone="yellow" label="Menunggu validasi" value={counts.verified ?? 0} hint="tim Diskominfo" />
        <StatCard tone="amber" label="Tervalidasi" value={counts.approved ?? 0} hint="tayang di portal publik" />
        <StatCard tone="sky" label="Draf & dikembalikan" value={(counts.draft ?? 0) + (counts.rejected ?? 0)} hint="perlu dilengkapi OPD" />
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.2fr_1fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Langkah berikutnya</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {next.length ? (
              next.map((step) => (
                <div key={step.href + step.label} className="flex flex-wrap items-center gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
                  <p className="flex-1 text-sm font-medium">{step.text}</p>
                  <Button asChild size="sm" variant="teal" className="rounded-full">
                    <Link href={step.href}>
                      {step.label}
                      <Icon icon={ArrowRight01Icon} size={14} />
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tindakan yang tertunda.</p>
            )}
            {can.create(actor) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink tone="bg-brand-orange" href="/cms/proses-bisnis/baru" icon={Add01Icon} title="Tambah probis" text="Isi form dengan bantuan AI" />
                <QuickLink tone="bg-brand-teal" href="/cms/layanan/baru" icon={Add01Icon} title="Tambah layanan" text="Isi form dengan bantuan AI" />
                {can.import(actor) && <QuickLink tone="bg-brand-yellow" href="/cms/impor" icon={FileImportIcon} title="Impor probis" text="Unggah xlsx / zip arsitektur" />}
                {can.import(actor) && <QuickLink tone="bg-brand-amber" href="/cms/layanan/impor" icon={FileImportIcon} title="Impor layanan" text="Unggah template analis" />}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Aktivitas terbaru</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length ? (
              <ol ref={timeline} className="relative grid gap-3 border-l pl-4">
                {recent.map((a) => (
                  <li key={a.id} className="relative text-sm">
                    <span aria-hidden className={`absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card ${dotTone[a.toStatus]}`} />
                    <p className="flex flex-wrap items-center gap-2">
                      <ReviewBadge status={a.toStatus} />
                      <span className="truncate font-medium">{a.name}</span>
                      {a.kind === "layanan" && <span className="text-[11px] text-muted-foreground">layanan</span>}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.actorName ?? "Sistem"} · {date.format(new Date(a.createdAt))}
                      {a.note && ` · “${a.note}”`}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <EmptyState size="sm" title="Belum ada aktivitas" description="Riwayat pengisian dan verifikasi akan muncul di sini." />
            )}
          </CardContent>
        </Card>
      </section>
    </Reveal>
  );
}

function QuickLink({ href, icon, title, text, tone }: { href: string; icon: typeof Add01Icon; title: string; text: string; tone: string }) {
  return (
    <Link href={href} className="group/q flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card">
      <span className={`${tone} grid size-10 place-items-center rounded-xl text-on-brand transition-transform duration-300 group-hover/q:scale-110 group-hover/q:rotate-6`}>
        <Icon icon={icon} size={20} />
      </span>
      <span className="grid">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
