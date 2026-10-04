"use client";
import Link from "next/link";
import { useRef } from "react";
import { Add01Icon, ArrowRight01Icon, FileImportIcon } from "@hugeicons/core-free-icons";
import { EmptyState } from "@/components/blocks/empty-state";
import { StatCard } from "@/components/blocks/stat-card";
import { ReviewBadge } from "@/components/cms/review-badge";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { can, type Actor } from "@/lib/permissions";
import type { SubmissionStatus } from "@/lib/types";

type Activity = { id: string; probisId: string; name: string; actorName: string | null; toStatus: SubmissionStatus; note: string | null; createdAt: string };

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

/** Beranda CMS: ringkasan status probis dalam cakupan pengguna, tindakan berikutnya, dan aktivitas terbaru. */
export function CmsHome({ actor, counts, recent, review = 0 }: { actor: Actor; counts: Partial<Record<SubmissionStatus, number>>; recent: Activity[]; /** Probis yang RAB-nya perlu dipetakan ulang. */ review?: number }) {
  const timeline = useRef<HTMLOListElement>(null);
  const total = Object.values(counts).reduce((a, b) => a + (b ?? 0), 0);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from("li", { opacity: 0, x: -10, stagger: 0.06, duration: 0.4, delay: 0.3, clearProps: "all" });
      });
    },
    { scope: timeline },
  );

  const toVerify = can.verify(actor) ? counts.submitted ?? 0 : 0;
  const toValidate = can.validate(actor) ? counts.verified ?? 0 : 0;
  const next =
    review > 0 && can.create(actor)
      ? { text: `${review} probis perlu dipetakan ulang karena versi RAB periodenya berganti.`, href: "/cms/proses-bisnis", label: "Petakan ulang" }
      : toVerify > 0
      ? { text: `${toVerify} ajuan OPD menunggu verifikasi tim Bagian Organisasi.`, href: "/cms/proses-bisnis/verifikasi", label: "Buka verifikasi" }
      : toValidate > 0
        ? { text: `${toValidate} probis terverifikasi menunggu validasi tim Diskominfo.`, href: "/cms/proses-bisnis/validasi", label: "Buka validasi" }
        : (counts.rejected ?? 0) > 0 && can.create(actor)
        ? { text: `${counts.rejected} proses bisnis dikembalikan dan perlu diperbaiki.`, href: "/cms/proses-bisnis", label: "Perbaiki" }
        : (counts.draft ?? 0) > 0 && can.create(actor)
          ? { text: `${counts.draft} draf belum diajukan.`, href: "/cms/proses-bisnis", label: "Lihat draf" }
          : null;

  return (
    <Reveal className="grid gap-5">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard tone="teal" label="Total proses bisnis" value={total} />
        <StatCard tone="orange" label="Menunggu verifikasi" value={counts.submitted ?? 0} hint="tim Bagian Organisasi" />
        <StatCard tone="yellow" label="Menunggu validasi" value={counts.verified ?? 0} hint="tim Diskominfo" />
        <StatCard tone="amber" label="Tervalidasi" value={counts.approved ?? 0} hint="tayang di portal publik" />
        <StatCard label="Draf & dikembalikan" value={(counts.draft ?? 0) + (counts.rejected ?? 0)} hint="perlu dilengkapi OPD" />
      </section>

      <section className="grid gap-5 *:min-w-0 xl:grid-cols-[1.2fr_1fr]">
        <Card data-reveal>
          <CardHeader>
            <CardTitle className="section-title">Langkah berikutnya</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {next ? (
              <div className="flex flex-wrap items-center gap-3 rounded-xl bg-accent p-4 text-accent-foreground">
                <p className="flex-1 text-sm font-medium">{next.text}</p>
                <Button asChild size="sm">
                  <Link href={next.href}>
                    {next.label}
                    <Icon icon={ArrowRight01Icon} size={14} />
                  </Link>
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Tidak ada tindakan yang tertunda.</p>
            )}
            {can.create(actor) && (
              <div className="grid gap-3 sm:grid-cols-2">
                <QuickLink href="/cms/proses-bisnis/baru" icon={Add01Icon} title="Tambah probis" text="Isi form dengan bantuan AI" />
                {can.import(actor) && <QuickLink href="/cms/impor" icon={FileImportIcon} title="Impor template" text="Unggah xlsx / zip arsitektur" />}
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
                    <span aria-hidden className="absolute top-1.5 -left-[1.3rem] size-2.5 rounded-full border-2 border-card bg-brand-amber" />
                    <p className="flex flex-wrap items-center gap-2">
                      <ReviewBadge status={a.toStatus} />
                      <span className="truncate font-medium">{a.name}</span>
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

function QuickLink({ href, icon, title, text }: { href: string; icon: typeof Add01Icon; title: string; text: string }) {
  return (
    <Link href={href} className="group/q flex items-center gap-3 rounded-xl border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-teal hover:shadow-card">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-teal/15 transition-transform duration-300 group-hover/q:scale-110 group-hover/q:rotate-6">
        <Icon icon={icon} size={20} />
      </span>
      <span className="grid">
        <span className="text-sm font-semibold">{title}</span>
        <span className="text-xs text-muted-foreground">{text}</span>
      </span>
    </Link>
  );
}
