import {
  Building03Icon, CheckmarkBadge01Icon, ComputerIcon, CustomerService01Icon, DashboardSquare01Icon,
  Database01Icon, FlowConnectionIcon, GitCompareIcon, Idea01Icon, LibraryIcon, Route01Icon, ServerStack01Icon,
  Task01Icon, TaskAdd01Icon, UserGroupIcon,
} from "@hugeicons/core-free-icons";
import type { IconSvgElement } from "@/components/icon";

export type NavItem = { href: string; label: string; icon: IconSvgElement; section: string };

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

/** Halaman portal lama (di luar menu) tetap mendapat judul section yang benar. */
export const portalSections: Record<string, string> = {
  "/katalog": "Katalog Layanan",
  "/pengajuan": "Input Layanan",
  "/verifikasi": "Verifikasi",
  "/gap-analysis": "Gap Analysis",
  "/master": "Master Data",
  "/pengguna": "Pengguna",
};

export const cmsNav: NavItem[] = [
  { href: "/cms", label: "Beranda", icon: DashboardSquare01Icon, section: "Beranda CMS" },
  { href: "/cms/layanan", label: "Layanan Saya", icon: Task01Icon, section: "Layanan Saya" },
  { href: "/cms/layanan/baru", label: "Tambah Layanan", icon: TaskAdd01Icon, section: "Tambah Layanan" },
  { href: "/cms/verifikasi", label: "Verifikasi", icon: CheckmarkBadge01Icon, section: "Verifikasi" },
  { href: "/cms/gap-analysis", label: "Gap Analysis", icon: GitCompareIcon, section: "Gap Analysis" },
  { href: "/cms/peta-rencana", label: "Peta Rencana", icon: Route01Icon, section: "Peta Rencana" },
  { href: "/cms/master", label: "Master Data", icon: LibraryIcon, section: "Master Data" },
  { href: "/cms/pengguna", label: "Pengguna", icon: UserGroupIcon, section: "Pengguna" },
];


/** Item dengan href terpanjang yang cocok dengan pathname. */
export function activeItem(items: NavItem[], pathname: string) {
  return items
    .filter((item) => pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)))
    .sort((a, b) => b.href.length - a.href.length)[0];
}
