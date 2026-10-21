// Generator ilustrasi Lottie SPBE Gresik.
// Jalankan: node scripts/lottie/build.mjs  → menulis components/illustrations/data/*.json
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  anim, composition, curve, ease, ellipse, fill, group, layer, palette as c, path, pingPong, rect, stroke, trim,
} from "./lib.mjs";

const out = join(dirname(fileURLToPath(import.meta.url)), "../../components/illustrations/data");
mkdirSync(out, { recursive: true });

const star = (color) => group([path([[0, -8], [2, -2], [8, 0], [2, 2], [0, 8], [-2, 2], [-8, 0], [-2, -2]], true), fill(color)]);
const twinkle = (start, frames) =>
  anim([[0, [55, 55]], [start, [55, 55]], [start + 40, [110, 110]], [start + 80, [55, 55]], [frames, [55, 55]]], ease.inOut);

/* 1. Loader — lima lapisan arsitektur SPBE (warna sama dengan logo) tersusun dari bawah ke atas menjadi gapura. */
function loader() {
  const frames = 96;
  const widths = [24, 39, 54, 69, 84];
  const door = 12;
  const colors = [c.teal, c.yellow, c.amber, c.orange, c.sky];
  const layers = widths.map((w, i) => {
    const y = 30 + i * 15;
    const j = widths.length - 1 - i;
    const tin = j * 7;
    const tout = 60 + j * 3;
    // Dua lapisan dasar dibelah pintu gapura.
    const half = (w - door) / 2;
    const shapes = i >= 3 ? [rect(half, 10, 5, [-(door + half) / 2, 0]), rect(half, 10, 5, [(door + half) / 2, 0])] : [rect(w, 10, 5)];
    return layer(`lapisan-${i}`, group([...shapes, fill(colors[i])]), {
      p: anim([[0, [60, y - 12]], [tin, [60, y - 12]], [tin + 14, [60, y]], [tout, [60, y]], [tout + 12, [60, y + 6]], [frames, [60, y - 12]]]),
      o: anim([[0, 0], [tin, 0], [tin + 14, 100], [tout, 100], [tout + 12, 0], [frames, 0]]),
    });
  });
  return composition("loader", { w: 120, h: 120, frames, layers });
}

/* 2. Empty state — dokumen kosong yang sedang ditelusuri kaca pembesar. */
function empty() {
  const frames = 180;
  return composition("empty", {
    w: 400, h: 300, frames,
    layers: [
      layer("blob", group([ellipse(280, 210), fill(c.amberPale)]), { p: [200, 152], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(170, 16), fill(c.navy, 8)]), { p: [192, 258] }),
      layer("dokumen-belakang", group([rect(120, 150, 14), fill(c.surface), stroke(c.line, 2)]), { p: [172, 146], r: -8 }),
      layer("dokumen", [
        group([rect(60, 8, 4, [-22, -54]), fill(c.amber)]),
        group([rect(84, 6, 3, [0, -30]), rect(64, 6, 3, [-10, -14]), rect(84, 6, 3, [0, 2]), rect(52, 6, 3, [-16, 18]), fill(c.slateSoft)]),
        group([rect(84, 26, 6, [0, 48]), fill(c.surface)]),
        group([rect(124, 156, 14), fill(c.white), stroke(c.line, 2)]),
      ], { p: pingPong([196, 150], [196, 143], frames) }),
      layer("kaca-pembesar", [
        group([ellipse(58, 58), stroke(c.navy, 9)]),
        group([ellipse(50, 50), fill(c.white, 55)]),
        group([rect(12, 42, 6), fill(c.navy)], { p: [35, 35], r: -45 }),
      ], {
        p: anim([[0, [262, 194]], [60, [244, 176]], [120, [272, 168]], [180, [262, 194]]], ease.inOut),
        r: pingPong(0, -8, frames),
      }),
      layer("kilau-1", star(c.amber), { p: [108, 92], s: twinkle(0, frames) }),
      layer("kilau-2", star(c.teal), { p: [306, 96], s: twinkle(50, frames) }),
      layer("kilau-3", star(c.amber), { p: [322, 232], s: twinkle(95, frames) }),
    ],
  });
}

/* 3. Login hero — balai pemerintahan yang terhubung ke simpul layanan digital (untuk latar biru muda). */
function loginHero() {
  const frames = 240;
  const roof = [240, 150];
  const nodes = [[80, 120], [400, 110], [70, 310], [410, 318], [240, 58]];
  const nodeColors = [c.yellow, c.teal, c.orange, c.amber, c.teal];
  return composition("login-hero", {
    w: 480, h: 420, frames,
    layers: [
      layer("orbit", [
        group([ellipse(360, 360), stroke(c.charcoal, 1.5, { opacity: 14, dash: [4, 10], offset: anim([[0, 0], [frames, -56]], ease.linear) })]),
        group([ellipse(250, 250), fill(c.white, 35), stroke(c.charcoal, 1.5, { opacity: 18, dash: [2, 8], offset: anim([[0, 0], [frames, 40]], ease.linear) })]),
      ], { p: [240, 210] }),
      ...nodes.map(([x, y], i) =>
        layer(`jalur-${i}`, group([
          path([[roof[0], roof[1]], [x, y]]),
          stroke(c.charcoal, 1.5, { opacity: 35, dash: [6, 6], offset: anim([[0, 0], [frames, -48]], ease.linear) }),
        ])),
      ),
      layer("bayangan", group([ellipse(250, 16), fill(c.charcoal, 10)]), { p: [240, 324] }),
      layer("balai", [
        group([ellipse(14, 14, [0, -64]), fill(c.white)]),
        group([path([[-70, -52], [0, -84], [70, -52]], true), fill(c.orange)]),
        group([path([[-112, -46], [0, -100], [112, -46]], true), fill(c.amber)]),
        group([rect(196, 12, 3, [0, -38]), fill(c.charcoal)]),
        group([-72, -36, 0, 36, 72].map((x) => rect(14, 78, 3, [x, 6])).concat(fill(c.white))),
        group([rect(190, 10, 3, [0, 50]), fill(c.white)]),
        group([rect(220, 14, 4, [0, 62]), fill(c.charcoal)]),
      ], { p: [240, 250] }),
      ...nodes.flatMap(([x, y], i) => {
        const start = i * 40;
        return [
          layer(`halo-${i}`, group([ellipse(36, 36), fill(nodeColors[i])]), {
            p: [x, y],
            s: anim([[0, [60, 60]], [start, [60, 60]], [start + 60, [150, 150]], [frames, [150, 150]]]),
            o: anim([[0, 0], [start, 60], [start + 60, 0], [frames, 0]]),
          }),
          layer(`simpul-${i}`, [group([ellipse(7, 7), fill(c.white)]), group([ellipse(18, 18), fill(nodeColors[i])])], { p: [x, y] }),
        ];
      }),
      layer("kartu-data", [
        group([rect(50, 6, 3, [-12, -14]), fill(c.teal)]),
        group([rect(64, 5, 2.5, [-5, 0]), rect(40, 5, 2.5, [-17, 12]), fill(c.charcoal, 25)]),
        group([rect(92, 58, 12), fill(c.white)]),
      ], { p: pingPong([92, 240], [92, 230], frames) }),
      layer("kartu-grafik", [
        group([rect(10, 18, 2, [-16, 7]), fill(c.yellow)]),
        group([rect(10, 30, 2, [0, 1]), fill(c.orange)]),
        group([rect(10, 24, 2, [16, 4]), fill(c.teal)]),
        group([rect(70, 58, 12), fill(c.white)]),
      ], { p: pingPong([398, 238], [398, 248], frames, 0) }),
    ],
  });
}

