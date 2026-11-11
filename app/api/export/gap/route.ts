import * as XLSX from "xlsx";
import { forbidden, xlsxResponse } from "@/lib/export/xlsx-response";
import { can, currentActor, opdScope } from "@/lib/access";
import { chainCoverage } from "@/lib/gap/chain";
import { chainLabel, chainStages } from "@/lib/gap/rules";
import { periodOptions } from "@/lib/probis/periods";
import { periodName } from "@/lib/security/schemas";

/** Ekspor matriks kelengkapan proses bisnis (Ada/Belum per domain) untuk satu periode. */
export async function GET(request: Request) {
  const actor = await currentActor().catch(() => null);
  if (!actor || !can.export(actor) || !can.viewGap(actor)) return forbidden();
  const asked = new URL(request.url).searchParams.get("period");
  const period = asked && periodName.safeParse(asked).success ? asked : (await periodOptions()).active;
  const rows = await chainCoverage(period, opdScope(actor));
  const header = ["ID", "Proses bisnis", "Perangkat Daerah", ...chainStages.map((s) => chainLabel[s]), "Kelengkapan"];
  const body = rows.map((r) => {
    const have = chainStages.filter((s) => r[s]).length;
    return [r.code, r.name, r.opdName, ...chainStages.map((s) => (r[s] ? "Ada" : "Belum")), `${have}/${chainStages.length}`];
  });
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([header, ...body]);
  sheet["!cols"] = [{ wch: 18 }, { wch: 48 }, { wch: 40 }, ...chainStages.map(() => ({ wch: 14 })), { wch: 12 }];
  XLSX.utils.book_append_sheet(book, sheet, "Gap Analysis");
  return xlsxResponse(book, `gap-analysis-${period}`);
}
