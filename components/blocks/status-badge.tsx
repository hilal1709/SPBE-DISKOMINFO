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
};

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
