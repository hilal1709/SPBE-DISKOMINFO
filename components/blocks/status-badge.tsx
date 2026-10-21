import { Badge } from "@/components/ui/badge";
import type { SubmissionStatus } from "@/lib/types";

export const statusLabel: Record<SubmissionStatus, string> = {
  approved: "Disetujui",
  submitted: "Diajukan",
  verified: "Diverifikasi",
  draft: "Draf",
  rejected: "Ditolak",
  archived: "Arsip",
};

const variants: Record<string, "success" | "warning" | "muted" | "alert" | "accent" | "info"> = {
  Disetujui: "success",
  Selesai: "success",
  Terintegrasi: "success",
  Diajukan: "warning",
  Diverifikasi: "info",
  Terverifikasi: "info",
  Tervalidasi: "success",
  Dikembalikan: "alert",
  Berjalan: "accent",
  Upgrade: "accent",
  "AS-IS": "info",
  "Tatap muka": "alert",
  Baru: "success",
  Tinggi: "alert",
  Ditolak: "alert",
  Sedang: "warning",
  Elektronik: "success",
  Hybrid: "warning",
  Terbuka: "success",
  Terbatas: "warning",
  Tertutup: "alert",
  Interoperabel: "success",
  Pemda: "success",
  "Instansi Pusat": "info",
  "Pihak Ketiga": "warning",
  "Milik sendiri": "success",
  Sewa: "warning",
  "Instansi lain": "info",
  "Pihak ketiga": "alert",
  Berlaku: "success",
  Direncanakan: "info",
  Terlaksana: "success",
  Ditunda: "warning",
  Batal: "alert",
};

/** Varian badge untuk token warna kategori (sama dengan warna seri grafiknya). */
const toneVariants: Record<string, "success" | "warning" | "info" | "accent" | "alert"> = {
  "--brand-teal": "success",
  "--brand-yellow": "warning",
  "--brand-sky": "info",
  "--brand-amber": "accent",
  "--brand-orange": "alert",
};

/** Badge kategori (komponen infrastruktur, kegiatan keamanan) berwarna sama dengan grafiknya. */
export function ToneBadge({ tone, children }: { tone: string; children: React.ReactNode }) {
  return <Badge variant={toneVariants[tone] ?? "muted"}>{children}</Badge>;
}

/** Badge status dengan warna semantik. Terima kode status atau label bebas. */
export function StatusBadge({ status }: { status: SubmissionStatus | string }) {
  const label = statusLabel[status as SubmissionStatus] ?? status;
  return (
    <Badge variant={variants[label] ?? "muted"} className="gap-1.5">
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {label}
    </Badge>
  );
}
