import {
  Building03Icon, Calendar03Icon, CheckListIcon, CheckmarkBadge01Icon, ComputerIcon, CustomerService01Icon, DashboardSquare01Icon,
  Database01Icon, FileImportIcon, FlowConnectionIcon, GitCompareIcon, Idea01Icon, Layers01Icon, ListViewIcon, Route01Icon,
  ServerStack01Icon, Settings02Icon, ShieldKeyIcon, TaskAdd01Icon, TaskDone01Icon, UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@/components/icon";
import type { Role } from "@/lib/types";

export type NavItem = {
  href: string;
  label: string;
  icon: IconSvgElement;
  section: string;
  /** Peran yang boleh melihat item; kosong = semua peran. */
  roles?: Role[];
  /** Modul belum tersedia (ditandai "Segera"). */
  soon?: boolean;
  /** Penjelasan singkat fungsi menu (tampil di bawah label & di header halaman). */
  description?: string;
  /** Kunci angka lencana (mis. jumlah antrean). */
  badgeKey?: "submitted" | "verified" | "layananSubmitted" | "layananVerified" | "dataSubmitted" | "dataVerified";
};

/** Menu besar berisi sub-menu. */
export type NavGroup = { label: string; icon: IconSvgElement; children: NavItem[] };
export type NavEntry = NavItem | NavGroup;
export const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

/** Navigasi portal publik — satu entri per domain arsitektur SPBE. */
export const publicNav: NavItem[] = [
  { href: "/", label: "Proses Bisnis", icon: FlowConnectionIcon, section: "Domain Proses Bisnis" },
  { href: "/layanan", label: "Layanan", icon: CustomerService01Icon, section: "Domain Layanan" },
  { href: "/data", label: "Data", icon: Database01Icon, section: "Domain Data" },
  { href: "/aplikasi", label: "Aplikasi", icon: ComputerIcon, section: "Domain Aplikasi" },
  { href: "/domain-infrastruktur", label: "Domain Infrastruktur", icon: ServerStack01Icon, section: "Domain Infrastruktur" },
  { href: "/aplikasi-usulan", label: "Aplikasi Usulan", icon: Idea01Icon, section: "Aplikasi Usulan" },
  { href: "/peta-rencana", label: "Peta Rencana", icon: Route01Icon, section: "Peta Rencana" },
  { href: "/infrastruktur", label: "Infrastruktur", icon: Building03Icon, section: "Infrastruktur Aset" },
];

/** Halaman portal di luar menu tetap mendapat judul section yang benar. */
export const portalSections: Record<string, string> = {
  "/katalog": "Katalog Layanan",
};

const soon = (slug: string, label: string, icon: IconSvgElement, description: string): NavItem => ({ href: `/cms/segera/${slug}`, label, icon, section: label, soon: true, description });

/** Menu CMS dikelompokkan per modul. Modul dibangun bertahap (notulen): Proses Bisnis, lalu Layanan. */
export const cmsNav: NavEntry[] = [
  { href: "/cms", label: "Beranda", icon: DashboardSquare01Icon, section: "Beranda CMS", description: "Ringkasan tugas dan aktivitas terbaru Anda" },
  {
    label: "Proses Bisnis",
    icon: FlowConnectionIcon,
    children: [
      { href: "/cms/proses-bisnis", label: "Daftar Probis", icon: ListViewIcon, section: "Daftar Proses Bisnis", description: "Lihat dan kelola seluruh proses bisnis" },
      { href: "/cms/proses-bisnis/baru", label: "Tambah Probis", icon: TaskAdd01Icon, section: "Tambah Proses Bisnis", description: "Isi probis baru, dibantu AI", roles: ["operator_opd", "admin", "superadmin"] },
      { href: "/cms/proses-bisnis/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Proses Bisnis", description: "Tim Bagian Organisasi memeriksa ajuan OPD", roles: ["organisasi", "superadmin"], badgeKey: "submitted" },
      { href: "/cms/proses-bisnis/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Proses Bisnis", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", roles: ["admin", "superadmin"], badgeKey: "verified" },
      { href: "/cms/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Proses Bisnis", description: "Unggah template Excel atau unduh data", roles: ["operator_opd", "organisasi", "admin", "superadmin"] },
    ],
  },
  {
    label: "Layanan",
    icon: CustomerService01Icon,
    children: [
      { href: "/cms/layanan", label: "Daftar Layanan", icon: ListViewIcon, section: "Daftar Layanan", description: "Lihat dan kelola seluruh layanan" },
      { href: "/cms/layanan/baru", label: "Tambah Layanan", icon: TaskAdd01Icon, section: "Tambah Layanan", description: "Isi layanan baru, dibantu AI", roles: ["operator_opd", "admin", "superadmin"] },
      { href: "/cms/layanan/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Layanan", description: "Tim Bagian Organisasi memeriksa ajuan OPD", roles: ["organisasi", "superadmin"], badgeKey: "layananSubmitted" },
      { href: "/cms/layanan/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Layanan", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", roles: ["admin", "superadmin"], badgeKey: "layananVerified" },
      { href: "/cms/layanan/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Layanan", description: "Unggah template analis atau unduh data", roles: ["operator_opd", "organisasi", "admin", "superadmin"] },
    ],
  },
  {
    label: "Data",
    icon: Database01Icon,
    children: [
      { href: "/cms/data", label: "Daftar Data", icon: ListViewIcon, section: "Daftar Data", description: "Lihat dan kelola seluruh data & informasi" },
      { href: "/cms/data/baru", label: "Tambah Data", icon: TaskAdd01Icon, section: "Tambah Data", description: "Isi data baru, dibantu AI", roles: ["operator_opd", "admin", "superadmin"] },
      { href: "/cms/data/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Data", description: "Verifikator Data Diskominfo memeriksa ajuan OPD", roles: ["validator_data", "superadmin"], badgeKey: "dataSubmitted" },
      { href: "/cms/data/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Data", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", roles: ["admin", "superadmin"], badgeKey: "dataVerified" },
      { href: "/cms/data/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Data", description: "Unggah template analis atau zip arsitektur", roles: ["operator_opd", "admin", "superadmin"] },
    ],
  },
  {
    label: "Domain Arsitektur",
    icon: Layers01Icon,
    children: [
      soon("aplikasi", "Aplikasi", ComputerIcon, "Domain arsitektur aplikasi"),
      soon("infrastruktur", "Infrastruktur", ServerStack01Icon, "Domain arsitektur infrastruktur"),
      soon("keamanan", "Keamanan", ShieldKeyIcon, "Domain arsitektur keamanan"),
    ],
  },
  {
    label: "Perencanaan",
    icon: TaskDone01Icon,
    children: [
      soon("gap-analysis", "Gap Analysis", GitCompareIcon, "Analisis kesenjangan AS-IS dan target"),
      soon("peta-rencana", "Peta Rencana", Route01Icon, "Target arsitektur per tahun"),
    ],
  },
  {
    label: "Pengaturan",
    icon: Settings02Icon,
    children: [
      { href: "/cms/pengaturan/referensi-rab", label: "Referensi RAB", icon: Layers01Icon, section: "Referensi RAB", description: "Kelola versi, kode, dan nama RAB", roles: ["admin", "superadmin", "validator_data"] },
      { href: "/cms/pengaturan/referensi-ral", label: "Referensi RAL", icon: Layers01Icon, section: "Referensi RAL", description: "Kelola versi, kode, dan nama RAL", roles: ["admin", "superadmin", "validator_data"] },
      { href: "/cms/pengaturan/referensi-rad", label: "Referensi RAD", icon: Layers01Icon, section: "Referensi RAD", description: "Kelola versi, kode, dan nama RAD", roles: ["admin", "superadmin", "validator_data"] },
      { href: "/cms/pengaturan/periode", label: "Periode Arsitektur", icon: Calendar03Icon, section: "Periode Arsitektur", description: "Tambah dan aktifkan periode arsitektur", roles: ["admin", "superadmin"] },
      { ...soon("pengguna", "Pengguna", UserGroupIcon, "Kelola akun dan hak akses"), roles: ["superadmin"] },
    ],
  },
];

const allowed = (item: NavItem, role: Role) => !item.roles || item.roles.includes(role);

/** Menu sesuai peran: sub-menu disaring, menu besar tanpa isi dihapus. */
export function navFor(entries: NavEntry[], role: Role): NavEntry[] {
  return entries.flatMap((entry): NavEntry[] => {
    if (!isGroup(entry)) return allowed(entry, role) ? [entry] : [];
    const children = entry.children.filter((c) => allowed(c, role));
    return children.length ? [{ ...entry, children }] : [];
  });
}

/** Daftar datar semua item (untuk mencari menu aktif). */
export const flattenNav = (entries: NavEntry[]) => entries.flatMap((e) => (isGroup(e) ? e.children : [e]));


/** Item dengan href terpanjang yang cocok dengan pathname. */
export function activeItem(items: NavItem[], pathname: string) {
  return items
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
