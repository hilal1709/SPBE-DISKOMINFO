import assert from "node:assert/strict";
import { test } from "node:test";
import type { Pool } from "pg";
import { domainKeys } from "@/lib/domains";
import { NIL_UUID } from "@/lib/constants";
import { defaultGrants, type Actor } from "@/lib/permissions";
import { findEditableRecords } from "@/lib/cms/existing";
import { analyzeImpact, domainTotals, filterSummary, summarizeRelations, type DomainEdge, type DomainNode } from "@/lib/integrasi/model";
import { readArchitectureFromPool } from "@/lib/integrasi/repo";
import { emptyFilter as emptyData, filterData, filterFromParams as parseData, filterToParams as paramsData } from "@/lib/data/query";
import { emptyFilter as emptySecurity, filterKeamanan, filterFromParams as parseSecurity, filterToParams as paramsSecurity } from "@/lib/keamanan/query";
import type { DataInfo, KegiatanKeamanan } from "@/lib/types";
import { publicNav } from "@/lib/navigation";
import { indexablePages, pageMetadata, breadcrumbJsonLd } from "@/lib/seo";

const actor = (perms = defaultGrants.operator_opd, opdId: string | null = "opd-a"): Actor => ({ id: "test", name: "Test", role: "operator_opd", roleName: "Test", opdId, demo: false, perms });
const node = (id: string, domain: DomainNode["domain"]): DomainNode => ({ id, domain, code: id, name: id, opd: "OPD", opdName: "OPD", period: "2025–2029", category: "test" });
const edge = (source: string, target: string, storage: DomainEdge["storage"] = "junction"): DomainEdge => ({ id: `${source}:${target}:${storage}`, source, target, storage, label: "test", origin: "test" });

test("impact traverses cycles once, preserves snapshot, and never labels indirect record deletion as certain", () => {
  const nodes = [node("a", "probis"), node("b", "layanan"), node("c", "aplikasi")];
  const edges = [edge("a", "b"), edge("b", "c"), edge("c", "b")];
  const before = JSON.stringify({ nodes, edges });
  const direct = analyzeImpact(nodes, edges, "a", "delete", false);
  assert.equal(direct.length, 1); assert.equal(direct[0].certain, true);
  const all = analyzeImpact(nodes, edges, "a", "delete", true);
  assert.equal(all.length, 2); assert.equal(all.find((r) => r.node.id === "c")?.certain, false);
  assert(analyzeImpact(nodes, edges, "a", "change", true).every((r) => !r.certain));
  assert.equal(JSON.stringify({ nodes, edges }), before);
  assert.deepEqual(analyzeImpact(nodes, edges, "missing", "delete"), []);
});

test("logical references stay potential, while a parallel junction is certain regardless of edge order", () => {
  const nodes = [node("a", "aplikasi"), node("b", "data")];
  assert.equal(analyzeImpact(nodes, [edge("a", "b", "jsonb")], "a", "delete")[0].certain, false);
  const edges = [edge("a", "b", "text"), edge("a", "b")];
  assert.equal(analyzeImpact(nodes, edges, "a", "delete")[0].certain, true);
  assert.equal(analyzeImpact(nodes, [...edges, edge("a", "private")], "a", "delete").length, 1);
});

test("overview combines period and OPD, keeps per-domain totals and ignores missing graph endpoints", () => {
  const summary = [{ domain: "data" as const, opd: "a", opdName: "A", period: "2025–2029", category: "terbuka", count: 7, sample: false }, { domain: "data" as const, opd: "b", opdName: "B", period: "2020–2024", category: "terbuka", count: 9, sample: false }];
  assert.equal(domainTotals(filterSummary(summary, "2025–2029", ["a"])).data, 7);
  assert.equal(domainTotals(filterSummary(summary, "2025–2029", ["b"])).data, 0);
  assert.deepEqual(summarizeRelations([node("a", "probis")], [edge("a", "hidden")]), []);
});

test("existing search enforces scope and editable statuses in all six domains and parameterizes user text", async () => {
  const calls: { sql: string; values: unknown[] }[] = [];
  const db = { query: async (sql: string, values: unknown[]) => { calls.push({ sql, values }); return { rows: [] }; } } as unknown as Pool;
  const query = "%' OR 1=1 --";
  for (const domain of domainKeys) await findEditableRecords(db, actor(), domain, query);
  assert.equal(calls.length, 6);
  for (const call of calls) {
    assert.equal(call.values[0], "opd-a"); assert.equal(call.values[1], false);
    assert.match(call.sql, /'draft','rejected'/); assert.match(call.sql, /limit 20/);
    assert(!call.sql.includes(query)); assert.match(String(call.values[2]), /OR 1=1/);
  }
  await findEditableRecords(db, actor(defaultGrants.operator_opd, null), "data", "ab");
  assert.equal(calls.at(-1)?.values[0], NIL_UUID);
  await findEditableRecords(db, actor(defaultGrants.superadmin, null), "data", "ab");
  assert.deepEqual(calls.at(-1)?.values.slice(0, 2), [null, true]);
  const before = calls.length;
  assert.deepEqual(await findEditableRecords(db, actor([], null), "data", "ab"), []);
  assert.equal(calls.length, before);
});

