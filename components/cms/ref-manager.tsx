"use client";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useRef, useState, useTransition } from "react";
import { Add01Icon, ArrowRight01Icon, CheckmarkBadge01Icon, Copy01Icon, Delete02Icon, PencilEdit02Icon, Search01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { addRefNode, createRefVersion, deleteRefNode, deleteRefVersion, publishRefVersion, setRefNodeStatus, updateRefNode } from "@/app/cms/actions";
import { Banner } from "@/components/blocks/banner";
import { EmptyState } from "@/components/blocks/empty-state";
import { Icon } from "@/components/icon";
import { MOTION_OK, gsap, useGSAP } from "@/components/motion/gsap";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { ManagedNode, RefChange, RefKind, VersionInfo } from "@/lib/reference/versioned";
import { cn } from "@/lib/utils";

const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });
const ROOT = "__root";

/** Teks per jenis referensi: RAB (dipakai probis) dan RAL (dipakai layanan). */
const kinds = {
  rab: { ref: "RAB", unit: "probis", Unit: "Probis", root: "Sektor (L1)", rootTitle: "Tambah sektor (Level 1)", basePath: "/cms/pengaturan/referensi-rab" },
  ral: { ref: "RAL", unit: "layanan", Unit: "Layanan", root: "Jenis (L1)", rootTitle: "Tambah jenis layanan (Level 1)", basePath: "/cms/pengaturan/referensi-ral" },
} as const;
type KindText = (typeof kinds)[RefKind];

const actionLabel = (t: KindText): Record<string, string> => ({
  buat_versi: "Versi dibuat",
  tambah: `${t.ref} ditambah`,
  ubah_nama: "Nama diubah",
  ubah_kode: "Kode diubah",
  pindah_induk: "Induk dipindah",
  nonaktif: "Ditandai tidak berlaku",
  hapus: `${t.ref} dihapus`,
  aktifkan: "Diberlakukan lagi",
  terbit: "Versi diterbitkan",
  pakai_periode: "Dipakai periode",
});

type Editing = { mode: "edit"; node: ManagedNode } | { mode: "add"; parent: ManagedNode | null } | null;

/**
 * Pengelola referensi berversi (RAB atau RAL). Versi draf bebas diubah (kode, nama, induk, status);
 * versi terbit hanya koreksi nama. Versi dipakai periode lewat halaman Periode Arsitektur.
 */
