"use client";
import { useState, useTransition } from "react";
import { Add01Icon, Delete02Icon, Edit02Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createRole, deleteRole, resetRoleAccess, saveRoleAccess, updateRole } from "@/app/cms/pengaturan/actions";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { RoleGrant } from "@/lib/pengguna/grants";
import { defaultsFor, lockedRole, permissionCatalog, type Permission } from "@/lib/permissions";
import type { Role } from "@/lib/types";
import { cn } from "@/lib/utils";

const groups = [...new Set(permissionCatalog.map((p) => p.group))];
const same = (a: Permission[], b: Permission[]) => a.length === b.length && a.every((p) => b.includes(p));
const NONE = "__none";

/** Atur hak akses tiap peran, termasuk peran kustom; Superadmin selalu memegang semua izin. */
export function AccessMatrix({ grants, users }: { grants: RoleGrant[]; users: Record<string, number> }) {
  const [selected, setSelected] = useState<Role>(grants[0]!.key);
  const [drafts, setDrafts] = useState<Partial<Record<Role, Permission[]>>>({});
  const [dialog, setDialog] = useState<"new" | "edit" | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  // Peran terpilih bisa hilang setelah dihapus: kembali ke peran pertama.
  const info = grants.find((g) => g.key === selected) ?? grants[0]!;
  const role = info.key;
  const saved = (r: Role) => grants.find((g) => g.key === r)!;
  const current = (r: Role) => drafts[r] ?? saved(r).perms;
  const dirty = (r: Role) => !!drafts[r] && !same(drafts[r]!, saved(r).perms);
  const locked = role === lockedRole;
  const perms = current(role);
  const count = users[role] ?? 0;

  const toggle = (p: Permission, on: boolean) =>
    setDrafts((d) => ({ ...d, [role]: on ? [...current(role), p] : current(role).filter((x) => x !== p) }));

  const discard = (r: Role) =>
    setDrafts((d) => {
      const next = { ...d };
      delete next[r];
      return next;
    });

  const save = () =>
    startTransition(async () => {
      const result = await saveRoleAccess(role, perms);
      if (!result.ok) return void toast.error(result.error);
      discard(role);
      toast.success(`Hak akses ${info.label} disimpan`, { description: "Berlaku pada halaman berikutnya yang dibuka pengguna peran ini." });
    });

  const restore = () =>
    startTransition(async () => {
      const result = await resetRoleAccess(role);
      if (!result.ok) return void toast.error(result.error);
      discard(role);
      toast.success(`Hak akses ${info.label} kembali ke bawaan`);
    });

  const remove = () =>
    startTransition(async () => {
      const result = await deleteRole(role);
      setConfirmDelete(false);
      if (!result.ok) return void toast.error(result.error);
      discard(role);
      setSelected(grants[0]!.key);
      toast.success(`Peran ${info.label} dihapus`);
    });

  return (
    <Reveal className="grid gap-5 lg:grid-cols-[18rem_minmax(0,1fr)] lg:items-start">
      <Card data-reveal className="gap-0 py-2 lg:sticky lg:top-20">
        <div className="px-3 pb-2">
          <Button variant="teal" className="w-full" onClick={() => setDialog("new")}>
            <Icon icon={Add01Icon} size={16} />
            Tambah peran
          </Button>
        </div>
        <ul role="listbox" aria-label="Peran">
          {grants.map((g) => (
            <li key={g.key}>
              <button
                type="button"
                role="option"
                aria-selected={g.key === role}
                onClick={() => {
                  setSelected(g.key);
                  setConfirmDelete(false);
                }}
                className={cn(
                  "grid w-full gap-0.5 px-4 py-2.5 text-left transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:outline-none",
                  g.key === role && "bg-brand-teal/10 hover:bg-brand-teal/15",
                )}
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span className="min-w-0 flex-1 truncate">{g.label}</span>
                  {dirty(g.key) ? (
                    <Badge variant="warning">Belum disimpan</Badge>
                  ) : !g.builtin ? (
                    <Badge variant="info">Kustom</Badge>
                  ) : (
                    g.custom && <Badge variant="muted">Diubah</Badge>
                  )}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {current(g.key).length}/{permissionCatalog.length} izin · {users[g.key] ?? 0} akun
                </span>
              </button>
            </li>
          ))}
        </ul>
      </Card>

      <Card data-reveal>
        <CardHeader className="flex flex-wrap items-start gap-3">
          <div className="min-w-0 flex-1">
            <CardTitle className="section-title">{info.label}</CardTitle>
            <CardDescription>{locked ? "Superadmin selalu memegang semua hak akses." : (info.description ?? "Centang hak akses peran ini.")}</CardDescription>
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-2">
              {!info.builtin && !dirty(role) && (
                <>
                  <Button variant="ghost" size="sm" disabled={pending} onClick={() => setDialog("edit")}>
                    <Icon icon={Edit02Icon} size={14} />
                    Ubah nama
                  </Button>
                  <Button
                    variant={confirmDelete ? "destructive" : "ghost"}
                    size="sm"
                    disabled={pending || count > 0}
                    title={count ? `Masih dipakai ${count} akun` : undefined}
                    onClick={() => (confirmDelete ? remove() : setConfirmDelete(true))}
                    onBlur={() => setConfirmDelete(false)}
                  >
                    <Icon icon={Delete02Icon} size={14} />
                    {confirmDelete ? "Yakin hapus?" : "Hapus"}
                  </Button>
                </>
              )}
              {info.builtin && info.custom && !dirty(role) && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={restore}>
                  Kembalikan bawaan
                </Button>
              )}
              {dirty(role) && (
                <Button variant="ghost" size="sm" disabled={pending} onClick={() => discard(role)}>
                  Batal
                </Button>
              )}
              <Button size="sm" loading={pending} disabled={!dirty(role)} onClick={save}>
                Simpan
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="grid gap-6">
          {groups.map((group) => (
            <fieldset key={group} className="grid gap-1">
              <legend className="eyebrow mb-2">{group}</legend>
              {permissionCatalog
                .filter((p) => p.group === group)
                .map((p) => {
                  const on = perms.includes(p.key);
                  const changed = on !== saved(role).perms.includes(p.key);
                  return (
                    <label
                      key={p.key}
                      className={cn("flex items-start gap-3 rounded-lg px-3 py-2 transition-colors", !locked && "cursor-pointer hover:bg-muted", changed && "bg-brand-yellow/20")}
                    >
                      <Checkbox className="mt-0.5" checked={on} disabled={locked || pending} onCheckedChange={(v) => toggle(p.key, v === true)} />
                      <span className="grid gap-0.5">
                        <span className="text-sm font-medium">{p.label}</span>
                        {"hint" in p && <span className="text-xs text-muted-foreground">{p.hint}</span>}
                      </span>
                      {!locked && info.builtin && on !== defaultsFor(role).includes(p.key) && (
                        <Badge variant="muted" className="ml-auto shrink-0">{on ? "Ditambah" : "Dicabut"}</Badge>
                      )}
                    </label>
                  );
                })}
            </fieldset>
          ))}
        </CardContent>
      </Card>

      {dialog && (
        <RoleDialog
          key={dialog === "new" ? "new" : role}
          role={dialog === "edit" ? info : null}
          roles={grants}
          initial={role}
          onClose={() => setDialog(null)}
          onCreated={(key) => {
            setSelected(key);
            setDialog(null);
          }}
        />
      )}
    </Reveal>
  );
}

