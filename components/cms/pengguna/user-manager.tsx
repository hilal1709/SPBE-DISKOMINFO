"use client";
import { useState, useTransition } from "react";
import { Add01Icon, Copy01Icon, Edit02Icon, Key01Icon, MoreHorizontalIcon, UserBlock01Icon, UserCheck01Icon } from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { createAccount, resetAccountPassword, setAccountActive, updateAccount } from "@/app/cms/pengaturan/actions";
import { DataTable } from "@/components/blocks/data-table";
import { ALL, FilterBar } from "@/components/blocks/filter-bar";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/motion/reveal";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OpdOption, UserAccount } from "@/lib/pengguna/repo";
import { initials, type RoleInfo } from "@/lib/roles";
import type { Role } from "@/lib/types";

const NONE = "__none";
const date = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" });

type Form = { name: string; email: string; role: Role; opdId: string | null };
const blank: Form = { name: "", email: "", role: "operator_opd", opdId: null };

/** Kelola akun CMS: tambah, ubah peran/OPD, reset sandi, aktif/nonaktif. */
export function UserManager({ users, opds, roles, selfId }: { users: UserAccount[]; opds: OpdOption[]; roles: RoleInfo[]; selfId: string | null }) {
  const roleName = (key: Role) => roles.find((r) => r.key === key)?.label ?? key;
  const [role, setRole] = useState<string[]>([]);
  const [status, setStatus] = useState(ALL);
  const [editing, setEditing] = useState<UserAccount | "new" | null>(null);
  const [password, setPassword] = useState<{ name: string; email: string; password: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const rows = users.filter((u) => (!role.length || role.includes(u.role)) && (status === ALL || (status === "active") === u.active));

  const toggle = (u: UserAccount, active: boolean) =>
    startTransition(async () => {
      const result = await setAccountActive(u.id, active);
      if (!result.ok) return void toast.error(result.error);
      toast.success(active ? `${u.name} diaktifkan` : `${u.name} dinonaktifkan`, {
        description: active ? undefined : "Akun tidak dapat masuk dan sesi yang berjalan langsung berakhir.",
        action: { label: "Urungkan", onClick: () => startTransition(async () => void (await setAccountActive(u.id, !active))) },
      });
    });

  const reset = (u: UserAccount) =>
    startTransition(async () => {
      const result = await resetAccountPassword(u.id);
      if (!result.ok) return void toast.error(result.error);
      setPassword({ name: u.name, email: u.email, password: result.data.password });
    });

  return (
    <Reveal className="grid gap-4">
      <FilterBar
        filters={[
          { label: "Peran", wide: true, multiple: true, options: roles.map((r) => ({ value: r.key, label: r.label })), values: role, onValuesChange: setRole },
          { label: "Status", options: [{ value: "active", label: "Aktif" }, { value: "inactive", label: "Nonaktif" }], value: status, onChange: setStatus },
        ]}
      />

      <DataTable
        title="Akun"
        rows={rows}
        rowId={(u) => u.id}
        searchText={(u) => `${u.name} ${u.email} ${u.opdName ?? ""} ${roleName(u.role)}`}
        searchPlaceholder="Cari nama, email, atau OPD"
        onRowClick={setEditing}
        pageSize={20}
        minWidth={820}
        actions={
          <Button variant="teal" onClick={() => setEditing("new")}>
            <Icon icon={Add01Icon} size={16} />
            Tambah akun
          </Button>
        }
        columns={[
          {
            header: "Nama",
            sortValue: (u) => u.name,
            cell: (u) => (
              <span className="flex items-center gap-3">
                <Avatar className="size-8">
                  <AvatarFallback className="bg-brand-sky text-xs font-bold text-on-brand">{initials(u.name)}</AvatarFallback>
                </Avatar>
                <span className="grid min-w-0">
                  <span className="truncate font-semibold">
                    {u.name}
                    {u.id === selfId && <Badge variant="muted" className="ml-2 align-middle">Anda</Badge>}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                </span>
              </span>
            ),
          },
          { header: "Peran", sortValue: (u) => roleName(u.role), cell: (u) => roleName(u.role) },
          { header: "Perangkat Daerah", hideable: true, sortValue: (u) => u.opdName ?? "", cell: (u) => <span className="text-muted-foreground">{u.opdName ?? "—"}</span> },
          { header: "Status", sortValue: (u) => Number(u.active), cell: (u) => (u.active ? <Badge variant="success">Aktif</Badge> : <Badge variant="muted">Nonaktif</Badge>) },
          {
            header: "Masuk terakhir",
            hideable: true,
            sortValue: (u) => u.lastLoginAt ?? "",
            cell: (u) => <span className="whitespace-nowrap text-muted-foreground tabular-nums">{u.lastLoginAt ? date.format(new Date(u.lastLoginAt)) : "Belum pernah"}</span>,
          },
          {
            header: "Aksi",
            className: "w-12 text-right",
            cell: (u) => (
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon-sm" aria-label={`Aksi untuk ${u.name}`} disabled={pending}>
                    <Icon icon={MoreHorizontalIcon} size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem onSelect={() => setEditing(u)}>
                    <Icon icon={Edit02Icon} size={16} />
                    Ubah akun
                  </DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => reset(u)}>
                    <Icon icon={Key01Icon} size={16} />
                    Reset kata sandi
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {u.active ? (
                    <DropdownMenuItem variant="destructive" disabled={u.id === selfId} onSelect={() => toggle(u, false)}>
                      <Icon icon={UserBlock01Icon} size={16} />
                      Nonaktifkan
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onSelect={() => toggle(u, true)}>
                      <Icon icon={UserCheck01Icon} size={16} />
                      Aktifkan
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            ),
          },
        ]}
      />

      {editing && (
        <AccountDialog
          key={editing === "new" ? "new" : editing.id}
          account={editing === "new" ? null : editing}
          opds={opds}
          roles={roles}
          self={editing !== "new" && editing.id === selfId}
          onClose={() => setEditing(null)}
          onCreated={setPassword}
        />
      )}
      <PasswordDialog value={password} onClose={() => setPassword(null)} />
    </Reveal>
  );
}

function AccountDialog({
  account,
  opds,
  roles,
  self,
  onClose,
  onCreated,
}: {
  account: UserAccount | null;
  opds: OpdOption[];
  roles: RoleInfo[];
  self: boolean;
  onClose: () => void;
  onCreated: (value: { name: string; email: string; password: string }) => void;
}) {
  const [form, setForm] = useState<Form>(account ? { name: account.name, email: account.email, role: account.role, opdId: account.opdId } : blank);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }));

  const save = () =>
    startTransition(async () => {
      const result = account ? await updateAccount(account.id, form) : await createAccount(form);
      if (!result.ok) {
        setErrors(result.fields ?? {});
        return void toast.error(result.error);
      }
      onClose();
      if (result.data) onCreated(result.data);
      else toast.success(`Akun ${form.name} disimpan`, { description: "Peran dan OPD baru berlaku pada halaman berikutnya yang dibuka pengguna." });
    });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{account ? "Ubah akun" : "Tambah akun"}</DialogTitle>
          {!account && <DialogDescription>Kata sandi sementara dibuat otomatis dan ditampilkan sekali setelah disimpan.</DialogDescription>}
        </DialogHeader>
        <form
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <Field data-invalid={!!errors.name || undefined}>
            <FieldLabel htmlFor="account-name">Nama</FieldLabel>
            <Input id="account-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus aria-invalid={!!errors.name || undefined} />
            {errors.name && <FieldError>{errors.name}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.email || undefined}>
            <FieldLabel htmlFor="account-email">Email</FieldLabel>
            <Input id="account-email" type="text" inputMode="email" autoCapitalize="none" spellCheck={false} value={form.email} onChange={(e) => set("email", e.target.value)} aria-invalid={!!errors.email || undefined} />
            {errors.email && <FieldError>{errors.email}</FieldError>}
          </Field>
          <Field data-invalid={!!errors.role || undefined}>
            <FieldLabel htmlFor="account-role">Peran</FieldLabel>
            <Select value={form.role} onValueChange={(v) => set("role", v as Role)} disabled={self}>
              <SelectTrigger id="account-role" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roles.map((r) => (
                  <SelectItem key={r.key} value={r.key}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.role ? <FieldError>{errors.role}</FieldError> : self && <FieldDescription>Peran akun sendiri tidak dapat diubah.</FieldDescription>}
          </Field>
          <Field data-invalid={!!errors.opdId || undefined}>
            <FieldLabel htmlFor="account-opd">Perangkat Daerah</FieldLabel>
            <Select value={form.opdId ?? NONE} onValueChange={(v) => set("opdId", v === NONE ? null : v)}>
              <SelectTrigger id="account-opd" className="w-full" aria-invalid={!!errors.opdId || undefined}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Tidak terikat OPD</SelectItem>
                {opds.map((o) => (
                  <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.opdId ? <FieldError>{errors.opdId}</FieldError> : <FieldDescription>Wajib untuk peran yang hanya melihat data OPD-nya.</FieldDescription>}
          </Field>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose}>Batal</Button>
            <Button type="submit" loading={pending}>{account ? "Simpan" : "Tambah akun"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Kata sandi sementara hanya ditampilkan sekali. */
function PasswordDialog({ value, onClose }: { value: { name: string; email: string; password: string } | null; onClose: () => void }) {
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value.password).then(
      () => toast.success("Kata sandi disalin"),
      () => toast.error("Gagal menyalin. Salin secara manual."),
    );
  };
  return (
    <Dialog open={!!value} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Kata sandi sementara</DialogTitle>
          <DialogDescription>
            Berikan kepada {value?.name} ({value?.email}). Kata sandi ini tidak akan ditampilkan lagi dan wajib diganti saat pertama masuk.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
          <code className="flex-1 font-mono text-lg font-semibold tracking-wider select-all">{value?.password}</code>
          <Button variant="outline" size="sm" onClick={copy}>
            <Icon icon={Copy01Icon} size={14} />
            Salin
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={onClose}>Selesai</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
