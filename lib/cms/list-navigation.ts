import type { SubmissionStatus } from "@/lib/types";

export type CmsListTab = "all" | "review" | SubmissionStatus;
const tabs: readonly string[] = ["all", "review", "draft", "submitted", "verified", "approved", "rejected"];
export const ALL_CMS_PERIODS = "__all";

export function cmsListFilters(params: Pick<URLSearchParams, "get">): { tab: CmsListTab; period: string } {
  const tab = params.get("tab") ?? "all";
  return { tab: tabs.includes(tab) ? tab as CmsListTab : "all", period: params.get("periode") || ALL_CMS_PERIODS };
}

/** Antrean pemeriksaan mencakup semua periode; daftar juga demikian kecuali difilter eksplisit. */
export function matchesCmsPeriod(recordPeriod: string, selectedPeriod: string) {
  return selectedPeriod === ALL_CMS_PERIODS || recordPeriod === selectedPeriod;
}

/** Bawa status dan periode isian ke daftar, termasuk saat mengajukan ulang data lama. */
export function savedListHref(path: string, submitted: boolean, period: string, currentStatus: SubmissionStatus = "draft") {
  const params = new URLSearchParams({ tab: submitted ? "submitted" : currentStatus, periode: period });
  return `${path}?${params}`;
}
