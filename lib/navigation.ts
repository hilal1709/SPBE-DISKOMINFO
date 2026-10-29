import {
  Calendar03Icon, CheckListIcon, CheckmarkBadge01Icon, ComputerIcon, CustomerService01Icon, DashboardSquare01Icon,
  Database01Icon, FileImportIcon, FlowConnectionIcon, GitCompareIcon, Layers01Icon, ListViewIcon, Route01Icon,
  ServerStack01Icon, Settings02Icon, ShieldKeyIcon, Target02Icon, TaskAdd01Icon, TaskDone01Icon, UserGroupIcon, UserLock01Icon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@/components/icon";
import type { Permission } from "@/lib/permissions";

export type NavItem = {
  href: string;
  label: string;
  icon: IconSvgElement;
  section: string;
  /** Hak akses yang diperlukan (salah satu cukup); kosong = semua pengguna. */
  perm?: Permission | Permission[];
  /** Modul belum tersedia (ditandai "Segera"). */
  soon?: boolean;
  /** Wajib login (portal); ditandai gembok selama pengunjung belum masuk. */
  locked?: boolean;
  /** Penjelasan singkat fungsi menu (tampil di bawah label & di header halaman). */
  description?: string;
  /** Kunci angka lencana (mis. jumlah antrean). */
  badgeKey?:
    | "submitted" | "verified" | "layananSubmitted" | "layananVerified" | "dataSubmitted" | "dataVerified" | "aplikasiSubmitted" | "aplikasiVerified"
    | "infrastrukturSubmitted" | "infrastrukturVerified" | "keamananSubmitted" | "keamananVerified";
};

/** Menu besar berisi sub-menu. */
export type NavGroup = { label: string; icon: IconSvgElement; children: NavItem[] };
export type NavEntry = NavItem | NavGroup;
export const isGroup = (entry: NavEntry): entry is NavGroup => "children" in entry;

/** Navigasi portal publik — satu entri per domain arsitektur SPBE. */
export const publicNav: NavItem[] = [
  { href: "/", label: "Ringkasan Umum", icon: DashboardSquare01Icon, section: "Ringkasan Umum", description: "Ringkasan enam domain arsitektur SPBE Kabupaten Gresik." },
  { href: "/proses-bisnis", label: "Proses Bisnis", icon: FlowConnectionIcon, section: "Domain Proses Bisnis", description: "Peta proses bisnis seluruh perangkat daerah Kabupaten Gresik berdasarkan Referensi Arsitektur Bisnis (RAB) SPBE." },
  { href: "/layanan", label: "Layanan", icon: CustomerService01Icon, section: "Domain Layanan", description: "Daftar layanan publik dan layanan administrasi pemerintahan Kabupaten Gresik yang dipetakan ke Referensi Arsitektur Layanan (RAL)." },
  { href: "/data", label: "Data", icon: Database01Icon, section: "Domain Data", description: "Katalog data dan informasi perangkat daerah Kabupaten Gresik beserta sifat, format, dan Referensi Arsitektur Data (RAD)." },
  { href: "/aplikasi", label: "Aplikasi", icon: ComputerIcon, section: "Domain Aplikasi", description: "Inventaris aplikasi SPBE Kabupaten Gresik: aplikasi umum dan khusus, pengelola, serta keterhubungannya dengan layanan." },
  { href: "/infrastruktur", label: "Infrastruktur", icon: ServerStack01Icon, section: "Domain Infrastruktur", description: "Infrastruktur SPBE Kabupaten Gresik: pusat data, jaringan intra pemerintah, dan sistem penghubung layanan." },
  { href: "/keamanan", label: "Keamanan", icon: ShieldKeyIcon, section: "Domain Keamanan", locked: true, description: "Arsitektur keamanan SPBE Kabupaten Gresik (khusus pengguna yang masuk)." },
  { href: "/integrasi", label: "Integrasi Domain", icon: Layers01Icon, section: "Integrasi Domain", description: "Jelajahi hubungan record dan simulasi dampak perubahan arsitektur SPBE." },
  { href: "/peta-rencana", label: "Peta Rencana", icon: Route01Icon, section: "Peta Rencana", description: "Peta rencana SPBE Kabupaten Gresik 2025–2029: program, kegiatan, target, dan realisasi tiap tahun." },
];

/** Halaman portal di luar menu tetap mendapat judul section yang benar. */
export const portalSections: Record<string, string> = {
  "/katalog": "Katalog Layanan",
};

/** Menu CMS dikelompokkan per modul. Modul dibangun bertahap (notulen): Proses Bisnis, Layanan, Data, Aplikasi, Infrastruktur, lalu Keamanan. */
export const cmsNav: NavEntry[] = [
  { href: "/cms", label: "Beranda", icon: DashboardSquare01Icon, section: "Beranda CMS", description: "Ringkasan tugas dan aktivitas terbaru Anda" },
  {
    label: "Proses Bisnis",
    icon: FlowConnectionIcon,
    children: [
      { href: "/cms/proses-bisnis", label: "Daftar Probis", icon: ListViewIcon, section: "Daftar Proses Bisnis", description: "Lihat dan kelola seluruh proses bisnis" },
      { href: "/cms/proses-bisnis/baru", label: "Tambah Probis", icon: TaskAdd01Icon, section: "Tambah Proses Bisnis", description: "Isi probis baru, dibantu AI", perm: "create" },
      { href: "/cms/proses-bisnis/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Proses Bisnis", description: "Tim Bagian Organisasi memeriksa ajuan OPD", perm: "verify.probis", badgeKey: "submitted" },
      { href: "/cms/proses-bisnis/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Proses Bisnis", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "verified" },
      { href: "/cms/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Proses Bisnis", description: "Unggah template Excel atau unduh data", perm: ["import", "export"] },
    ],
  },
  {
    label: "Layanan",
    icon: CustomerService01Icon,
    children: [
      { href: "/cms/layanan", label: "Daftar Layanan", icon: ListViewIcon, section: "Daftar Layanan", description: "Lihat dan kelola seluruh layanan" },
      { href: "/cms/layanan/baru", label: "Tambah Layanan", icon: TaskAdd01Icon, section: "Tambah Layanan", description: "Isi layanan baru, dibantu AI", perm: "create" },
      { href: "/cms/layanan/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Layanan", description: "Tim Bagian Organisasi memeriksa ajuan OPD", perm: "verify.layanan", badgeKey: "layananSubmitted" },
      { href: "/cms/layanan/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Layanan", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "layananVerified" },
      { href: "/cms/layanan/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Layanan", description: "Unggah template analis atau unduh data", perm: ["import", "export"] },
    ],
  },
  {
    label: "Data",
    icon: Database01Icon,
    children: [
      { href: "/cms/data", label: "Daftar Data", icon: ListViewIcon, section: "Daftar Data", description: "Lihat dan kelola seluruh data & informasi" },
      { href: "/cms/data/baru", label: "Tambah Data", icon: TaskAdd01Icon, section: "Tambah Data", description: "Isi data baru, dibantu AI", perm: "create" },
      { href: "/cms/data/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Data", description: "Verifikator Data Diskominfo memeriksa ajuan OPD", perm: "verify.data", badgeKey: "dataSubmitted" },
      { href: "/cms/data/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Data", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "dataVerified" },
      { href: "/cms/data/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Data", description: "Unggah template analis atau zip arsitektur", perm: ["import", "export"] },
    ],
  },
  {
    label: "Aplikasi",
    icon: ComputerIcon,
    children: [
      { href: "/cms/aplikasi", label: "Daftar Aplikasi", icon: ListViewIcon, section: "Daftar Aplikasi", description: "Lihat dan kelola seluruh aplikasi" },
      { href: "/cms/aplikasi/baru", label: "Tambah Aplikasi", icon: TaskAdd01Icon, section: "Tambah Aplikasi", description: "Isi aplikasi baru, dibantu AI", perm: "create" },
      { href: "/cms/aplikasi/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Aplikasi", description: "Verifikator Aplikasi Diskominfo memeriksa ajuan OPD", perm: "verify.aplikasi", badgeKey: "aplikasiSubmitted" },
      { href: "/cms/aplikasi/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Aplikasi", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "aplikasiVerified" },
      { href: "/cms/aplikasi/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Aplikasi", description: "Unggah template analis atau zip arsitektur", perm: ["import", "export"] },
    ],
  },
  {
    label: "Infrastruktur",
    icon: ServerStack01Icon,
    children: [
      { href: "/cms/infrastruktur", label: "Daftar Komponen", icon: ListViewIcon, section: "Daftar Infrastruktur", description: "Lihat dan kelola 10 komponen infrastruktur" },
      { href: "/cms/infrastruktur/baru", label: "Tambah Komponen", icon: TaskAdd01Icon, section: "Tambah Infrastruktur", description: "Isi komponen baru, dibantu AI", perm: "create" },
      { href: "/cms/infrastruktur/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Infrastruktur", description: "Verifikator Infrastruktur Diskominfo memeriksa ajuan OPD", perm: "verify.infrastruktur", badgeKey: "infrastrukturSubmitted" },
      { href: "/cms/infrastruktur/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Infrastruktur", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "infrastrukturVerified" },
      { href: "/cms/infrastruktur/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Infrastruktur", description: "Unggah template komponen atau zip arsitektur", perm: ["import", "export"] },
    ],
  },
  {
    label: "Keamanan",
    icon: ShieldKeyIcon,
    children: [
      { href: "/cms/keamanan", label: "Daftar Kegiatan", icon: ListViewIcon, section: "Daftar Kegiatan Keamanan", description: "Standar, penerapan, dan kelaikan keamanan SPBE" },
      { href: "/cms/keamanan/baru", label: "Tambah Kegiatan", icon: TaskAdd01Icon, section: "Tambah Kegiatan Keamanan", description: "Isi kegiatan baru, dibantu AI", perm: "create" },
      { href: "/cms/keamanan/verifikasi", label: "Verifikasi", icon: CheckListIcon, section: "Verifikasi Keamanan", description: "Verifikator Keamanan Diskominfo memeriksa ajuan OPD", perm: "verify.keamanan", badgeKey: "keamananSubmitted" },
      { href: "/cms/keamanan/validasi", label: "Validasi", icon: CheckmarkBadge01Icon, section: "Validasi Keamanan", description: "Tim Diskominfo memvalidasi akhir sebelum tayang", perm: "validate", badgeKey: "keamananVerified" },
      { href: "/cms/keamanan/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Keamanan", description: "Unggah template kegiatan atau zip arsitektur", perm: ["import", "export"] },
    ],
  },
  {
    label: "Perencanaan",
    icon: TaskDone01Icon,
    children: [
      { href: "/cms/gap-analysis", label: "Gap Analysis", icon: GitCompareIcon, section: "Gap Analysis", description: "Kesenjangan AS-IS terhadap target arsitektur", perm: "view.gap" },
      { href: "/cms/peta-rencana", label: "Peta Rencana", icon: Route01Icon, section: "Peta Rencana", description: "Kegiatan target arsitektur per tahun" },
      { href: "/cms/peta-rencana/baru", label: "Tambah Kegiatan", icon: TaskAdd01Icon, section: "Tambah Kegiatan Rencana", description: "Isi kegiatan rencana baru", perm: "rencana" },
      { href: "/cms/peta-rencana/indikator", label: "Indikator & Target", icon: Target02Icon, section: "Indikator Peta Rencana", description: "Target indikator sasaran per tahun", perm: "rencana" },
      { href: "/cms/peta-rencana/impor", label: "Impor & Ekspor", icon: FileImportIcon, section: "Impor & Ekspor Peta Rencana", description: "Unggah atau unduh peta rencana", perm: "rencana" },
    ],
  },
  {
    label: "Pengaturan",
    icon: Settings02Icon,
    children: [
      { href: "/cms/pengaturan/referensi-rab", label: "Referensi RAB", icon: Layers01Icon, section: "Referensi RAB", description: "Kelola versi, kode, dan nama RAB", perm: "ref.rab" },
      { href: "/cms/pengaturan/referensi-ral", label: "Referensi RAL", icon: Layers01Icon, section: "Referensi RAL", description: "Kelola versi, kode, dan nama RAL", perm: "ref.ral" },
      { href: "/cms/pengaturan/referensi-rad", label: "Referensi RAD", icon: Layers01Icon, section: "Referensi RAD", description: "Kelola versi, kode, dan nama RAD", perm: "ref.rad" },
      { href: "/cms/pengaturan/referensi-raa", label: "Referensi RAA", icon: Layers01Icon, section: "Referensi RAA", description: "Kelola versi, kode, dan nama RAA", perm: "ref.raa" },
      { href: "/cms/pengaturan/referensi-rai", label: "Referensi RAI", icon: Layers01Icon, section: "Referensi RAI", description: "Kelola versi, kode, dan nama RAI", perm: "ref.rai" },
      { href: "/cms/pengaturan/periode", label: "Periode Arsitektur", icon: Calendar03Icon, section: "Periode Arsitektur", description: "Tambah dan aktifkan periode arsitektur", perm: "periods" },
      { href: "/cms/pengaturan/pengguna", label: "Akun Pengguna", icon: UserGroupIcon, section: "Akun Pengguna", description: "Tambah, ubah peran, dan nonaktifkan akun", perm: "users" },
      { href: "/cms/pengaturan/hak-akses", label: "Hak Akses", icon: UserLock01Icon, section: "Hak Akses", description: "Atur izin tiap peran", perm: "users" },
    ],
  },
];

const allowed = (item: NavItem, perms: Permission[]) => !item.perm || [item.perm].flat().some((p) => perms.includes(p));

/** Menu sesuai hak akses: sub-menu disaring, menu besar tanpa isi dihapus. */
export function navFor(entries: NavEntry[], perms: Permission[]): NavEntry[] {
  return entries.flatMap((entry): NavEntry[] => {
    if (!isGroup(entry)) return allowed(entry, perms) ? [entry] : [];
    const children = entry.children.filter((c) => allowed(c, perms));
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