/* 4. Not found — pin peta yang mendarat di rute putus-putus. */
function notFound() {
  const frames = 150;
  return composition("not-found", {
    w: 400, h: 300, frames,
    layers: [
      layer("bayangan", group([ellipse(160, 14), fill(c.navy, 7)]), { p: [200, 262] }),
      layer("peta", [
        group([path([[80, 100], [160, 85], [160, 235], [80, 250]], true), fill(c.white), stroke(c.line, 2)]),
        group([path([[160, 85], [240, 100], [240, 250], [160, 235]], true), fill(c.amberPale), stroke(c.line, 2)]),
        group([path([[240, 100], [320, 85], [320, 235], [240, 250]], true), fill(c.white), stroke(c.line, 2)]),
      ]),
      layer("rute", group([
        curve([[110, 216, 0, 0, 22, -22], [178, 182, -26, 6, 26, -6], [256, 146, -20, 10, 0, 0]]),
        stroke(c.navySoft, 3, { dash: [7, 7], offset: anim([[0, 0], [frames, -56]], ease.linear) }),
      ])),
      layer("titik-awal", group([ellipse(12, 12), fill(c.navy)]), { p: [110, 216] }),
      layer("bayangan-pin", group([ellipse(30, 8), fill(c.navy, 18)]), {
        p: [258, 146],
        s: anim([[0, [100, 100]], [24, [55, 55]], [48, [100, 100]], [64, [80, 80]], [80, [100, 100]], [frames, [100, 100]]], ease.inOut),
      }),
      layer("pin", [
        group([ellipse(14, 14, [0, -38]), fill(c.white)]),
        group([ellipse(40, 40, [0, -38]), path([[-17, -29], [17, -29], [0, 0]], true), fill(c.amber)]),
      ], {
        p: anim([[0, [258, 144]], [24, [258, 112]], [48, [258, 144]], [64, [258, 133]], [80, [258, 144]], [frames, [258, 144]]], ease.inOut),
        s: anim([[0, [100, 100]], [46, [100, 100]], [50, [112, 88]], [58, [100, 100]], [78, [100, 100]], [81, [106, 94]], [87, [100, 100]], [frames, [100, 100]]]),
      }),
      layer("kilau", star(c.amber), { p: [318, 72], s: twinkle(20, frames) }),
    ],
  });
}

/* 5. Error — steker yang gagal tersambung ke stopkontak. */
function error() {
  const frames = 150;
  const flash = anim([[0, 0], [34, 0], [36, 100], [44, 0], [50, 0], [52, 100], [60, 0], [frames, 0]], ease.linear);
  return composition("error", {
    w: 400, h: 300, frames,
    layers: [
      layer("bayangan", group([ellipse(220, 14), fill(c.navy, 7)]), { p: [200, 226] }),
      layer("soket", [
        group([rect(4, 9, 2, [-14, -7]), rect(4, 9, 2, [-14, 7]), fill(c.white, 55)]),
        group([rect(44, 36, 9), fill(c.navySoft)]),
        group([curve([[20, 0, 0, 0, 60, 0], [200, -48, -60, 10, 0, 0]]), stroke(c.navySoft, 6)]),
      ], { p: [246, 150] }),
      layer("steker", [
        group([rect(18, 5, 2, [30, -7]), rect(18, 5, 2, [30, 7]), fill(c.slate)]),
        group([rect(44, 36, 9), fill(c.navy)]),
        group([curve([[-200, 50, 0, 0, 80, 0], [-20, 0, -60, 0, 0, 0]]), stroke(c.navy, 6)]),
      ], { p: anim([[0, [160, 150]], [36, [184, 150]], [44, [176, 150]], [52, [184, 150]], [80, [160, 150]], [frames, [160, 150]]], ease.inOut) }),
      layer("percikan", group([
        path([[0, -10], [0, -22]]), path([[8, -8], [16, -16]]), path([[8, 8], [16, 16]]), path([[0, 10], [0, 22]]),
        stroke(c.amber, 3),
      ]), { p: [224, 150], o: flash, s: anim([[0, [70, 70]], [34, [70, 70]], [42, [120, 120]], [50, [70, 70]], [58, [120, 120]], [frames, [70, 70]]], ease.linear) }),
      layer("peringatan", [
        group([rect(4, 13, 2, [0, -3]), ellipse(5, 5, [0, 9]), fill(c.navy)]),
        group([ellipse(38, 38), fill(c.amberSoft)]),
      ], { p: [204, 82], s: pingPong([100, 100], [110, 110], frames) }),
    ],
  });
}

