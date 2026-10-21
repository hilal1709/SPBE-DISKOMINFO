import type { ProbisTab } from "@/lib/probis/repo";

/** Tampilan tabel probis CMS yang disimpan di URL (bisa dibagikan, dan dibaca server untuk paginasi). */
export type ProbisView = {
  tab: ProbisTab;
  pd: string[];
  rab1: string[];
  /** Nama periode, atau "__all". */
  period: string;
  q: string;
  /** Halaman, mulai 0. */
  page: number;
  sort: { key: string; dir: 1 | -1 } | null;
};

export const PAGE_SIZE = 20;

const TABS: ProbisTab[] = ["all", "review", "draft", "submitted", "verified", "approved", "rejected"];
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
const list = (v: string | string[] | undefined) => one(v).split(",").filter(Boolean);

export function parseProbisParams(params: Record<string, string | string[] | undefined>, activePeriod: string): ProbisView {
  const tab = one(params.tab) as ProbisTab;
  const page = Number.parseInt(one(params.hal), 10);
  const key = one(params.urut);
  return {
    tab: TABS.includes(tab) ? tab : "all",
    pd: list(params.pd),
    rab1: list(params.rab1),
    period: one(params.periode) || activePeriod,
    q: one(params.q).slice(0, 100),
    page: Number.isFinite(page) && page > 1 ? page - 1 : 0,
    sort: key ? { key, dir: one(params.arah) === "desc" ? -1 : 1 } : null,
  };
}

/** Kebalikan `parseProbisParams`; nilai bawaan tidak ditulis agar URL tetap pendek. */
export function probisParams(view: ProbisView, activePeriod: string) {
  const out = new URLSearchParams();
  if (view.tab !== "all") out.set("tab", view.tab);
  if (view.pd.length) out.set("pd", view.pd.join(","));
  if (view.rab1.length) out.set("rab1", view.rab1.join(","));
  if (view.period !== activePeriod) out.set("periode", view.period);
  if (view.q.trim()) out.set("q", view.q.trim());
  if (view.page > 0) out.set("hal", String(view.page + 1));
  if (view.sort) {
    out.set("urut", view.sort.key);
    if (view.sort.dir === -1) out.set("arah", "desc");
  }
  return out;
}