/** Tambah peran kustom (izin bisa disalin dari peran lain) atau ubah nama & keterangannya. */
function RoleDialog({
  role,
  roles,
  initial,
  onClose,
  onCreated,
}: {
  role: RoleGrant | null;
  roles: RoleGrant[];
  initial: Role;
  onClose: () => void;
  onCreated: (key: Role) => void;
}) {
  const [label, setLabel] = useState(role?.label ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [copyFrom, setCopyFrom] = useState<string>(initial === lockedRole ? NONE : initial);
  const [pending, startTransition] = useTransition();

  const submit = () =>
    startTransition(async () => {
      if (role) {
        const result = await updateRole(role.key, { label, description });
        if (!result.ok) return void toast.error(result.error);
        toast.success(`Peran ${label.trim()} disimpan`);
        return onClose();
      }
      const result = await createRole({ label, description, copyFrom: copyFrom === NONE ? null : copyFrom });
      if (!result.ok) return void toast.error(result.error);
      toast.success(`Peran ${label.trim()} ditambahkan`, { description: "Atur hak aksesnya, lalu pilih peran ini di Akun Pengguna." });
      onCreated(result.data.key);
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{role ? "Ubah peran" : "Tambah peran"}</DialogTitle>
          {!role && <DialogDescription>Peran baru bisa langsung dipilih saat membuat atau mengubah akun.</DialogDescription>}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <Field>
            <FieldLabel htmlFor="role-label">Nama peran</FieldLabel>
            <Input id="role-label" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="mis. Auditor Inspektorat" maxLength={60} autoFocus required />
          </Field>
          <Field>
            <FieldLabel htmlFor="role-description">Keterangan (opsional)</FieldLabel>
            <Textarea id="role-description" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} maxLength={200} />
          </Field>
          {!role && (
            <Field>
              <FieldLabel htmlFor="role-copy">Salin hak akses dari</FieldLabel>
              <Select value={copyFrom} onValueChange={setCopyFrom}>
                <SelectTrigger id="role-copy" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Mulai tanpa izin</SelectItem>
                  {roles.map((r) => (
                    <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={pending} disabled={label.trim().length < 3}>{role ? "Simpan" : "Tambah peran"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