/* 6. Building — papan rancangan dengan grafik yang sedang disusun (modul dalam pengembangan). */
function building() {
  const frames = 180;
  const bars = [[-92, 40, c.yellow], [-62, 70, c.amber], [-32, 55, c.teal], [-2, 95, c.orange]];
  const grid = [];
  for (let x = -90; x <= 90; x += 30) grid.push(path([[x, -50], [x, 68]]));
  for (let y = -40; y <= 60; y += 25) grid.push(path([[-108, y], [108, y]]));
  return composition("building", {
    w: 400, h: 300, frames,
    layers: [
      layer("bayangan", group([ellipse(230, 14), fill(c.navy, 7)]), { p: [200, 252] }),
      layer("papan", [
        ...bars.map(([x, h, color], i) => {
          const t = 10 + i * 8;
          return group([rect(20, h, 4, [0, -h / 2]), fill(color)], {
            p: [x, 60],
            s: anim([[0, [100, 0]], [t, [100, 0]], [t + 26, [100, 100], ease.back], [150, [100, 100]], [168, [100, 0]], [frames, [100, 0]]]),
          });
        }),
        group([
          path([[30, 30], [52, 0], [74, 14], [100, -36]]),
          trim(0, anim([[0, 0], [40, 0], [100, 100], [150, 100], [166, 0], [frames, 0]], ease.inOut)),
          stroke(c.navy, 3.5),
        ]),
        group([rect(70, 8, 4, [-68, -64]), fill(c.navy, 80)]),
        group([rect(30, 8, 4, [86, -64]), fill(c.amber)]),
        group([...grid, stroke(c.line, 1)]),
        group([rect(240, 170, 14), fill(c.white), stroke(c.line, 2)]),
      ], { p: [194, 150] }),
      layer("roda-gigi", [
        group([ellipse(10, 10), fill(c.white)]),
        group([ellipse(28, 28), fill(c.teal)]),
        group([ellipse(44, 44), stroke(c.teal, 10, { dash: [7, 6.82] })]),
      ], { p: [318, 76], r: anim([[0, 0], [frames, 360]], ease.linear) }),
      layer("roda-gigi-kecil", [
        group([ellipse(14, 14), fill(c.navySoft)]),
        group([ellipse(26, 26), stroke(c.navySoft, 7, { dash: [5, 5.2] })]),
      ], { p: [350, 112], r: anim([[0, 0], [frames, -360]], ease.linear) }),
    ],
  });
}

/* 7. Success — lingkaran dan centang yang tergambar, diikuti konfeti (diputar sekali). */
function success() {
  const frames = 90;
  const confetti = Array.from({ length: 8 }, (_, i) => {
    const a = (i * Math.PI) / 4 + Math.PI / 8;
    const at = (d) => [100 + Math.cos(a) * d, 100 + Math.sin(a) * d];
    return layer(`konfeti-${i}`, group([ellipse(8, 8), fill([c.yellow, c.teal, c.orange, c.sky][i % 4])]), {
      p: anim([[0, at(46)], [30, at(46)], [70, at(84)], [frames, at(84)]]),
      o: anim([[0, 0], [30, 0], [34, 100], [70, 0], [frames, 0]], ease.linear),
    });
  });
  return composition("success", {
    w: 200, h: 200, frames,
    layers: [
      layer("latar", group([ellipse(120, 120), fill(c.success, 12)]), {
        p: [100, 100],
        s: anim([[0, [0, 0]], [18, [115, 115], ease.back], [28, [100, 100]], [frames, [100, 100]]]),
      }),
      layer("cincin", group([ellipse(96, 96), trim(0, anim([[0, 0], [6, 0], [36, 100], [frames, 100]], ease.inOut)), stroke(c.success, 6)]), { p: [100, 100], r: -90 }),
      layer("centang", group([path([[-22, 2], [-6, 18], [24, -14]]), trim(0, anim([[0, 0], [26, 0], [50, 100], [frames, 100]], ease.inOut)), stroke(c.success, 8)]), { p: [100, 100] }),
      ...confetti,
    ],
  });
}

/* 8. Explore — kursor mengeklik petak treemap; petak lain meredup (petunjuk interaksi dashboard). */
function explore() {
  const frames = 180;
  const click = 62;
  const dim = anim([[0, 100], [click + 6, 100], [click + 16, 40], [140, 40], [156, 100], [frames, 100]], ease.inOut);
  const tile = (name, w, h, x, y, opacity, o) => layer(name, group([rect(w, h, 4), fill(c.teal, opacity)]), { p: [120 + x, 80 + y], o });
  return composition("explore", {
    w: 240, h: 160, frames,
    layers: [
      layer("bayangan", group([ellipse(190, 10), fill(c.navy, 8)]), { p: [120, 150] }),
      layer("papan", group([rect(204, 120, 12), fill(c.white), stroke(c.line, 2)]), { p: [120, 80] }),
      tile("petak-a", 96, 108, -46, 0, 100, dim),
      tile("petak-b", 92, 52, 50, -28, 70, dim),
      tile("petak-c", 44, 52, 26, 28, 45),
      tile("petak-d", 44, 52, 74, 28, 30, dim),
      layer("sorot", group([rect(44, 52, 4), stroke(c.charcoal, 3)]), {
        p: [146, 108],
        o: anim([[0, 0], [click + 2, 0], [click + 10, 100], [140, 100], [150, 0], [frames, 0]], ease.linear),
      }),
      layer("riak", group([ellipse(30, 30), stroke(c.charcoal, 2.5)]), {
        p: [146, 108],
        s: anim([[0, [0, 0]], [click, [0, 0]], [click + 30, [180, 180]], [frames, [180, 180]]]),
        o: anim([[0, 0], [click, 70], [click + 30, 0], [frames, 0]], ease.linear),
      }),
      layer("kursor", group([
        path([[0, 0], [0, 22], [6, 16], [10, 26], [14, 24], [10, 15], [18, 15]], true),
        fill(c.charcoal),
        stroke(c.white, 2),
      ]), {
        p: anim([[0, [214, 150]], [48, [146, 108]], [140, [146, 108]], [170, [214, 150]], [frames, [214, 150]]], ease.inOut),
        s: anim([[0, [100, 100]], [click - 4, [100, 100]], [click, [82, 82]], [click + 8, [100, 100]], [frames, [100, 100]]]),
      }),
    ],
  });
}

