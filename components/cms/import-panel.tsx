"use client";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { Download04Icon, FileDownloadIcon, FileImportIcon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { Banner } from "@/components/blocks/banner";
import { Segmented } from "@/components/blocks/segmented";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { DataTable } from "@/components/blocks/data-table";
import { EmptyState } from "@/components/blocks/empty-state";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { CountUp } from "@/components/motion/count-up";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ActionResult } from "@/lib/cms/result";
import { pdByCode } from "@/lib/probis/reference";
import { cn } from "@/lib/utils";

/** Baris impor minimal yang dibutuhkan panel. */
export type PanelRow = { line: number; name: string; opd: string | null; opdRaw: string | null; issues: { level: "error" | "warning"; message: string }[] };
type Preview<R> = { file: string | null; unsupported: string[]; rows: R[] };
type Saved = { created: number; updated: number; skipped: number };

const severity = (r: PanelRow) => (r.issues.some((i) => i.level === "error") ? "error" : r.issues.length ? "warning" : "ok");

/** Teks & tautan per domain arsitektur. */
export type ImportCopy = {
  /** "probis" / "layanan". */
  noun: string;
  /** Nama workbook template, mis. "Domain Arsitektur Proses Bisnis". */
  workbook: string;
  /** Nama sheet data, mis. "Proses Bisnis". */
  sheet: string;
  hint: string;
  template: string;
  exportHref: string;
  listHref: string;
};

