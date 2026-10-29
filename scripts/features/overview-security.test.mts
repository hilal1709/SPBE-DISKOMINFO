import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { Pool } from "pg";
import { DomainSankey } from "@/components/dashboards/overview-visuals";
import { readOverviewFromPages, readSecurityRelationPage } from "@/lib/integrasi/repo";
import type { DomainSummary, RelationSummary } from "@/lib/integrasi/model";

test("ringkasan anonim tidak membaca inventaris atau relasi Keamanan, termasuk setelah bacaan berizin", async () => {
  const calls: string[] = [];
  const readers = {
    summary: async (domain: string): Promise<DomainSummary[]> => { calls.push(domain); return []; },
    relations: async (): Promise<RelationSummary[]> => [],
    securityRelations: async (source: "data" | "aplikasi" | "infrastruktur"): Promise<RelationSummary[]> => {
      calls.push(`security:${source}`);
      return [{ source, target: "keamanan", sourceOpd: "A", targetOpd: "B", period: "P", count: 2 }];
    },
  };
  const authorized = await readOverviewFromPages(true, readers);
  assert.equal(authorized.relations.length, 3);
  assert(calls.includes("keamanan"));
  calls.length = 0;
  const anonymous = await readOverviewFromPages(false, readers);
  assert(anonymous.available);
  assert.deepEqual(anonymous.relations, []);
  assert(!calls.includes("keamanan") && !calls.some((call) => call.startsWith("security:")));
});

test("bagan ringkasan berizin memuat aliran ketiga domain ke Keamanan dan seluruh halaman agregat", async () => {
  const offsets: number[] = [];
  const data = await readOverviewFromPages(true, {
    summary: async () => [],
    relations: async () => [],
    securityRelations: async (source, offset) => {
      if (source === "data") offsets.push(offset);
      const row: RelationSummary = { source, target: "keamanan", sourceOpd: "A", targetOpd: "B", period: "P", count: 1 };
      return offset === 0 ? Array.from({ length: 100 }, () => row) : offset === 100 ? [row] : [];
    },
  });
  assert.deepEqual(offsets, [0, 100]);
  assert.equal(data.relations.reduce((sum, row) => sum + row.count, 0), 303);
  const html = renderToStaticMarkup(createElement(DomainSankey, { relations: data.relations, href: (source) => `/integrasi?domain=${source}` }));
  assert.equal((html.match(/<a /g) ?? []).length, 3);
  assert(html.includes("Data ke Keamanan") && html.includes("Aplikasi ke Keamanan") && html.includes("Infrastruktur ke Keamanan"));
  assert(html.includes("303 tautan langsung"));
});

test("query keamanan hanya menghitung pasangan tervalidasi dengan kode, jenis, dan periode yang cocok", async () => {
  const calls: { sql: string; params: unknown[] }[] = [];
  const db = { query: async (sql: string, params: unknown[]) => { calls.push({ sql, params }); return { rows: [] }; } } as unknown as Pool;
  for (const source of ["data", "aplikasi", "infrastruktur"] as const) {
    await readSecurityRelationPage(db, source, 100);
    const { sql, params } = calls.at(-1)!;
    assert.deepEqual(params, [source, 100, 100]);
    assert.match(sql, /s.status='approved'/);
    assert.match(sql, /t.status='approved'/);
    assert.match(sql, /t.code=refs.code and t.kind=e.key and t.period_id=s.period_id/);
    assert.match(sql, /select distinct value/);
    assert.match(sql, /jsonb_typeof\(value\)='string'/);
    assert.match(sql, /jsonb_typeof\(e.value\)='array'/);
    assert.match(sql, /jsonb_typeof\(s.security\)='object'/);
    assert(!sql.includes("attributes") && !sql.includes("t.name"));
  }
});

test("galat agregat tidak menampilkan hasil parsial seolah lengkap", async () => {
  const result = await readOverviewFromPages(true, {
    summary: async () => [], relations: async () => [],
    securityRelations: async () => { throw new Error("Database unavailable"); },
  });
  assert.deepEqual(result, { summary: [], relations: [], available: false });
});