/* 9. Filter empty — corong menelan titik data, tapi tak ada yang keluar (hasil filter kosong). */
function filterEmpty() {
  const frames = 180;
  const dots = [[-50, c.teal, 0], [-15, c.yellow, 30], [25, c.orange, 60], [55, c.sky, 90]];
  return composition("filter-empty", {
    w: 400, h: 300, frames,
    layers: [
      layer("blob", group([ellipse(300, 220), fill(c.amberPale)]), { p: [200, 150], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(170, 14), fill(c.navy, 7)]), { p: [200, 262] }),
      layer("tetes", group([ellipse(8, 8), fill(c.navySoft, 40)]), {
        p: anim([[0, [200, 228]], [frames / 2, [200, 236]], [frames, [200, 228]]], ease.inOut),
        o: pingPong(0, 70, frames),
      }),
      layer("corong", [
        group([ellipse(180, 22, [0, -60]), fill(c.amberPale), stroke(c.navySoft, 3)]),
        group([path([[-90, -60], [90, -60], [12, 20], [12, 62], [-12, 62], [-12, 20]], true), fill(c.white), stroke(c.navySoft, 3)]),
      ], { p: [200, 160] }),
      ...dots.map(([x, color, t], i) =>
        layer(`titik-${i}`, group([ellipse(14, 14), fill(color)]), {
          p: anim([[0, [200 + x, 40]], [t, [200 + x, 40]], [t + 44, [200 + x * 0.3, 128], ease.inOut], [frames, [200 + x * 0.3, 128]]]),
          o: anim([[0, 0], [t, 0], [t + 6, 100], [t + 40, 100], [t + 50, 0], [frames, 0]], ease.linear),
        }),
      ),
      layer("gelembung", [
        ...[-10, 0, 10].map((x, i) => group([ellipse(6, 6, [x, 0]), fill(c.navy)], { o: anim([[0, 30], [20 + i * 15, 100], [50 + i * 15, 30], [frames, 30]], ease.inOut) })),
        group([ellipse(46, 34), fill(c.amberSoft)]),
      ], { p: [300, 86], s: pingPong([100, 100], [106, 106], frames) }),
    ],
  });
}

/* 10. Service desk — nomor antrean dari loket berpindah ke ponsel; formulir terisi dan tercentang (digitalisasi layanan). */
function serviceDesk() {
  const frames = 180;
  const loop = (on, off) => anim([[0, 0], [on, 0], [on + 8, 100], [off, 100], [off + 10, 0], [frames, 0]], ease.linear);
  // Baris formulir tumbuh dari kiri: titik asal grup di tepi kiri baris.
  const field = (y, w, t) => group([rect(w, 5, 2.5, [w / 2, 0]), fill(c.slateSoft)], {
    p: [-17, y],
    s: anim([[0, [0, 100]], [t, [0, 100]], [t + 16, [100, 100]], [150, [100, 100]], [164, [0, 100]], [frames, [0, 100]]]),
  });
  return composition("service-desk", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(220, 140), fill(c.amberPale)]), { p: [120, 80], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(200, 10), fill(c.navy, 8)]), { p: [120, 144] }),
      layer("loket", [
        group([rect(30, 9, 3), fill(c.yellow)], { p: [0, -40] }),
        group([rect(40, 30, 4), fill(c.surface), stroke(c.line, 2)], { p: [0, -12] }),
        group([rect(96, 10, 3), fill(c.charcoal)], { p: [0, 8] }),
        group([rect(84, 76, 6), fill(c.white), stroke(c.line, 2)], { p: [0, 0] }),
      ], { p: [64, 82] }),
      layer("ponsel", [
        group([rect(34, 12, 6), fill(c.amber)], { p: [0, 30], o: anim([[0, 100], [84, 100], [92, 0], [150, 0], [158, 100], [frames, 100]], ease.linear) }),
        group([rect(34, 12, 6), fill(c.teal)], { p: [0, 30] }),
        field(-14, 34, 56),
        field(-2, 26, 66),
        field(10, 30, 76),
        group([rect(46, 10, 3), fill(c.sky)], { p: [0, -34] }),
        group([rect(58, 100, 10), fill(c.white), stroke(c.charcoal, 3)]),
      ], { p: [172, 84] }),
      layer("jejak", group([curve([[96, 58], [126, 34], [150, 52]]), trim(0, anim([[0, 0], [12, 0], [50, 100], [150, 100], [166, 0], [frames, 0]], ease.inOut)), stroke(c.charcoal, 2, { opacity: 60, dash: [4, 4] })]), {}),
      layer("tiket", group([rect(22, 14, 3), fill(c.yellow), stroke(c.charcoal, 1.5)]), {
        p: anim([[0, [70, 66]], [12, [70, 66]], [52, [172, 64], ease.inOut], [frames, [172, 64]]]),
        s: anim([[0, [100, 100]], [44, [100, 100]], [56, [0, 0]], [frames, [0, 0]]]),
        o: loop(8, 50),
      }),
      layer("centang", [
        group([path([[-6, 0], [-2, 4], [6, -4]]), trim(0, anim([[0, 0], [96, 0], [112, 100], [150, 100], [160, 0], [frames, 0]], ease.inOut)), stroke(c.white, 3)]),
        group([ellipse(24, 24), fill(c.teal)]),
      ], {
        p: [196, 34],
        s: anim([[0, [0, 0]], [88, [0, 0]], [100, [100, 100], ease.back], [150, [100, 100]], [162, [0, 0]], [frames, [0, 0]]]),
      }),
    ],
  });
}