/** Impor template arsitektur (.xlsx / .zip) dengan pratinjau dan validasi per baris, serta ekspor. Generik untuk tiap domain. */
export function ImportPanel<R extends PanelRow>({
  canImport,
  canExport,
  copy,
  preview: previewImport,
  commit: commitImport,
  refColumn,
}: {
  canImport: boolean;
  canExport: boolean;
  copy: ImportCopy;
  preview: (form: FormData) => Promise<ActionResult<Preview<R>>>;
  commit: (rows: R[], options: { status: "draft" | "submitted"; update: boolean }) => Promise<ActionResult<Saved>>;
  /** Kolom referensi di pratinjau (mis. RAB 3 / RAL 3). */
  refColumn: { header: string; cell: (row: R) => React.ReactNode; search: (row: R) => string };
}) {
  const [preview, setPreview] = useState<Preview<R> | null>(null);
  const [status, setStatus] = useState<"draft" | "submitted">("draft");
  const [update, setUpdate] = useState(false);
  const [result, setResult] = useState<Saved | null>(null);
  const [dragging, setDragging] = useState(false);
  const [reading, startReading] = useTransition();
  const [saving, startSaving] = useTransition();
  const input = useRef<HTMLInputElement>(null);
  const drop = useRef<HTMLLabelElement>(null);

  useGSAP(
    () => {
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.to("[data-float]", { y: -6, duration: 1.6, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    },
    { scope: drop },
  );

  const read = (file: File | undefined) => {
    if (!file) return;
    setResult(null);
    startReading(async () => {
      const form = new FormData();
      form.set("file", file);
      const response = await previewImport(form);
      if (!response.ok) return void toast.error(response.error);
      setPreview(response.data);
      if (!response.data.file) toast.warning(`Workbook ${copy.sheet} tidak ditemukan di dalam berkas.`);
    });
  };

  const rows = preview?.rows ?? [];
  const valid = rows.filter((r) => severity(r) !== "error");
  const warnings = rows.filter((r) => severity(r) === "warning").length;
  const errors = rows.length - valid.length;

  const save = () =>
    startSaving(async () => {
      const response = await commitImport(rows, { status, update });
      if (!response.ok) return void toast.error(response.error);
      setResult(response.data);
      setPreview(null);
      toast.success("Impor selesai", { description: `${response.data.created} baru, ${response.data.updated} diperbarui` });
    });

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="grid min-w-0 gap-5">
        {canImport && !result && (
          <Card data-reveal>
            <CardHeader>
              <CardTitle className="section-title">Impor template</CardTitle>
              <CardDescription>Unggah “{copy.workbook}.xlsx” atau zip paket arsitektur. {copy.hint}</CardDescription>
            </CardHeader>
            <CardContent>
              <label
                ref={drop}
                onDragOver={(e) => (e.preventDefault(), setDragging(true))}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  read(e.dataTransfer.files[0]);
                }}
                className={cn(
                  "grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition-colors duration-200",
                  dragging ? "border-brand-teal bg-brand-teal/10" : "hover:border-brand-teal/60 hover:bg-muted/50",
                  reading && "pointer-events-none opacity-70",
                )}
              >
                <span data-float className="grid size-10 place-items-center rounded-xl bg-accent text-accent-foreground">
                  <Icon icon={FileImportIcon} size={18} />
                </span>
                <span className="font-semibold">{reading ? "Membaca berkas…" : "Tarik berkas ke sini atau klik untuk memilih"}</span>
                <span className="text-xs text-muted-foreground">.xlsx atau .zip · maks. 12 MB</span>
                <input ref={input} type="file" accept=".xlsx,.zip" className="sr-only" onChange={(e) => (read(e.target.files?.[0]), (e.target.value = ""))} />
              </label>
            </CardContent>
          </Card>
        )}

        {result && (
          <Card data-reveal>
            <EmptyState illustration="success" title="Impor berhasil" description={`${result.created} ${copy.noun} baru, ${result.updated} diperbarui, ${result.skipped} dilewati.`}>
              <Button asChild>
                <Link href={copy.listHref}>Lihat daftar</Link>
              </Button>
              <Button variant="outline" onClick={() => setResult(null)}>Impor lagi</Button>
            </EmptyState>
          </Card>
        )}

        {preview && (
          <>
            {preview.unsupported.length > 0 && (
              <Banner variant="info" label="Info">
                Domain lain dalam zip belum didukung dan dilewati: {preview.unsupported.join(", ")}.
              </Banner>
            )}
            {!rows.length ? (
              <Card>
                <EmptyState
                  title={preview.file ? "Template masih kosong" : `Workbook ${copy.sheet} tidak ditemukan`}
                  description={preview.file ? `Berkas “${preview.file.split("/").pop()}” terbaca, tetapi belum ada baris data di sheet ${copy.sheet}.` : `Pastikan zip berisi “${copy.workbook}.xlsx”.`}
                />
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="Baris terbaca" value={rows.length} />
                  <Stat label="Siap diimpor" value={valid.length} tone="ok" />
                  <Stat label="Peringatan" value={warnings} tone="warning" />
                  <Stat label="Galat" value={errors} tone="error" />
                </div>
                <DataTable
                  title="Pratinjau"
                  description={preview.file?.split("/").pop()}
                  rows={rows}
                  rowId={(r) => String(r.line)}
                  searchText={(r) => `${r.name} ${r.opdRaw ?? ""} ${refColumn.search(r)}`}
                  searchPlaceholder="Cari baris"
                  pageSize={15}
                  minWidth={900}
                  columns={[
                    { header: "Baris", className: "w-16", sortValue: (r) => r.line, cell: (r) => <span className="text-muted-foreground tabular-nums">{r.line}</span> },
                    { header: "Cek", sortValue: (r) => severity(r), cell: (r) => <Severity row={r} /> },
                    { header: "Nama", sortValue: (r) => r.name, cell: (r) => <span className="font-semibold">{r.name || "—"}</span> },
                    { header: "Unit kerja", cell: (r) => (r.opd ? pdByCode.get(r.opd)?.name : <span className="text-destructive">{r.opdRaw ?? "—"}</span>) },
                    { header: refColumn.header, cell: refColumn.cell },
                    {
                      header: "Catatan",
                      cell: (r) => (
                        <ul className="grid gap-0.5 text-xs">
                          {r.issues.map((i) => (
                            <li key={i.message} className={i.level === "error" ? "text-destructive" : "text-muted-foreground"}>{i.message}</li>
                          ))}
                        </ul>
                      ),
                    },
                  ]}
                />
                <Card data-reveal className="flex-row flex-wrap items-center gap-4 p-4">
                  <Segmented
                    label="Status awal"
                    className="w-auto"
                    value={status}
                    onChange={setStatus}
                    options={[
                      { value: "draft", label: "Simpan sebagai draf" },
                      { value: "submitted", label: "Langsung ajukan" },
                    ]}
                  />
                  <Label className="flex items-center gap-2 text-sm font-normal">
                    <Checkbox checked={update} onCheckedChange={(v) => setUpdate(v === true)} />
                    Perbarui {copy.noun} dengan ID yang sudah ada
                  </Label>
                  <div className="ml-auto flex gap-2">
                    <Button variant="ghost" onClick={() => setPreview(null)}>Batal</Button>
                    <Button loading={saving} disabled={!valid.length} onClick={save}>
                      Impor {valid.length} baris
                    </Button>
                  </div>
                </Card>
              </>
            )}
          </>
        )}
      </div>

      <Card data-reveal className="gap-3 xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Template & ekspor</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <Illustration name="explore" className="mx-auto mb-2 w-36" />
          <Button asChild variant="outline" className="justify-start">
            <a href={copy.template} download={`${copy.workbook}.xlsx`}>
              <Icon icon={FileDownloadIcon} size={16} />
              Unduh template kosong
            </a>
          </Button>
          {canExport && (
            <Button asChild className="justify-start">
              <a href={copy.exportHref}>
                <Icon icon={Download04Icon} size={16} />
                Ekspor data (format template)
              </a>
            </Button>
          )}
        </CardContent>
      </Card>
    </Reveal>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warning" | "error" }) {
  return (
    <Card className={cn("gap-1 p-4", tone === "ok" && "bg-brand-teal/10", tone === "warning" && "bg-warning-soft", tone === "error" && value > 0 && "bg-destructive/10")}>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-2xl font-bold"><CountUp value={value} /></p>
    </Card>
  );
}

function Severity({ row }: { row: PanelRow }) {
  const s = severity(row);
  return (
    <Badge variant={s === "error" ? "destructive" : s === "warning" ? "warning" : "success"}>
      {s === "error" ? "Galat" : s === "warning" ? "Cek" : "Siap"}
    </Badge>
  );
}
