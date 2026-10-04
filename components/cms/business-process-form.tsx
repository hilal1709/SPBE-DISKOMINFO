"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Download04Icon, FloppyDiskIcon, SentIcon } from "@hugeicons/core-free-icons";
import { PageHeader } from "@/components/blocks/page-header";
import { Icon } from "@/components/icon";
import { Illustration } from "@/components/illustrations/illustration";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { opdList, rabList } from "@/lib/demo-data";

function Choice({ id, options, defaultValue }: { id: string; options: string[]; defaultValue?: string }) {
  return (
    <Select defaultValue={defaultValue ?? options[0]}>
      <SelectTrigger id={id} className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

function Required() {
  return <span aria-hidden className="text-primary">*</span>;
}

/** Formulir input Proses Bisnis SPBE di CMS. */
export function BusinessProcessForm() {
  const [pending, setPending] = useState<"draft" | "submit" | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const run = (kind: "draft" | "submit") => {
    setPending(kind);
    setTimeout(() => {
      setPending(null);
      if (kind === "draft") toast.success("Draf berhasil disimpan", { description: "Anda dapat melanjutkannya kapan saja." });
      else setSubmitted(true);
    }, 900);
  };

  return (
    <Reveal className="grid gap-6">
      <PageHeader
        eyebrow="CMS SPBE / Domain Proses Bisnis"
        title="Input proses bisnis"
        description="Entri dan kelola data arsitektur Proses Bisnis SPBE."
        actions={
          <>
            <Button variant="outline" className="hidden sm:inline-flex">
              <Icon icon={Download04Icon} size={16} />
              Export
            </Button>
            <Button variant="outline" loading={pending === "draft"} onClick={() => run("draft")}>
              {pending !== "draft" && <Icon icon={FloppyDiskIcon} size={16} />}
              Simpan draf
            </Button>
          </>
        }
      />

      <Card data-reveal className="gap-0 py-0">
        <CardHeader className="border-b bg-accent/50 py-5">
          <CardTitle>Form input proses bisnis SPBE</CardTitle>
          <CardDescription>Lengkapi detail sesuai standar Arsitektur SPBE Nasional.</CardDescription>
          <CardAction className="self-center">
            <Badge variant="secondary">Mode entri aktif</Badge>
          </CardAction>
        </CardHeader>

        <form
          onSubmit={(event) => {
            event.preventDefault();
            run("submit");
          }}
        >
          <CardContent className="py-6">
            <FieldGroup className="gap-8">
              <FieldSet>
                <FieldLegend className="section-title">Unit organisasi & identitas</FieldLegend>
                <div className="grid gap-4 md:grid-cols-[1fr_240px]">
                  <Field>
                    <FieldLabel htmlFor="opd">Perangkat Daerah <Required /></FieldLabel>
                    <Choice id="opd" options={opdList} />
                    <FieldDescription>OPD yang bertanggung jawab atas proses bisnis.</FieldDescription>
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="kode">ID proses bisnis</FieldLabel>
                    <Input id="kode" value="PRB-2825-005" readOnly className="bg-muted font-semibold" />
                    <FieldDescription>Dibuat otomatis oleh sistem.</FieldDescription>
                  </Field>
                </div>
                <Field>
                  <FieldLabel htmlFor="nama">Nama proses bisnis <Required /></FieldLabel>
                  <Input id="nama" required defaultValue="Penyusunan Kebijakan dan Standardisasi Layanan SPBE Terpadu" />
                </Field>
                <Field>
                  <FieldLabel htmlFor="iku">Indikator Kinerja Utama <Required /></FieldLabel>
                  <Choice id="iku" options={["Indeks SPBE", "Indeks Sistem Merit", "Indeks Kepuasan Masyarakat"]} />
                  <FieldDescription>Dipakai untuk memantau capaian target.</FieldDescription>
                </Field>
              </FieldSet>

              <div className="rounded-xl border border-primary/30 bg-accent/40 p-5">
                <FieldSet>
                  <FieldLegend className="section-title">Referensi Arsitektur Bisnis (RAB) multi-level</FieldLegend>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Field>
                      <FieldLabel htmlFor="rab1">RAB Level 1 (sektor)</FieldLabel>
                      <Choice id="rab1" options={["RAB.01 Ekonomi dan Industri", "RAB.04 Pemerintahan Umum"]} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rab2">RAB Level 2 (urusan)</FieldLabel>
                      <Choice id="rab2" options={rabList} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="rab3">RAB Level 3 (sub urusan)</FieldLabel>
                      <Choice id="rab3" options={["RAB.04.01.01 Pemerintahan Daerah", "RAB.05.03.01 Pendidikan Dasar"]} />
                    </Field>
                  </div>
                </FieldSet>
              </div>

              <FieldSet>
                <FieldLegend className="section-title">Uraian & sasaran</FieldLegend>
                <Field>
                  <FieldLabel htmlFor="uraian">Uraian proses bisnis <Required /></FieldLabel>
                  <Textarea
                    id="uraian"
                    className="min-h-32"
                    defaultValue="Proses bisnis ini mencakup tahapan penyusunan kebijakan tata kelola SPBE, harmonisasi bersama tim koordinasi SPBE Kabupaten Gresik, audit arsitektur sistem informasi OPD, hingga penetapan standar operasional prosedur integrasi data pemerintahan daerah melalui Diskominfo."
                  />
                  <FieldDescription>Jelaskan alur kerja, SOP, dan keluaran layanan.</FieldDescription>
                </Field>
                <Field>
                  <FieldLabel htmlFor="sasaran">Sasaran strategis (RPJMD / Renstra)</FieldLabel>
                  <Textarea
                    id="sasaran"
                    defaultValue="Meningkatkan kualitas tata kelola pemerintahan yang efektif, bersih, dan akuntabel berbasis SPBE terpadu di Kabupaten Gresik."
                  />
                </Field>
              </FieldSet>
            </FieldGroup>
          </CardContent>

          <CardFooter className="flex-wrap justify-between gap-3 py-4">
            <p className="text-xs text-muted-foreground">Format sesuai Peraturan MenPAN-RB No. 19/2018.</p>
            <div className="flex gap-2">
              <Button asChild variant="ghost"><Link href="/cms">Batal</Link></Button>
              <Button type="submit" loading={pending === "submit"} className="group">
                {pending !== "submit" && <Icon icon={SentIcon} size={16} className="transition-transform duration-300 ease-(--ease-out) group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />}
                Ajukan untuk verifikasi
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>

      <Dialog open={submitted} onOpenChange={setSubmitted}>
        <DialogContent className="text-center sm:max-w-sm" showCloseButton={false}>
          <Illustration name="success" loop={false} className="mx-auto w-36" />
          <DialogTitle className="text-lg font-bold">Proses bisnis diajukan</DialogTitle>
          <DialogDescription>Usulan masuk ke antrean verifikasi Bagian Organisasi. Anda akan diberi tahu jika ada catatan revisi.</DialogDescription>
          <DialogFooter className="mt-2 sm:justify-center">
            <Button variant="outline" onClick={() => setSubmitted(false)}>Tetap di sini</Button>
            <Button asChild><Link href="/cms">Ke beranda CMS</Link></Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}