/* 11. Katalog data — kartu data dari dokumen masuk ke basis data, baris katalog bertambah, lalu tercentang. */
function dataCatalog() {
  const frames = 180;
  // Satu tingkat silinder: tutup atas, badan, dan alas melengkung.
  const disk = (y, led) => group([
    group([ellipse(5, 5, [18, 2]), fill(c.white)], { o: led }),
    group([ellipse(60, 16, [0, -10]), fill(c.sky), stroke(c.charcoal, 2)]),
    group([path([[-30, -10], [-30, 10]]), path([[30, -10], [30, 10]]), stroke(c.charcoal, 2)]),
    group([rect(60, 20), fill(c.teal)]),
    group([ellipse(60, 16, [0, 10]), fill(c.teal), stroke(c.charcoal, 2)]),
  ], { p: [0, y] });
  const blink = (t) => anim([[0, 100], [t, 100], [t + 4, 20], [t + 10, 100], [frames, 100]], ease.linear);
  // Baris katalog tumbuh dari kiri: titik asal grup di tepi kiri baris.
  const row = (y, w, t) => group([rect(w, 5, 2.5, [w / 2, 0]), fill(c.slateSoft)], {
    p: [-14, y],
    s: anim([[0, [0, 100]], [t, [0, 100]], [t + 16, [100, 100]], [150, [100, 100]], [164, [0, 100]], [frames, [0, 100]]]),
  });
  return composition("data-catalog", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(220, 140), fill(c.amberPale)]), { p: [120, 80], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(200, 10), fill(c.navy, 8)]), { p: [120, 144] }),
      layer("basis data", [disk(-24, blink(60)), disk(0, blink(66)), disk(24, blink(72))], {
        p: [78, 92],
        s: anim([[0, [100, 100]], [52, [100, 100]], [58, [104, 96], ease.inOut], [66, [100, 100], ease.back], [frames, [100, 100]]]),
      }),
      layer("kartu belakang", group([rect(58, 76, 8), fill(c.surface), stroke(c.line, 2)]), { p: [186, 88] }),
      layer("katalog", [
        group([ellipse(6, 6, [-20, -14]), fill(c.teal)]),
        group([ellipse(6, 6, [-20, -2]), fill(c.teal)]),
        group([ellipse(6, 6, [-20, 10]), fill(c.amber)]),
        row(-14, 32, 70),
        row(-2, 26, 80),
        row(10, 30, 90),
        group([rect(46, 10, 3), fill(c.yellow)], { p: [0, -32] }),
        group([rect(58, 76, 8), fill(c.white), stroke(c.charcoal, 3)]),
      ], { p: [178, 80] }),
      layer("jejak", group([curve([[150, 52], [124, 26], [96, 46]]), trim(0, anim([[0, 0], [12, 0], [50, 100], [150, 100], [166, 0], [frames, 0]], ease.inOut)), stroke(c.charcoal, 2, { opacity: 60, dash: [4, 4] })]), {}),
      layer("kartu data", group([rect(22, 14, 3), fill(c.yellow), stroke(c.charcoal, 1.5)]), {
        p: anim([[0, [156, 56]], [12, [156, 56]], [52, [80, 58], ease.inOut], [frames, [80, 58]]]),
        s: anim([[0, [100, 100]], [44, [100, 100]], [56, [0, 0]], [frames, [0, 0]]]),
        o: anim([[0, 0], [8, 0], [16, 100], [50, 100], [60, 0], [frames, 0]], ease.linear),
      }),
      layer("centang", [
        group([path([[-6, 0], [-2, 4], [6, -4]]), trim(0, anim([[0, 0], [96, 0], [112, 100], [150, 100], [160, 0], [frames, 0]], ease.inOut)), stroke(c.white, 3)]),
        group([ellipse(24, 24), fill(c.teal), stroke(c.white, 2)]),
      ], {
        p: [112, 52],
        s: anim([[0, [0, 0]], [88, [0, 0]], [100, [100, 100], ease.back], [150, [100, 100]], [162, [0, 0]], [frames, [0, 0]]]),
      }),
    ],
  });
}

