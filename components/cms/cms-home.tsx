"use client";
import Link from "next/link";
import { useRef, useState } from "react";
import { Add01Icon, ArrowRight01Icon, FileImportIcon, GitCompareIcon, Target02Icon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { Segmented } from "@/components/blocks/segmented";
import { StatCard } from "@/components/blocks/stat-card";
import { StatRow } from "@/components/blocks/stat-row";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can, reviewTeam, type Actor } from "@/lib/permissions";
import type { RencanaStatus } from "@/lib/peta-rencana/muatan";
import type { SubmissionStatus } from "@/lib/types";

type Activity = { id: string; name: string; actorName: string | null; toStatus: SubmissionStatus; note: string | null; createdAt: string; kind?: "probis" | "layanan" | "data" | "aplikasi" | "infrastruktur" | "keamanan" };
type Summary = { counts: Partial<Record<SubmissionStatus, number>>; /** Perlu pemetaan ulang referensi (RAB/RAL). */ review: number };
type Domain = "probis" | "layanan" | "data" | "aplikasi" | "infrastruktur" | "keamanan";

/** Teks & tautan per domain. */
const domains = {
  probis: { noun: "probis", total: "Total proses bisnis", ref: "RAB", list: "/cms/proses-bisnis", base: "/cms/proses-bisnis" },
  layanan: { noun: "layanan", total: "Total layanan", ref: "RAL", list: "/cms/layanan", base: "/cms/layanan" },
  data: { noun: "data", total: "Total data", ref: "RAD", list: "/cms/data", base: "/cms/data" },
  aplikasi: { noun: "aplikasi", total: "Total aplikasi", ref: "RAA", list: "/cms/aplikasi", base: "/cms/aplikasi" },
  infrastruktur: { noun: "komponen infrastruktur", total: "Total komponen", ref: "RAI", list: "/cms/infrastruktur", base: "/cms/infrastruktur" },
  keamanan: { noun: "kegiatan keamanan", total: "Total kegiatan", ref: "", list: "/cms/keamanan", base: "/cms/keamanan" },
} as const;

