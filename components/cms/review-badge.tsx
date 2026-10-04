import { StatusBadge } from "@/components/blocks/status-badge";
import { reviewLabel } from "@/lib/probis/reference";
import type { SubmissionStatus } from "@/lib/types";

/** Badge status alur probis: Draf → Diajukan → Terverifikasi → Tervalidasi (atau Dikembalikan). */
export function ReviewBadge({ status }: { status: SubmissionStatus }) {
  return <StatusBadge status={reviewLabel[status]} />;
}