/* 12. Ekosistem aplikasi — modul aplikasi web dan ponsel muncul, lalu bertukar data lewat awan penghubung (SPLP). */
function appEcosystem() {
  const frames = 180;
  // Modul/ikon muncul berurutan lalu menghilang menjelang akhir siklus.
  const pop = (t) => anim([[0, [0, 0]], [t, [0, 0]], [t + 12, [100, 100], ease.back], [150, [100, 100]], [160, [0, 0]], [frames, [0, 0]]]);
  const tile = (x, y, w, h, color, t) => group([rect(w, h, 3), fill(color)], { p: [x, y], s: pop(t) });
  const icon = (x, y, color, t) => group([rect(11, 11, 3.5), fill(color)], { p: [x, y], s: pop(t) });
  const link = (points, t) => group([curve(points), trim(0, anim([[0, 0], [t, 0], [t + 30, 100], [150, 100], [166, 0], [frames, 0]], ease.inOut)), stroke(c.charcoal, 2, { opacity: 60, dash: [4, 4] })]);
  // Paket data bergerak bolak-balik antara aplikasi dan awan.
  const packet = (from, to, t, color) =>
    layer("paket", group([rect(9, 9, 2.5), fill(color), stroke(c.charcoal, 1.2)]), {
      p: anim([[0, from], [t, from], [t + 26, to, ease.inOut], [t + 52, from, ease.inOut], [frames, from]]),
      o: anim([[0, 0], [t - 2, 0], [t + 2, 100], [t + 50, 100], [t + 54, 0], [frames, 0]], ease.linear),
    });
  return composition("app-ecosystem", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(220, 140), fill(c.amberPale)]), { p: [120, 80], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(200, 10), fill(c.navy, 8)]), { p: [120, 144] }),
      layer("tautan", [link([[86, 50], [96, 26], [118, 28]], 40), link([[192, 54], [186, 28], [162, 28]], 52)], {}),
      layer("awan", [
        group([rect(14, 4, 2), fill(c.white)], { p: [0, 4], o: anim([[0, 100], [70, 100], [74, 30], [80, 100], [110, 100], [114, 30], [120, 100], [frames, 100]], ease.linear) }),
        group([ellipse(30, 26, [0, -4]), ellipse(22, 18, [-14, 3]), ellipse(22, 16, [14, 4]), rect(40, 12, 6, [0, 6]), fill(c.sky)]),
      ], { p: [140, 30], s: pingPong([100, 100], [106, 106], 90) }),
      layer("peramban", [
        tile(-26, -4, 36, 22, c.teal, 20),
        tile(16, -4, 30, 22, c.amber, 28),
        tile(-26, 22, 22, 14, c.yellow, 36),
        tile(6, 22, 50, 14, c.slateSoft, 44),
        group([ellipse(5, 5, [-42, -27]), ellipse(5, 5, [-34, -27]), ellipse(5, 5, [-26, -27]), fill(c.white)]),
        group([rect(104, 12, 0, [0, -27]), fill(c.charcoal)]),
        group([rect(104, 74, 8), fill(c.white), stroke(c.charcoal, 3)]),
      ], { p: [84, 92] }),
      layer("ponsel", [
        icon(-8, -14, c.teal, 60),
        icon(8, -14, c.yellow, 66),
        icon(-8, 2, c.amber, 72),
        icon(8, 2, c.sky, 78),
        group([rect(14, 3, 1.5, [0, 24]), fill(c.line)]),
        group([rect(42, 74, 9), fill(c.surface), stroke(c.charcoal, 3)]),
      ], { p: [192, 96] }),
      packet([90, 52], [124, 30], 74, c.yellow),
      packet([190, 56], [156, 30], 96, c.teal),
      layer("centang", [
        group([path([[-6, 0], [-2, 4], [6, -4]]), trim(0, anim([[0, 0], [118, 0], [130, 100], [150, 100], [160, 0], [frames, 0]], ease.inOut)), stroke(c.white, 3)]),
        group([ellipse(24, 24), fill(c.teal), stroke(c.white, 2)]),
      ], {
        p: [134, 58],
        s: anim([[0, [0, 0]], [110, [0, 0]], [122, [100, 100], ease.back], [150, [100, 100]], [162, [0, 0]], [frames, [0, 0]]]),
      }),
    ],
  });
}

/* 13. Pusat data — dua rak server dengan lampu berkedip, tersambung ke awan lewat jaringan; paket data mengalir. */
function dataCenter() {
  const frames = 180;
  // Lampu indikator berkedip bergantian (fase berbeda per unit).
  const led = (x, y, color, t) =>
    group([ellipse(4.5, 4.5, [x, y]), fill(color)], { o: anim([[0, 100], [t, 100], [t + 6, 25], [t + 14, 100], [t + 70, 100], [t + 76, 25], [t + 84, 100], [frames, 100]], ease.linear) });
  // Satu unit server: pelat, celah ventilasi, dan dua lampu.
  const unit = (y, color, t) => [
    led(14, y, c.teal, t),
    led(7, y, color, t + 9),
    group([path([[-16, y - 1.5], [-2, y - 1.5]]), path([[-16, y + 1.5], [-2, y + 1.5]]), stroke(c.slate, 1.2, { opacity: 70 })]),
    group([rect(42, 13, 2.5, [0, y]), fill(c.surface), stroke(c.charcoal, 1.6)]),
  ];
  const rack = (name, x, height, units, delay) =>
    layer(name, [
      ...units.flatMap(([y, color], i) => unit(y, color, delay + i * 11)),
      group([rect(54, height, 6), fill(c.white), stroke(c.charcoal, 3)]),
      group([rect(46, 6, 2, [0, height / 2 + 2]), fill(c.charcoal)]),
    ], {
      p: [x, 146 - height / 2 - 6],
      s: anim([[0, [100, 0]], [delay, [100, 0]], [delay + 18, [100, 100], ease.back], [156, [100, 100]], [168, [100, 0]], [frames, [100, 0]]]),
      a: [0, height / 2 + 6],
    });
  const wire = (points, t) => group([curve(points), trim(0, anim([[0, 0], [t, 0], [t + 28, 100], [150, 100], [166, 0], [frames, 0]], ease.inOut)), stroke(c.charcoal, 2, { opacity: 60, dash: [4, 4] })]);
  const packet = (from, to, t, color) =>
    layer("paket", group([rect(8, 8, 2.5), fill(color), stroke(c.charcoal, 1.2)]), {
      p: anim([[0, from], [t, from], [t + 30, to, ease.inOut], [frames, to]]),
      o: anim([[0, 0], [t - 2, 0], [t + 2, 100], [t + 28, 100], [t + 32, 0], [frames, 0]], ease.linear),
    });
  return composition("data-center", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(220, 140), fill(c.amberPale)]), { p: [120, 80], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(200, 10), fill(c.navy, 8)]), { p: [120, 144] }),
      layer("jaringan", [wire([[84, 52], [104, 22], [150, 26]], 46), wire([[150, 66], [170, 48], [176, 40]], 58)], {}),
      rack("rak kiri", 62, 88, [[-28, c.yellow], [-12, c.amber], [4, c.yellow], [20, c.sky]], 6),
      rack("rak kanan", 126, 70, [[-20, c.amber], [-4, c.yellow], [12, c.teal]], 16),
      layer("awan", [
        group([rect(14, 4, 2), fill(c.white)], { p: [0, 4], o: anim([[0, 100], [86, 100], [90, 30], [96, 100], [126, 100], [130, 30], [136, 100], [frames, 100]], ease.linear) }),
        group([ellipse(32, 28, [0, -4]), ellipse(24, 20, [-15, 3]), ellipse(24, 18, [15, 4]), rect(44, 12, 6, [0, 6]), fill(c.sky), stroke(c.charcoal, 2)]),
      ], { p: [184, 34], s: pingPong([100, 100], [106, 106], 90) }),
      layer("menara", [
        group([path([[0, -18], [-10, 18]]), path([[0, -18], [10, 18]]), path([[-6, 6], [6, 6]]), stroke(c.charcoal, 2.5)]),
        group([ellipse(7, 7, [0, -20]), fill(c.orange)]),
      ], { p: [190, 122] }),
      layer("sinyal", group([ellipse(14, 14), stroke(c.orange, 2)]), {
        p: [190, 102],
        s: anim([[0, [40, 40]], [60, [40, 40]], [90, [220, 220]], [91, [40, 40]], [120, [220, 220]], [frames, [220, 220]]], ease.out),
        o: anim([[0, 0], [60, 0], [62, 90], [90, 0], [92, 90], [120, 0], [frames, 0]], ease.linear),
      }),
      packet([86, 50], [160, 30], 74, c.yellow),
      packet([150, 64], [178, 42], 104, c.teal),
    ],
  });
}

