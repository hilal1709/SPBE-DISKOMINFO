"use client";
import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import { searchExistingRecords } from "@/app/cms/existing-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReviewBadge } from "@/components/cms/review-badge";
import { EmptyState } from "@/components/blocks/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { domains, type DomainKey } from "@/lib/domains";
import type { ExistingRecord } from "@/lib/cms/existing";

export function ExistingRecordSearch({ domain }: { domain: DomainKey }) {
  const [query, setQuery] = useState("");
  const [result, setResult] = useState<{ query: string; rows: ExistingRecord[]; error?: string } | null>(null);
  const [pending, start] = useTransition();
  useEffect(() => {
    if (query.trim().length < 2) return;
    let active = true;
    const timer = setTimeout(() => start(async () => {
      const response = await searchExistingRecords(domain, query);
      if (active) setResult({ query, rows: response.ok ? response.data : [], error: response.ok ? undefined : response.error });
    }), 300);
    return () => { active = false; clearTimeout(timer); };
  }, [domain, query]);
  const current = result?.query === query ? result : null;
  return (
    <Card className="mb-5">
      <CardHeader><CardTitle as="h2" className="section-title">Cari Data yang Sudah Ada</CardTitle></CardHeader>
      <CardContent className="grid gap-3">
        <Input aria-label="Cari kode atau nama data existing" placeholder="Kode atau nama, minimal 2 karakter" maxLength={120} value={query} onChange={(e) => setQuery(e.target.value)} />
        <p className="text-xs text-muted-foreground">Pilih data untuk membuka form edit. Hasil mengikuti hak akses, OPD, dan status yang boleh Anda ubah.</p>
        <div aria-live="polite" aria-busy={pending}>
          {query.trim().length >= 2 && !current && <Skeleton className="h-14" />}
          {current?.error && <p role="alert" className="text-sm text-destructive">{current.error}</p>}
          {current && !current.error && !current.rows.length && <EmptyState title="Tidak ada data yang dapat diedit" description="Coba kode atau nama lain, atau lanjutkan form baru di bawah." />}
          {current?.rows.map((row) => (
            <Link key={row.id} href={`${domains[domain].cms}/${row.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg p-3 hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring">
              <span><span className="block text-sm font-semibold">{row.name}</span><span className="text-xs text-muted-foreground">{row.code} · {row.opd} · {row.period}{row.kind ? ` · ${row.kind.replaceAll("_", " ")}` : ""}</span></span>
              <ReviewBadge status={row.status} />
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
