import type { Pool, PoolClient } from "pg";
import { cache } from "react";
import { getDb } from "@/lib/db";
import { cached, TAGS } from "@/lib/cache";
import type { DomainKey } from "@/lib/domains";
import type { Architecture, DomainEdge, DomainNode, DomainSummary, RelationSummary } from "./model";

const NODE_LIMIT = 6000;
const EDGE_LIMIT = 24000;
const tables: [DomainKey, string, string][] = [
  ["probis", "process_businesses", "probis_status::text"], ["layanan", "services", "method"],
  ["data", "datasets", "sifat"], ["aplikasi", "applications", "basis"],
  ["infrastruktur", "infrastructures", "kind"], ["keamanan", "security_activities", "kind"],
];
const junctions = [
  ["service_process_businesses", "service_id", "layanan", "process_business_id", "probis"],
  ["dataset_process_businesses", "dataset_id", "data", "process_business_id", "probis"],
  ["dataset_services", "dataset_id", "data", "service_id", "layanan"],
  ["application_process_businesses", "application_id", "aplikasi", "process_business_id", "probis"],
  ["application_services", "application_id", "aplikasi", "service_id", "layanan"],
  ["application_datasets", "application_id", "aplikasi", "dataset_id", "data"],
  ["infrastructure_links", "infrastructure_id", "infrastruktur", "target_id", "infrastruktur"],
  ["infrastructure_applications", "infrastructure_id", "infrastruktur", "application_id", "aplikasi"],
  ["infrastructure_datasets", "infrastructure_id", "infrastruktur", "dataset_id", "data"],
  ["infrastructure_process_businesses", "infrastructure_id", "infrastruktur", "process_business_id", "probis"],
] as const;

/** Only an allowlist of published metadata crosses the server/client boundary. No attributes or security text. */
async function readArchitecture(securityVisible: boolean, period: string): Promise<Architecture> {
  const db = getDb();
  if (!db) throw new Error("Database belum tersedia.");
  return readArchitectureFromPool(db, securityVisible, period);
}

/** Injectable reader for regression tests; the production caller supplies only getDb(). */
export async function readArchitectureFromPool(db: Pick<Pool, "connect">, securityVisible: boolean, period = ""): Promise<Architecture> {
  const client = await db.connect();
  try {
    await client.query("begin transaction isolation level repeatable read read only");
    const visibleTables = tables.filter(([domain]) => securityVisible || domain !== "keamanan");
    const base = visibleTables.map(([domain, table, category]) =>
      `select '${domain}'::text as domain, t.id::text, t.code, t.name, o.code as opd, o.name as opd_name,
       p.name as period, coalesce(t.${category}, '') as category, t.is_sample as sample
       from ${table} t join opd o on o.id=t.opd_id join architecture_periods p on p.id=t.period_id where t.status='approved'`).join(" union all ");
    const records = await client.query<DomainNode & { opd_name: string }>(`select * from (${base}) n where ($2::text='' or period=$2) order by domain, code, id limit $1`, [NODE_LIMIT + 1, period]);
    const stats = await client.query<DomainSummary & { opd_name: string }>(
      `select domain, opd, opd_name, period, category, count(*)::int as count, bool_or(sample) as sample
       from (${base}) n where ($1::text='' or period=$1) group by domain, opd, opd_name, period, category`, [period]);
    const nodes: DomainNode[] = records.rows.slice(0, NODE_LIMIT).map((n) => ({ id: `${n.domain}:${n.id}`, domain: n.domain, code: n.code, name: n.name, opd: n.opd, opdName: n.opd_name, period: n.period, category: n.category }));
    const byId = new Map(nodes.map((n) => [n.id, n]));
    const edges: DomainEdge[] = [];
    let edgeOverflow = false;
    const add = (source: string, target: string, label: string, storage: DomainEdge["storage"], origin: string) => {
      if (!byId.has(source) || !byId.has(target)) return;
      if (edges.length >= EDGE_LIMIT) { edgeOverflow = true; return; }
      edges.push({ id: `${origin}:${source}:${target}`, source, target, label, storage, origin });
    };
    // Restrict both endpoints in SQL: unpublished or restricted record IDs never become graph edges.
    const linkSql = junctions.map(([table, from, domain, to, targetDomain]) =>
      `select '${domain}:' || j.${from}::text as source, '${targetDomain}:' || j.${to}::text as target, '${table}' as origin
       from ${table} j where ('${domain}:' || j.${from}::text)=any($1::text[]) and ('${targetDomain}:' || j.${to}::text)=any($1::text[])`).join(" union all ");
    const links = await client.query<{ source: string; target: string; origin: string }>(`${linkSql} limit $2`, [[...byId.keys()], EDGE_LIMIT + 1]);
    for (const e of links.rows.slice(0, EDGE_LIMIT)) add(e.source, e.target, "Relasi tersimpan", "junction", e.origin);
    let partial = records.rows.length > NODE_LIMIT || links.rows.length > EDGE_LIMIT;
    const textIndex = new Map<string, DomainNode[]>();
    for (const n of nodes) {
      const key = JSON.stringify([n.domain, n.period, n.domain === "infrastruktur" ? n.name.toLowerCase() : n.code]);
      const list = textIndex.get(key) ?? []; list.push(n); textIndex.set(key, list);
    }
    const targets = (domain: DomainKey, period: string, value: string) => textIndex.get(JSON.stringify([domain, period, value])) ?? [];
    const apps = await client.query<{ id: string; cloud: string | null; server: string | null; splp: string | null; jip: string | null; input_data: string | null; output_data: string | null }>(
      "select id, cloud, server, splp, jip, input_data, output_data from applications where ('aplikasi:' || id::text)=any($1::text[])", [[...byId.keys()]]);
    for (const app of apps.rows) {
      const source = byId.get(`aplikasi:${app.id}`)!;
      for (const field of ["cloud", "server", "splp", "jip"] as const) {
        const value = app[field]?.trim().toLowerCase();
        if (!value) continue;
        for (const target of targets("infrastruktur", source.period, value)) add(source.id, target.id, `Referensi ${field}`, "text", `applications.${field}`);
      }
      for (const field of ["input_data", "output_data"] as const) {
        const codes = (app[field] ?? "").split("\n").map((v) => v.trim());
        for (const code of new Set(codes)) for (const target of targets("data", source.period, code)) add(source.id, target.id, field === "input_data" ? "Input data" : "Output data", "text", `applications.${field}`);
      }
    }
    // Authorization is evaluated by the page before this parameter is chosen; anonymous snapshots omit this read entirely.
    if (securityVisible) await addSecurityEdges(client, nodes, add);
    if (edgeOverflow) partial = true;
    await client.query("commit");
    return { nodes, edges: edges.slice(0, EDGE_LIMIT), summary: stats.rows.map((r) => ({ domain: r.domain, opd: r.opd, opdName: r.opd_name, period: r.period, category: r.category, count: r.count, sample: r.sample })), securityVisible, partial, available: true };
  } catch (error) { await client.query("rollback"); throw error; }
  finally { client.release(); }
}

