import { ProbisTable } from "@/components/cms/probis-table";
import { can, currentActor, opdScope } from "@/lib/access";
import { periodOptions } from "@/lib/probis/periods";
import { hasProbis, probisPage } from "@/lib/probis/repo";
import { PAGE_SIZE, parseProbisParams } from "@/lib/probis/table-params";

/** Daftar probis: filter, pencarian, urutan, dan halaman dibaca dari URL lalu dihitung di database. */
export default async function ProbisListPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const [actor, periods, params] = await Promise.all([currentActor(), periodOptions(), searchParams]);
  const opdId = opdScope(actor);
  const view = parseProbisParams(params, periods.active);
  const load = (page: number) =>
    probisPage({ opdId, tab: view.tab, pd: can.readAll(actor) ? view.pd : [], rab1: view.rab1, period: view.period, q: view.q, page, pageSize: PAGE_SIZE, sort: view.sort });
  const [first, any] = await Promise.all([load(view.page), hasProbis(opdId)]);
  let page = first;
  // Halaman di luar jangkauan (mis. tautan lama setelah data berkurang): tampilkan halaman terakhir.
  if (!page.rows.length && page.total) {
    view.page = Math.ceil(page.total / PAGE_SIZE) - 1;
    page = await load(view.page);
  }
  return <ProbisTable page={page} view={view} empty={!any} actor={actor} periods={periods} />;
}