function fakePool(security: boolean, fail = false) {
  const calls: string[] = []; const parameters: unknown[][] = []; let released = false;
  const query = async (sql: string, values: unknown[] = []) => {
    calls.push(sql);
    parameters.push(values);
    if (fail && sql.startsWith("select")) throw new Error("mock read failure");
    if (sql.startsWith("select * from")) return { rows: [
      { domain: "aplikasi", id: "a", code: "A", name: "App", opd: "O", opd_name: "OPD", period: "2025–2029", category: "web", sample: false, attributes: { private: "HIDDEN" } },
      ...(security ? [{ domain: "keamanan", id: "k", code: "K", name: "Audit", opd: "O", opd_name: "OPD", period: "2025–2029", category: "audit", sample: false }] : []),
    ] };
    if (sql.startsWith("select domain")) return { rows: [{ domain: "aplikasi", opd: "O", opd_name: "OPD", period: "2025–2029", category: "web", count: 1, sample: false }] };
    if (sql.startsWith("select id, security")) return { rows: sql.includes("from applications") ? [{ id: "a", security: { audit: ["K"], standar: ["LEGACY PRIVATE TEXT"] } }] : [] };
    return { rows: [] };
  };
  const db = { connect: async () => ({ query, release: () => { released = true; } }) } as unknown as Pool;
  return { db, calls, parameters, released: () => released };
}

test("integration snapshot constrains both records and aggregate SQL to the requested period", async () => {
  const mock = fakePool(false);
  const period = "2025–2029' OR true --";
  await readArchitectureFromPool(mock.db, false, period);
  const recordIndex = mock.calls.findIndex((sql) => sql.startsWith("select * from"));
  const summaryIndex = mock.calls.findIndex((sql) => sql.startsWith("select domain"));
  assert.match(mock.calls[recordIndex], /period=\$2/);
  assert.equal(mock.parameters[recordIndex][1], period);
  assert.match(mock.calls[summaryIndex], /period=\$1/);
  assert.equal(mock.parameters[summaryIndex][0], period);
  assert(mock.calls.every((sql) => !sql.includes(period)));
});

test("anonymous snapshot is read-only and excludes security SQL and private attributes", async () => {
  const mock = fakePool(false);
  const data = await readArchitectureFromPool(mock.db, false);
  assert.match(mock.calls[0], /repeatable read read only/);
  assert(mock.calls.every((sql) => !/\b(insert|update|delete|alter|drop|truncate)\b/i.test(sql)));
  assert(mock.calls.every((sql) => !sql.includes("security_activities") && !sql.includes("select id, security")));
  assert(!JSON.stringify(data).includes("HIDDEN")); assert(!data.nodes.some((n) => n.domain === "keamanan"));
  assert.equal(mock.calls.at(-1), "commit"); assert(mock.released());
});

test("authorized JSONB resolution emits only published matching code edges, never raw legacy contents", async () => {
  const mock = fakePool(true);
  const data = await readArchitectureFromPool(mock.db, true);
  assert(data.edges.some((e) => e.storage === "jsonb" && e.target === "keamanan:k"));
  assert(!JSON.stringify(data).includes("LEGACY PRIVATE TEXT"));
});

test("read failure rolls back and releases the mock connection", async () => {
  const mock = fakePool(false, true);
  await assert.rejects(readArchitectureFromPool(mock.db, false), /mock read failure/);
  assert.equal(mock.calls.at(-1), "rollback"); assert(mock.released());
});

test("additional statistical filters round-trip and intersect existing domain filters", () => {
  const df = { ...emptyData("2025–2029"), pd: ["A"], sifat: ["terbuka"], lintas: true };
  assert.equal(parseData(paramsData(df, "2025–2029"), "2025–2029").lintas, true);
  const rows = [{ period: "2025–2029", wali: "A", produsen: "B", sifat: "terbuka" }, { period: "2025–2029", wali: "A", produsen: "A", sifat: "terbuka" }] as DataInfo[];
  assert.equal(filterData(rows, df).length, 1);
  const sf = { ...emptySecurity("2025–2029"), berlaku: true };
  assert.equal(parseSecurity(paramsSecurity(sf, "2025–2029"), "2025–2029").berlaku, true);
  assert.equal(filterKeamanan([{ period: "2025–2029", jenis: "standar", atribut: { akhir: "2999-01-01" } }, { period: "2025–2029", jenis: "audit", atribut: {} }] as KegiatanKeamanan[], sf).length, 1);
});

test("homepage, domain move, integration metadata and sitemap have the requested public order", () => {
  assert.deepEqual(publicNav.map((n) => n.href), ["/", "/proses-bisnis", "/layanan", "/data", "/aplikasi", "/infrastruktur", "/keamanan", "/integrasi", "/peta-rencana"]);
  assert.equal(publicNav[0].label, "Ringkasan Umum"); assert.equal(publicNav[7].section, "Integrasi Domain");
  assert(indexablePages.some((p) => p.href === "/proses-bisnis")); assert(indexablePages.some((p) => p.href === "/integrasi"));
  assert(!indexablePages.some((p) => p.href === "/keamanan"));
  assert.equal(pageMetadata("/proses-bisnis").alternates?.canonical, "/proses-bisnis");
  assert(JSON.stringify(breadcrumbJsonLd("/integrasi")).includes("Integrasi Domain"));
});
