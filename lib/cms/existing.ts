import type { Pool } from "pg";
import { NIL_UUID } from "@/lib/constants";
import { can, type Actor } from "@/lib/permissions";
import type { DomainKey } from "@/lib/domains";
import type { SubmissionStatus } from "@/lib/types";

const tables: Record<DomainKey, string> = { probis: "process_businesses", layanan: "services", data: "datasets", aplikasi: "applications", infrastruktur: "infrastructures", keamanan: "security_activities" };
export type ExistingRecord = { id: string; code: string; name: string; opd: string; period: string; status: SubmissionStatus; kind: string | null };

/** Hanya metadata record yang boleh dibaca DAN diedit; query tidak memuat isi form. */
export async function findEditableRecords(db: Pick<Pool, "query">, actor: Actor, domain: DomainKey, query: string): Promise<ExistingRecord[]> {
  if (!actor.perms.includes("edit") && !actor.perms.includes("editAny")) return [];
  const scope = can.readAll(actor) ? null : actor.opdId ?? NIL_UUID;
  const { rows } = await db.query<ExistingRecord>(
    `select t.id, t.code, t.name, o.name as opd, p.name as period, t.status::text as status,
       ${domain === "infrastruktur" || domain === "keamanan" ? "t.kind" : "null::text"} as kind
     from ${tables[domain]} t join opd o on o.id=t.opd_id join architecture_periods p on p.id=t.period_id
     where ($1::uuid is null or t.opd_id=$1)
       and ($2::boolean or t.status::text in ('draft','rejected'))
       and (t.code ilike $3 escape '\\' or t.name ilike $3 escape '\\')
     order by t.updated_at desc, t.id limit 20`,
    [scope, actor.perms.includes("editAny"), `%${query.replace(/[\\%_]/g, "\\$&")}%`],
  );
  return rows;
}