/* 14. Perisai keamanan — perisai bergembok dipindai garis cahaya, titik ancaman ditepis, lalu centang. */
function securityShield() {
  const frames = 180;
  const shield = (s) => [[0, -42 * s], [36 * s, -30 * s], [32 * s, 10 * s], [0, 42 * s], [-32 * s, 10 * s], [-36 * s, -30 * s]];
  // Titik ancaman mendekat lalu terpental saat menyentuh perisai.
  const threat = (from, hit, t) =>
    layer("ancaman", group([ellipse(8, 8), fill(c.orange), stroke(c.charcoal, 1.2)]), {
      p: anim([[0, from], [t, from], [t + 22, hit, ease.inOut], [t + 40, from, ease.out], [frames, from]]),
      o: anim([[0, 0], [t - 2, 0], [t + 2, 100], [t + 34, 100], [t + 40, 0], [frames, 0]], ease.linear),
      s: anim([[0, [100, 100]], [t + 20, [100, 100]], [t + 24, [140, 70]], [t + 30, [100, 100]], [frames, [100, 100]]]),
    });
  return composition("security-shield", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(220, 140), fill(c.amberPale)]), { p: [120, 80], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(150, 10), fill(c.navy, 8)]), { p: [120, 144] }),
      layer("riak", group([path(shield(1.05), true), stroke(c.teal, 2)]), {
        p: [120, 80],
        s: anim([[0, [100, 100]], [40, [100, 100]], [80, [130, 130]], [81, [100, 100]], [120, [130, 130]], [frames, [130, 130]]], ease.out),
        o: anim([[0, 0], [40, 0], [42, 70], [80, 0], [82, 70], [120, 0], [frames, 0]], ease.linear),
      }),
      layer("perisai", [
        group([path(shield(0.74), true), fill(c.sky)]),
        group([path(shield(1), true), fill(c.teal), stroke(c.charcoal, 3)]),
      ], { p: [120, 80], s: anim([[0, [0, 0]], [6, [0, 0]], [26, [100, 100], ease.back], [158, [100, 100]], [170, [0, 0]], [frames, [0, 0]]]) }),
      layer("gembok", [
        group([ellipse(6, 6, [0, 2]), rect(3, 7, 1.5, [0, 7]), fill(c.charcoal)]),
        group([rect(30, 24, 5, [0, 6]), fill(c.yellow), stroke(c.charcoal, 2.5)]),
        group([curve([[-9, -6], [-9, -20], [9, -20], [9, -6]]), stroke(c.charcoal, 3)], {
          p: anim([[0, [0, -6]], [30, [0, -6]], [40, [0, 0], ease.back], [frames, [0, 0]]]),
        }),
      ], { p: [120, 76], s: anim([[0, [0, 0]], [18, [0, 0]], [32, [100, 100], ease.back], [156, [100, 100]], [168, [0, 0]], [frames, [0, 0]]]) }),
      layer("pindai", group([rect(64, 3, 1.5), fill(c.white, 70)]), {
        p: anim([[0, [120, 50]], [44, [120, 50]], [74, [120, 108], ease.inOut], [104, [120, 50], ease.inOut], [frames, [120, 50]]]),
        o: anim([[0, 0], [44, 0], [48, 100], [100, 100], [104, 0], [frames, 0]], ease.linear),
      }),
      threat([30, 50], [86, 62], 52),
      threat([212, 110], [152, 96], 70),
      threat([206, 34], [150, 56], 90),
      layer("centang", [
        group([path([[-6, 0], [-2, 4], [6, -4]]), trim(0, anim([[0, 0], [126, 0], [138, 100], [150, 100], [160, 0], [frames, 0]], ease.inOut)), stroke(c.white, 3)]),
        group([ellipse(24, 24), fill(c.teal), stroke(c.white, 2)]),
      ], {
        p: [152, 112],
        s: anim([[0, [0, 0]], [118, [0, 0]], [130, [100, 100], ease.back], [150, [100, 100]], [162, [0, 0]], [frames, [0, 0]]]),
      }),
    ],
  });
}