async function addSecurityEdges(client: PoolClient, nodes: DomainNode[], add: (source: string, target: string, label: string, storage: DomainEdge["storage"], origin: string) => void) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const securityIndex = new Map(nodes.filter((n) => n.domain === "keamanan").map((n) => [JSON.stringify([n.period, n.category, n.code]), n]));
  for (const [domain, table] of tables.filter(([d]) => ["data", "aplikasi", "infrastruktur"].includes(d))) {
    const { rows } = await client.query<{ id: string; security: Record<string, unknown> }>(`select id, security from ${table} where ('${domain}:' || id::text)=any($1::text[])`, [[...byId.keys()]]);
    for (const row of rows) {
      const source = byId.get(`${domain}:${row.id}`)!;
      for (const [kind, values] of Object.entries(row.security ?? {})) {
        if (!Array.isArray(values)) continue;
        for (const value of new Set(values.filter((v): v is string => typeof v === "string"))) {
          const target = securityIndex.get(JSON.stringify([source.period, kind, value]));
          if (target) add(source.id, target.id, "Referensi keamanan", "jsonb", `${table}.security.${kind}`);
        }
      }
    }
  }
}

// Request memoization only: a graph can exceed Next's persistent 2 MB entry limit.
const cachedArchitecture = cache(readArchitecture);
/** Internal server loader. Never expose securityVisible as a user-controlled action argument. */
export async function loadArchitecture(securityVisible: boolean, period: string): Promise<Architecture> {
  try { return await cachedArchitecture(securityVisible, period); }
  catch {
    return { nodes: [], edges: [], summary: [], securityVisible, partial: false, available: false };
  }
}

// Aggregate pages are deliberately small; no record names, attributes or graph payload enter this cache.
const PAGE_SIZE = 100;
const summaryPage = cached(async (domain: DomainKey, offset: number) => {
  const db = getDb(); if (!db) throw new Error("Database belum tersedia.");
  const [, table, category] = tables.find(([key]) => key === domain)!;
  const { rows } = await db.query<DomainSummary>(`select '${domain}'::text as domain, o.code as opd, o.name as "opdName", p.name as period,
    coalesce(t.${category}, '') as category, count(*)::int as count, bool_or(t.is_sample) as sample
    from ${table} t join opd o on o.id=t.opd_id join architecture_periods p on p.id=t.period_id
    where t.status='approved' group by o.code,o.name,p.name,t.${category}
    order by o.code,p.name,t.${category} limit $1 offset $2`, [PAGE_SIZE, offset]);
  return rows;
}, "portal:summary-page-v2", [TAGS.content, TAGS.reference]);

const relationPage = cached(async (index: number, offset: number) => {
  const db = getDb(); if (!db) throw new Error("Database belum tersedia.");
  const [table, from, source, to, target] = junctions[index];
  const sourceTable = tables.find(([key]) => key === source)![1];
  const targetTable = tables.find(([key]) => key === target)![1];
  const { rows } = await db.query<RelationSummary>(`select '${source}'::text as source,'${target}'::text as target,
    so.code as "sourceOpd",to_.code as "targetOpd",p.name as period,count(*)::int as count
    from ${table} j join ${sourceTable} s on s.id=j.${from} join ${targetTable} t on t.id=j.${to}
    join opd so on so.id=s.opd_id join opd to_ on to_.id=t.opd_id join architecture_periods p on p.id=s.period_id
    where s.status='approved' and t.status='approved' and s.period_id=t.period_id
    group by so.code,to_.code,p.name order by so.code,to_.code,p.name limit $1 offset $2`, [PAGE_SIZE, offset]);
  return rows;
}, "portal:relation-summary-page-v2", [TAGS.content, TAGS.reference]);

async function collect<T>(page: (offset: number) => Promise<T[]>): Promise<T[]> {
  const result: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const rows = await page(offset); result.push(...rows);
    if (rows.length < PAGE_SIZE) return result;
  }
}

export async function loadOverview(securityVisible: boolean) {
  try {
    const [summary, relations] = await Promise.all([
      Promise.all(tables.filter(([key]) => securityVisible || key !== "keamanan").map(([key]) => collect((offset) => summaryPage(key, offset)))),
      Promise.all(junctions.map((_, index) => collect((offset) => relationPage(index, offset)))),
    ]);
    return { summary: summary.flat(), relations: relations.flat(), available: true };
  } catch { return { summary: [], relations: [], available: false }; }
}
