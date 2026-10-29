import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DomainSankey } from "@/components/dashboards/overview-visuals";
import type { RelationSummary } from "@/lib/integrasi/model";

test("Sankey aggregates only supplied direct links and retains accessible navigation", () => {
  const relations: RelationSummary[] = [
    { source: "aplikasi", target: "data", sourceOpd: "A", targetOpd: "B", period: "P", count: 7 },
    { source: "aplikasi", target: "data", sourceOpd: "C", targetOpd: "B", period: "P", count: 3 },
    { source: "data", target: "probis", sourceOpd: "B", targetOpd: "A", period: "P", count: 5 },
  ];
  const before = JSON.stringify(relations);
  const html = renderToStaticMarkup(createElement(DomainSankey, { relations, href: (source) => `/integrasi?domain=${source}&periode=P` }));
  assert.equal((html.match(/<a /g) ?? []).length, 2);
  assert(html.includes("15 tautan langsung"));
  assert(html.includes("10 relasi langsung"));
  assert(html.includes("/integrasi?domain=aplikasi&amp;periode=P"));
  assert(!html.includes("NaN") && !html.includes("Infinity"));
  assert.equal(JSON.stringify(relations), before);
  const empty = renderToStaticMarkup(createElement(DomainSankey, { relations: [], href: () => "/integrasi" }));
  assert(empty.includes("Belum ada hubungan langsung"));
});

test("original banner Lotties are small, animated and distinct, with six overview domain tiles", () => {
  const files = ["spbe-overview", "domain-integration"].map((name) => readFileSync(`components/illustrations/data/${name}.json`, "utf8"));
  assert.notEqual(files[0], files[1]);
  for (const source of files) {
    assert(Buffer.byteLength(source) < 30_000);
    const asset = JSON.parse(source);
    assert.equal(asset.w, 240); assert.equal(asset.h, 160);
    assert.equal(asset.assets.length, 0);
    assert(asset.layers.some((layer: { ks: { p: { a: number } } }) => layer.ks.p.a === 1));
    assert(asset.layers.some((layer: { ks: { s: { a: number } } }) => layer.ks.s.a === 1));
  }
  const overview = JSON.parse(files[0]);
  assert.equal(overview.layers.filter((layer: { nm: string }) => layer.nm.startsWith("domain-")).length, 6);
  assert.equal(JSON.parse(files[1]).layers[0].nm, "selection");
});