/* 15. Peta rencana — jalan berkelok tergambar, tonggak tahunan bermunculan berurutan, penanda bergerak menuju bendera target. */
function roadmap() {
  const frames = 180;
  const road = curve([[26, 132, 0, 0, 34, -6], [92, 108, -30, 10, 30, -10], [148, 116, -26, 0, 30, 0], [212, 52, 4, 34, 0, 0]]);
  const drawn = trim(0, anim([[0, 0], [4, 0], [52, 100, ease.inOut], [frames, 100]]));
  // Pin tonggak: kepala bulat + ekor runcing, ujung ekor tepat di jalan.
  const pin = (at, color, t) =>
    layer("tonggak", [
      group([ellipse(7, 7, [0, -22]), fill(c.white)]),
      group([path([[-9, -20], [0, 0], [9, -20]], true), ellipse(20, 20, [0, -22]), fill(color), stroke(c.charcoal, 2)]),
    ], {
      p: at,
      s: anim([[0, [0, 0]], [t, [0, 0]], [t + 14, [100, 100], ease.back], [156, [100, 100]], [166, [0, 0]], [frames, [0, 0]]]),
    });
  const stops = [[56, 122], [92, 108], [148, 116], [196, 86]];
  return composition("roadmap", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(224, 144), fill(c.amberPale)]), { p: [120, 82], s: pingPong([100, 100], [104, 104], frames) }),
      layer("bayangan", group([ellipse(170, 10), fill(c.navy, 8)]), { p: [120, 146] }),
      layer("jalan", [
        group([road, drawn, stroke(c.white, 2, { dash: [6, 6] })]),
        group([road, drawn, stroke(c.charcoal, 12)]),
      ], { o: anim([[0, 100], [158, 100], [172, 0], [frames, 0]], ease.linear) }),
      pin(stops[0], c.teal, 26),
      pin(stops[1], c.yellow, 42),
      pin(stops[2], c.amber, 58),
      pin(stops[3], c.orange, 74),
      layer("bendera", [
        group([path([[0, 0], [22, 6], [0, 13]], true), fill(c.teal), stroke(c.charcoal, 2)], { p: [0, -36], r: pingPong(0, -6, 40, 100) }),
        group([path([[0, 0], [0, -36]]), stroke(c.charcoal, 3)]),
      ], {
        p: [212, 54],
        s: anim([[0, [0, 0]], [88, [0, 0]], [102, [100, 100], ease.back], [156, [100, 100]], [166, [0, 0]], [frames, [0, 0]]]),
      }),
      layer("penanda", group([ellipse(12, 12), fill(c.yellow), stroke(c.charcoal, 2)]), {
        p: anim([[0, [26, 132]], [100, [26, 132]], [112, [56, 120], ease.inOut], [122, [92, 106], ease.inOut], [134, [148, 114], ease.inOut], [144, [196, 84], ease.inOut], [152, [210, 56], ease.inOut], [frames, [210, 56]]]),
        o: anim([[0, 0], [98, 0], [102, 100], [154, 100], [160, 0], [frames, 0]], ease.linear),
      }),
    ],
  });
}

/* 16. Gap analysis — dua tebing (AS-IS & target) dipisah jurang, balok jembatan tersusun satu per satu, lalu bendera berkibar. */
function gapBridge() {
  const frames = 180;
  const cliff = (points, color) => group([path(points, true), fill(color), stroke(c.charcoal, 2.5)]);
  // Balok jembatan jatuh dari atas lalu mengunci di tempatnya.
  const plank = (x, t, color) =>
    layer("balok", group([rect(16, 8, 2), fill(color), stroke(c.charcoal, 2)]), {
      p: anim([[0, [x, 40]], [t, [x, 40]], [t + 14, [x, 92], ease.back], [frames, [x, 92]]]),
      o: anim([[0, 0], [t, 0], [t + 4, 100], [158, 100], [168, 0], [frames, 0]], ease.linear),
    });
  return composition("gap-bridge", {
    w: 240, h: 160, frames,
    layers: [
      layer("blob", group([ellipse(224, 144), fill(c.amberPale)]), { p: [120, 82], s: pingPong([100, 100], [104, 104], frames) }),
      layer("tebing-kiri", cliff([[8, 96], [78, 96], [70, 150], [8, 150]], c.sky)),
      layer("tebing-kanan", cliff([[162, 96], [232, 96], [232, 150], [170, 150]], c.teal)),
      layer("jurang", group([path([[78, 112], [92, 104], [106, 114], [120, 104], [134, 114], [148, 104], [162, 112]]), stroke(c.slate, 2, { dash: [3, 4] })]), {
        o: anim([[0, 100], [60, 100], [90, 30], [frames, 30]], ease.linear),
      }),
      plank(87, 20, c.yellow),
      plank(104, 34, c.amber),
      plank(121, 48, c.yellow),
      plank(138, 62, c.amber),
      plank(155, 76, c.yellow),
      layer("orang", [
        group([ellipse(10, 10, [0, -18]), fill(c.charcoal)]),
        group([rect(10, 16, 4, [0, -4]), fill(c.orange), stroke(c.charcoal, 2)]),
      ], {
        p: anim([[0, [40, 92]], [92, [40, 92]], [140, [196, 92], ease.inOut], [frames, [196, 92]]]),
        o: anim([[0, 100], [158, 100], [168, 0], [frames, 0]], ease.linear),
      }),
      layer("bendera", [
        group([path([[0, 0], [20, 6], [0, 12]], true), fill(c.orange), stroke(c.charcoal, 2)], { p: [0, -34], r: pingPong(0, -8, 40, 0) }),
        group([path([[0, 0], [0, -34]]), stroke(c.charcoal, 3)]),
      ], { p: [214, 96], s: anim([[0, [0, 0]], [138, [0, 0]], [150, [100, 100], ease.back], [158, [100, 100]], [168, [0, 0]], [frames, [0, 0]]]) }),
    ],
  });
}

const builds = {
  loader, empty, "login-hero": loginHero, "not-found": notFound, error, building, success, explore, "filter-empty": filterEmpty,
  "service-desk": serviceDesk, "data-catalog": dataCatalog, "app-ecosystem": appEcosystem, "data-center": dataCenter, "security-shield": securityShield, roadmap, "gap-bridge": gapBridge,
};
for (const [name, build] of Object.entries(builds)) {
  const json = JSON.stringify(build());
  writeFileSync(join(out, `${name}.json`), json);
  console.log(`${name}.json  ${(json.length / 1024).toFixed(1)} KB`);
}