export function RefManager({ kind, versions, current, nodes, changes }: { kind: RefKind; versions: VersionInfo[]; current: VersionInfo; nodes: ManagedNode[]; changes: RefChange[] }) {
  const t = kinds[kind];
  const labels = actionLabel(t);
  const router = useRouter();
  const draft = current.status === "draft";
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [opened, setOpened] = useState<string | null>(null);
  const [editing, setEditing] = useState<Editing>(null);
  const [copying, setCopying] = useState(false);
  const [confirm, setConfirm] = useState<"publish" | "delete" | null>(null);
  const [pending, start] = useTransition();
  const body = useRef<HTMLTableSectionElement>(null);

  const children = useMemo(() => {
    const map = new Map<string, ManagedNode[]>();
    for (const n of nodes) map.set(n.parentId ?? ROOT, [...(map.get(n.parentId ?? ROOT) ?? []), n]);
    return map;
  }, [nodes]);

  // Saat mencari: tampilkan node yang cocok beserta leluhurnya, semua terbuka.
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return null;
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const keep = new Set<string>();
    for (const n of nodes) {
      if (!`${n.code} ${n.name}`.toLowerCase().includes(q)) continue;
      for (let cur: ManagedNode | undefined = n; cur; cur = cur.parentId ? byId.get(cur.parentId) : undefined) keep.add(cur.id);
    }
    return keep;
  }, [nodes, query]);

  useGSAP(
    () => {
      if (!opened) return;
      gsap.matchMedia().add(MOTION_OK, () => {
        gsap.from(`tr[data-parent="${opened}"]`, { opacity: 0, x: -10, duration: 0.3, stagger: 0.02, clearProps: "all" });
      });
    },
    { dependencies: [opened], scope: body },
  );

  const toggle = (id: string) => {
    const opening = !open.has(id);
    setOpen((s) => {
      const next = new Set(s);
      if (opening) next.add(id);
      else next.delete(id);
      return next;
    });
    setOpened(opening ? id : null);
  };

  const act = <T,>(task: () => Promise<{ ok: true; data: T } | { ok: false; error: string }>, success: string, after?: (data: T) => void) =>
    start(async () => {
      const result = await task();
      if (!result.ok) return void toast.error(result.error);
      const warnings = (result.data as { warnings?: string[] } | undefined)?.warnings;
      toast.success(success, warnings?.length ? { description: warnings.join(" ") } : undefined);
      after?.(result.data);
    });

  const rows = (parentId: string, depth: number): React.ReactNode =>
    (children.get(parentId) ?? [])
      .filter((n) => !visible || visible.has(n.id))
      .map((n) => {
        const hasChildren = children.has(n.id);
        const isOpen = !!visible || open.has(n.id);
        const inactive = n.status === "tidak_berlaku";
        return (
          <Fragment key={n.id}>
            <tr data-parent={parentId} className={cn("group/row border-b transition-colors last:border-0 hover:bg-muted/50", n.level === 1 && "bg-muted/30 font-semibold", inactive && "opacity-60")}>
              <td className="py-2 pr-2" style={{ paddingLeft: `${depth * 1.25 + 0.5}rem` }}>
                <div className="flex items-start gap-1.5">
                  {hasChildren ? (
                    <Button variant="ghost" size="icon-xs" aria-expanded={isOpen} aria-label={`${isOpen ? "Tutup" : "Buka"} ${n.name}`} onClick={() => toggle(n.id)} className="-mt-0.5 shrink-0">
                      <Icon icon={ArrowRight01Icon} size={14} className={cn("transition-transform duration-200", isOpen && "rotate-90")} />
                    </Button>
                  ) : (
                    <span className="w-6 shrink-0" />
                  )}
                  <div className="min-w-0 text-xs">
                    <span className="mr-1.5 font-medium whitespace-nowrap text-muted-foreground tabular-nums">{n.code}</span>
                    <span className={cn(n.level > 1 && "font-normal", inactive && "line-through")}>{n.name}</span>
                    {inactive && <Badge variant="destructive" className="ml-2">tidak berlaku</Badge>}
                    {n.originCode && n.originCode !== n.code && <span className="ml-2 text-[11px] text-muted-foreground">(dulu {n.originCode})</span>}
                  </div>
                </div>
              </td>
              <td className="hidden py-2 pr-3 text-[11px] text-muted-foreground sm:table-cell">L{n.level}</td>
              <td className="py-2 pr-3 text-right text-xs text-muted-foreground tabular-nums">{n.used || "—"}</td>
              <td className="py-1.5 pr-2">
                <div className="flex justify-end gap-0.5 opacity-60 transition-opacity group-hover/row:opacity-100">
                  <Button variant="ghost" size="icon-xs" aria-label={`Ubah ${n.code}`} onClick={() => setEditing({ mode: "edit", node: n })}>
                    <Icon icon={PencilEdit02Icon} size={13} />
                  </Button>
                  {draft && n.level < 5 && (
                    <Button variant="ghost" size="icon-xs" aria-label={`Tambah turunan ${n.code}`} onClick={() => setEditing({ mode: "add", parent: n })}>
                      <Icon icon={Add01Icon} size={13} />
                    </Button>
                  )}
                </div>
              </td>
            </tr>
            {isOpen && rows(n.id, depth + 1)}
          </Fragment>
        );
      });

  return (
    <Reveal className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
      <div className="grid min-w-0 gap-5">
        <Card data-reveal className="flex-row flex-wrap items-center gap-3 p-4">
          <Select value={current.id} onValueChange={(id) => router.push(`${t.basePath}?versi=${id}`)}>
            <SelectTrigger className="h-auto min-w-64 flex-1 py-2" aria-label={`Versi ${t.ref}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {versions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  <span className="font-semibold">{v.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {v.status === "draft" ? "· draf" : "· terbit"}
                    {v.periods.length > 0 && ` · dipakai ${v.periods.join(", ")}`}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant={draft ? "warning" : "success"}>{draft ? "Draf" : "Terbit"}</Badge>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCopying(true)}>
              <Icon icon={Copy01Icon} size={16} />
              Buat versi baru dari ini
            </Button>
            {draft && (
              <>
                <Button variant="ghost" disabled={current.periods.length > 0} onClick={() => setConfirm("delete")}>
                  <Icon icon={Delete02Icon} size={16} />
                  Hapus draf
                </Button>
                <Button onClick={() => setConfirm("publish")}>
                  <Icon icon={CheckmarkBadge01Icon} size={16} />
                  Terbitkan
                </Button>
              </>
            )}
          </div>
        </Card>

        {draft ? (
          <Banner variant="warning" label="Draf" dismissible={false}>
            Ubah kode, nama, induk, atau tandai {t.ref} tidak berlaku di sini. Setelah diterbitkan, pakai versi ini untuk periode di <b>Periode Arsitektur</b>: {t.ref} setiap {t.unit} dipetakan otomatis.
          </Banner>
        ) : (
          <Banner variant="info" label="Terbit" dismissible={false}>
            Versi terbit hanya bisa dikoreksi namanya agar periode {current.periods.join(", ") || "yang memakainya"} tetap konsisten. Untuk mengubah kode, induk, atau status, buat versi baru.
          </Banner>
        )}

        <Card data-reveal className="gap-3">
          <CardHeader className="flex flex-wrap items-center gap-3">
            <CardTitle className="section-title">Pohon {t.ref}</CardTitle>
            <InputGroup className="ml-auto sm:w-72">
              <InputGroupAddon>
                <Icon icon={Search01Icon} size={16} />
              </InputGroupAddon>
              <InputGroupInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Cari kode atau nama" aria-label={`Cari ${t.ref}`} />
            </InputGroup>
            {draft && (
              <Button variant="outline" size="sm" onClick={() => setEditing({ mode: "add", parent: null })}>
                <Icon icon={Add01Icon} size={14} />
                {t.root}
              </Button>
            )}
          </CardHeader>
          <CardContent className="max-h-[38rem] overflow-y-auto px-3">
            {nodes.length ? (
              <table className="w-full text-left">
                <thead className="sticky top-0 z-10 bg-card text-[11px] tracking-wide text-muted-foreground uppercase">
                  <tr className="border-b">
                    <th className="py-2 pl-2 font-semibold">Kode & nama</th>
                    <th className="hidden py-2 font-semibold sm:table-cell">Level</th>
                    <th className="py-2 pr-3 text-right font-semibold">{t.Unit}</th>
                    <th className="w-16"><span className="sr-only">Aksi</span></th>
                  </tr>
                </thead>
                <tbody ref={body}>{rows(ROOT, 0)}</tbody>
              </table>
            ) : (
              <EmptyState size="sm" title={`Versi ini belum berisi ${t.ref}`} />
            )}
            {visible && visible.size === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Tidak ada {t.ref} yang cocok.</p>}
          </CardContent>
        </Card>
      </div>

      <Card data-reveal className="gap-3 xl:sticky xl:top-20">
        <CardHeader>
          <CardTitle className="section-title">Riwayat perubahan</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[36rem] overflow-y-auto">
          {changes.length ? (
            <ol className="relative grid gap-3 border-l pl-4">
              {changes.map((c) => (
                <li key={c.id} className="relative text-xs">
                  <span aria-hidden className="absolute top-1 -left-[1.3rem] size-2.5 rounded-full border-2 border-card bg-brand-teal" />
                  <p className="font-semibold">{labels[c.action] ?? c.action}</p>
                  <p className="text-muted-foreground">{describe(c, t)}</p>
                  <p className="text-[11px] text-muted-foreground">{c.actorName ?? "Sistem"} · {date.format(new Date(c.createdAt))}</p>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted-foreground">Belum ada perubahan di versi ini.</p>
          )}
        </CardContent>
      </Card>

      {editing && (
        <NodeDialog
          editing={editing}
          draft={draft}
          nodes={nodes}
          text={t}
          pending={pending}
          onClose={() => setEditing(null)}
          onSave={(values) =>
            editing.mode === "edit"
              ? act(() => updateRefNode(kind, editing.node.id, values), `${t.ref} diperbarui`, () => setEditing(null))
              : act(() => addRefNode(kind, current.id, editing.parent?.id ?? null, values.code!, values.name!), `${t.ref} ditambahkan`, () => setEditing(null))
          }
          onDelete={(node) => act(() => deleteRefNode(kind, node.id), `${node.code} dihapus`, () => setEditing(null))}
          onStatus={(node) =>
            act(() => setRefNodeStatus(kind, node.id, node.status === "tidak_berlaku" ? "berlaku" : "tidak_berlaku"), node.status === "tidak_berlaku" ? `${t.ref} diberlakukan lagi` : `${t.ref} ditandai tidak berlaku`, () => setEditing(null))
          }
        />
      )}

      <CopyDialog
        open={copying}
        from={current}
        text={t}
        pending={pending}
        onClose={() => setCopying(false)}
        onCreate={(name, note) =>
          act(() => createRefVersion(kind, current.id, name, note), `Versi “${name}” dibuat`, (id) => {
            setCopying(false);
            router.push(`${t.basePath}?versi=${id}`);
          })
        }
      />

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirm === "publish" ? `Terbitkan “${current.name}”?` : `Hapus draf “${current.name}”?`}</DialogTitle>
            <DialogDescription>
              {confirm === "publish"
                ? "Setelah terbit, kode dan induk tidak bisa diubah lagi. Versi lalu bisa dipakai periode di halaman Periode Arsitektur."
                : `Seluruh ${t.ref} di draf ini dihapus. Tindakan ini tidak bisa dibatalkan.`}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setConfirm(null)}>Batal</Button>
            <Button
              variant={confirm === "delete" ? "destructive" : "default"}
              loading={pending}
              onClick={() =>
                confirm === "publish"
                  ? act(() => publishRefVersion(kind, current.id), "Versi diterbitkan", () => setConfirm(null))
                  : act(() => deleteRefVersion(kind, current.id), "Draf dihapus", () => {
                      setConfirm(null);
                      router.push(t.basePath);
                    })
              }
            >
              {confirm === "publish" ? "Terbitkan" : "Hapus"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Reveal>
  );
}

function describe(c: RefChange, t: KindText) {
  const b = c.before as Record<string, string> | null;
  const a = c.after as Record<string, string> | null;
  switch (c.action) {
    case "ubah_nama":
      return `${a?.kode}: “${b?.nama}” → “${a?.nama}”`;
    case "ubah_kode":
      return `${b?.kode} → ${a?.kode}`;
    case "pindah_induk":
      return `${a?.kode}: induk ${b?.induk ?? "—"} → ${a?.induk ?? "—"} (L${b?.level} → L${a?.level})`;
    case "tambah":
      return `${a?.kode} ${a?.nama}`;
    case "hapus":
      return `${b?.kode} ${b?.nama}`;
    case "nonaktif":
    case "aktifkan":
      return String(a?.kode ?? "");
    case "pakai_periode":
      return `Periode ${a?.periode}: ${a?.[t.unit]} ${t.unit}, ${a?.perlu_pemetaan} perlu pemetaan ulang`;
    default:
      return a?.nama ? String(a.nama) : "";
  }
}

function NodeDialog({
  editing,
  draft,
  nodes,
  text: t,
  pending,
  onClose,
  onSave,
  onStatus,
  onDelete,
}: {
  editing: NonNullable<Editing>;
  draft: boolean;
  nodes: ManagedNode[];
  text: KindText;
  pending: boolean;
  onClose: () => void;
  onSave: (values: { code?: string; name?: string; parentId?: string | null }) => void;
  onStatus: (node: ManagedNode) => void;
  onDelete: (node: ManagedNode) => void;
}) {
  const node = editing.mode === "edit" ? editing.node : null;
  const parent = editing.mode === "add" ? editing.parent : null;
  const [code, setCode] = useState(node?.code ?? (parent ? `${parent.code}.` : `${t.ref}.`));
  const [name, setName] = useState(node?.name ?? "");
  const [parentId, setParentId] = useState<string>(node?.parentId ?? ROOT);

  // Calon induk: semua node selain dirinya dan turunannya, maksimal Level 4.
  const candidates = useMemo(() => {
    if (!node) return [];
    const blocked = new Set<string>([node.id]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const n of nodes) {
        if (n.parentId && blocked.has(n.parentId) && !blocked.has(n.id)) {
          blocked.add(n.id);
          grew = true;
        }
      }
    }
    return nodes.filter((n) => !blocked.has(n.id) && n.level < 5);
  }, [node, nodes]);

  const nameOnly = !!node && !draft;
  // Hanya node baru di draf (tanpa asal versi lain, tanpa turunan, belum dipakai) yang boleh dihapus.
  const deletable = !!node && draft && !node.originCode && node.used === 0 && !nodes.some((n) => n.parentId === node.id);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const save = () =>
    onSave(
      node
        ? { name, ...(!nameOnly && { code, parentId: parentId === ROOT ? null : parentId }) }
        : { code, name },
    );

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{node ? `Ubah ${node.code}` : parent ? `Tambah turunan ${parent.code}` : t.rootTitle}</DialogTitle>
          <DialogDescription>
            {nameOnly ? "Versi terbit: hanya koreksi nama. Buat versi baru untuk mengubah kode atau induk." : `${t.Unit} yang memakai ${t.ref} ini tetap tertaut; namanya ikut berubah di versi ini.`}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="rab-code">Kode</FieldLabel>
            <Input id="rab-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} disabled={nameOnly} className="tabular-nums" />
          </Field>
          <Field>
            <FieldLabel htmlFor="rab-name">Nama</FieldLabel>
            <Textarea id="rab-name" rows={2} value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          {node && (
            <Field>
              <FieldLabel htmlFor="rab-parent">Induk</FieldLabel>
              <Select value={parentId} onValueChange={setParentId} disabled={nameOnly}>
                <SelectTrigger id="rab-parent" className="h-auto min-h-9 w-full text-left whitespace-normal">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-h-80">
                  <SelectItem value={ROOT}>Tanpa induk (Level 1)</SelectItem>
                  {candidates.map((n) => (
                    <SelectItem key={n.id} value={n.id} className="whitespace-normal">
                      <span className="text-xs text-muted-foreground tabular-nums">L{n.level} {n.code}</span> {n.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>Memindah induk mengubah level {t.ref} ini dan turunannya. {node.used > 0 && `Dipakai ${node.used} ${t.unit}.`}</FieldDescription>
            </Field>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          {node && draft ? (
            <div className="flex gap-1">
              <Button variant="ghost" onClick={() => onStatus(node)} disabled={pending}>
                {node.status === "tidak_berlaku" ? "Berlakukan lagi" : "Tandai tidak berlaku"}
              </Button>
              {deletable && (
                <Button
                  variant={confirmDelete ? "destructive" : "ghost"}
                  disabled={pending}
                  onClick={() => (confirmDelete ? onDelete(node) : setConfirmDelete(true))}
                  onBlur={() => setConfirmDelete(false)}
                >
                  <Icon icon={Delete02Icon} size={14} />
                  {confirmDelete ? "Yakin hapus?" : "Hapus"}
                </Button>
              )}
            </div>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>Batal</Button>
            <Button loading={pending} onClick={save}>Simpan</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CopyDialog({ open, from, text: t, pending, onClose, onCreate }: { open: boolean; from: VersionInfo; text: KindText; pending: boolean; onClose: () => void; onCreate: (name: string, note: string) => void }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Versi baru dari “{from.name}”</DialogTitle>
          <DialogDescription>Seluruh {t.ref} disalin sebagai draf. Setiap {t.ref} mengingat asalnya, sehingga {t.unit} bisa dipetakan otomatis saat periode memakai versi baru.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field>
            <FieldLabel htmlFor="ver-name">Nama versi</FieldLabel>
            <Input id="ver-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="mis. Perpres revisi 2027" />
          </Field>
          <Field>
            <FieldLabel htmlFor="ver-note">Catatan</FieldLabel>
            <Textarea id="ver-note" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dasar hukum atau alasan perubahan" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>Batal</Button>
          <Button loading={pending} disabled={name.trim().length < 3} onClick={() => onCreate(name, note)}>Buat draf</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
