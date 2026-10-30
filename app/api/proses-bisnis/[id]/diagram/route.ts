import { isUuid } from "@/lib/constants";
import { approvedDiagram } from "@/lib/probis/repo";

/** XML diagram BPMN probis tervalidasi untuk viewer portal; rekaman lain 404. */
export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const xml = isUuid(id) ? await approvedDiagram(id) : null;
  if (!xml) return new Response("Tidak ditemukan", { status: 404 });
  return new Response(xml, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=60" } });
}