/** Tindakan tertunda untuk satu domain, urut prioritas. */
function steps(actor: Actor, domain: Domain, { counts, review }: Summary) {
  const d = domains[domain];
  const list: { text: string; href: string; label: string }[] = [];
  if (review > 0 && can.create(actor)) list.push({ text: `${review} ${d.noun} perlu dipetakan ulang karena versi ${d.ref} periodenya berganti.`, href: d.list, label: "Petakan ulang" });
  if (can.verify(actor, domain) && counts.submitted) list.push({ text: `${counts.submitted} ajuan ${d.noun} OPD menunggu verifikasi tim ${reviewTeam("verifikasi", domain)}.`, href: `${d.base}/verifikasi`, label: "Buka verifikasi" });
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

/** Kegiatan Peta Rencana periode aktif yang perlu diperbarui pengelolanya. */
function rencanaSteps(actor: Actor, rencana: { counts: Partial<Record<RencanaStatus, number>>; openHighGaps?: number } | null | undefined) {
  if (!rencana || !can.manageRencana(actor)) return [];
  const list: { text: string; href: string; label: string }[] = [];
  // Notulen: gap analysis diselesaikan sebelum peta rencana.
  if (rencana.openHighGaps) list.push({ text: `${rencana.openHighGaps} kesenjangan prioritas tinggi belum ditindaklanjuti.`, href: "/cms/gap-analysis", label: "Buka gap" });
  if (rencana.counts.berjalan) list.push({ text: `${rencana.counts.berjalan} kegiatan peta rencana sedang berjalan; perbarui realisasi dan catatan evaluasinya.`, href: "/cms/peta-rencana", label: "Perbarui" });
  if (rencana.counts.ditunda) list.push({ text: `${rencana.counts.ditunda} kegiatan peta rencana ditunda.`, href: "/cms/peta-rencana", label: "Tinjau" });
  return list;
}

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Beranda CMS: ringkasan status per domain dalam cakupan pengguna, tindakan berikutnya, dan aktivitas terbaru. */
export function CmsHome({
  actor,
  probis,
  layanan,
  data,
  aplikasi,
  infrastruktur,
  keamanan,
  rencana,
  recent,
}: {
  actor: Actor;
  probis: Summary;
  layanan: Summary;
  data: Summary;
  aplikasi: Summary;
  infrastruktur: Summary;
  keamanan: Summary;
  /** Ringkasan Peta Rencana periode aktif (status pelaksanaan), bila tersedia. */
  rencana?: { counts: Partial<Record<RencanaStatus, number>>; openHighGaps?: number } | null;
  recent: Activity[];
}) {
  const timeline = useRef<HTMLOListElement>(null);
  const [domain, setDomain] = useState<Domain>("probis");
  const counts = { probis, layanan, data, aplikasi, infrastruktur, keamanan }[domain].counts;
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("li", { opacity: 0, x: -10, stagger: 0.06, duration: 0.4, delay: 0.3, clearProps: "all" });
      });
    },
    { scope: timeline },
  );

  // Maksimal tiga tindakan terpenting dari semua domain.
  const next = [...rencanaSteps(actor, rencana), ...steps(actor, "probis", probis), ...steps(actor, "layanan", layanan), ...steps(actor, "data", data), ...steps(actor, "aplikasi", aplikasi), ...steps(actor, "infrastruktur", infrastruktur), ...steps(actor, "keamanan", keamanan)].slice(0, 3);

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
          { value: "data", label: "Data" },
          { value: "aplikasi", label: "Aplikasi" },
          { value: "infrastruktur", label: "Infrastruktur" },
          { value: "keamanan", label: "Keamanan" },
        ]}
      />
      <StatRow>
        <StatCard tone="teal" label={domains[domain].total} value={total} />
        <StatCard tone="orange" label="Menunggu verifikasi" value={counts.submitted ?? 0} hint={`tim ${reviewTeam("verifikasi", domain)}`} />
        <StatCard tone="yellow" label="Menunggu validasi" value={counts.verified ?? 0} hint="tim Diskominfo" />
        <StatCard tone="amber" label="Tervalidasi" value={counts.approved ?? 0} hint="tayang di portal publik" />
        <StatCard tone="sky" label="Draf & dikembalikan" value={(counts.draft ?? 0) + (counts.rejected ?? 0)} hint="perlu dilengkapi OPD" />
      </StatRow>

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
            {can.manageRencana(actor) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink tone="bg-brand-teal" href="/cms/peta-rencana/baru" icon={Add01Icon} title="Tambah kegiatan rencana" text="Target arsitektur per tahun" />
                <QuickLink tone="bg-brand-yellow" href="/cms/peta-rencana/indikator" icon={Target02Icon} title="Indikator & target" text="Target sasaran tiap tahun" />
                <QuickLink tone="bg-brand-orange" href="/cms/gap-analysis" icon={GitCompareIcon} title="Gap analysis" text="Pindai kesenjangan AS-IS & target" />
              </div>
            )}
            {can.create(actor) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink tone="bg-brand-orange" href="/cms/proses-bisnis/baru" icon={Add01Icon} title="Tambah probis" text="Isi form dengan bantuan AI" />
                <QuickLink tone="bg-brand-teal" href="/cms/layanan/baru" icon={Add01Icon} title="Tambah layanan" text="Isi form dengan bantuan AI" />
                {can.import(actor) && <QuickLink tone="bg-brand-yellow" href="/cms/impor" icon={FileImportIcon} title="Impor probis" text="Unggah xlsx / zip arsitektur" />}
                <QuickLink tone="bg-brand-sky" href="/cms/data/baru" icon={Add01Icon} title="Tambah data" text="Isi form dengan bantuan AI" />
                {can.import(actor) && <QuickLink tone="bg-brand-amber" href="/cms/layanan/impor" icon={FileImportIcon} title="Impor layanan" text="Unggah template analis" />}
                {can.import(actor) && <QuickLink tone="bg-brand-orange" href="/cms/data/impor" icon={FileImportIcon} title="Impor data" text="Unggah template atau zip arsitektur" />}
                <QuickLink tone="bg-brand-teal" href="/cms/aplikasi/baru" icon={Add01Icon} title="Tambah aplikasi" text="Isi form dengan bantuan AI" />
                {can.import(actor) && <QuickLink tone="bg-brand-yellow" href="/cms/aplikasi/impor" icon={FileImportIcon} title="Impor aplikasi" text="Unggah template analis" />}
                <QuickLink tone="bg-brand-amber" href="/cms/infrastruktur/baru" icon={Add01Icon} title="Tambah komponen" text="Server, jaringan, cloud, dan lainnya" />
                {can.import(actor) && <QuickLink tone="bg-brand-sky" href="/cms/infrastruktur/impor" icon={FileImportIcon} title="Impor infrastruktur" text="Unggah 10 template komponen" />}
                <QuickLink tone="bg-brand-orange" href="/cms/keamanan/baru" icon={Add01Icon} title="Tambah kegiatan keamanan" text="Standar, audit, insiden, dan lainnya" />
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
                      {a.kind && a.kind !== "probis" && <span className="text-[11px] text-muted-foreground">{a.kind}</span>}
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
