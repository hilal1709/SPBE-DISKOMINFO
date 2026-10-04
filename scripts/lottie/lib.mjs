// Helper kecil untuk menyusun animasi Lottie (bodymovin 5.x) dari kode.
// Semua ilustrasi SPBE dibuat dari bentuk primitif agar ringan dan mudah diubah.

export const FPS = 60;

// Palet Diskominfo (sama dengan token di app/globals.css).
export const palette = {
  sky: "#BBDEF0",
  teal: "#00A6A6",
  yellow: "#EFCA08",
  amber: "#F49F0A",
  orange: "#F08700",
  charcoal: "#2D2D2F",
  // Nama lama dipetakan ke palet baru agar ilustrasi tetap terbaca.
  amberDeep: "#F08700",
  amberSoft: "#EFCA08",
  amberPale: "#E3F1F8",
  navy: "#2D2D2F",
  navySoft: "#46464A",
  slate: "#5F6B76",
  slateSoft: "#BBDEF0",
  line: "#E2E8EE",
  surface: "#F5F8FA",
  white: "#FFFFFF",
  success: "#00A6A6",
  danger: "#D93A2B",
};

const EASE = { o: { x: 0.33, y: 0 }, i: { x: 0.2, y: 1 } };
export const ease = {
  out: EASE,
  inOut: { o: { x: 0.65, y: 0 }, i: { x: 0.35, y: 1 } },
  linear: { o: { x: 0, y: 0 }, i: { x: 1, y: 1 } },
  back: { o: { x: 0.34, y: 0 }, i: { x: 0.2, y: 1.4 } },
};

export function hex(color, alpha = 1) {
  const n = parseInt(color.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
}

const asArray = (v) => (Array.isArray(v) ? v : [v]);

/** Properti beranimasi: frames = [[t, value, easing?], ...] */
export function anim(frames, easing = ease.out) {
  return {
    a: 1,
    k: frames.map(([t, v, e], index) =>
      index === frames.length - 1
        ? { t, s: asArray(v) }
        : { t, s: asArray(v), o: (e ?? easing).o, i: (e ?? easing).i },
    ),
  };
}

const prop = (v) => (v && typeof v === "object" && "a" in v ? v : { a: 0, k: v });

const with3d = (v) => {
  if (v && typeof v === "object" && "a" in v) {
    if (v.a === 0) return { a: 0, k: [...v.k, 0].slice(0, 3) };
    return { a: 1, k: v.k.map((kf) => ({ ...kf, s: [...kf.s, 0].slice(0, 3) })) };
  }
  return { a: 0, k: [...v, 0].slice(0, 3) };
};

export const rect = (w, h, r = 0, p = [0, 0]) => ({ ty: "rc", d: 1, s: prop([w, h]), p: prop(p), r: prop(r) });
export const ellipse = (w, h, p = [0, 0]) => ({ ty: "el", d: 1, s: prop([w, h]), p: prop(p) });

/** Path lurus (tanpa kurva) dari titik-titik. */
export function path(points, closed = false) {
  const zero = points.map(() => [0, 0]);
  return { ty: "sh", ks: prop({ i: zero, o: zero, v: points, c: closed }) };
}

/** Path dengan tangen kurva: [[x, y, inX, inY, outX, outY], ...] */
export function curve(points, closed = false) {
  return {
    ty: "sh",
    ks: prop({
      v: points.map(([x, y]) => [x, y]),
      i: points.map(([, , ix = 0, iy = 0]) => [ix, iy]),
      o: points.map(([, , , , ox = 0, oy = 0]) => [ox, oy]),
      c: closed,
    }),
  };
}

export const fill = (color, opacity = 100) => ({ ty: "fl", c: prop(hex(color)), o: prop(opacity), r: 1 });

export function stroke(color, width = 2, { opacity = 100, dash, offset = 0 } = {}) {
  const shape = { ty: "st", c: prop(hex(color)), o: prop(opacity), w: prop(width), lc: 2, lj: 2, ml: 4 };
  if (dash) {
    shape.d = [
      { n: "d", nm: "dash", v: prop(dash[0]) },
      { n: "g", nm: "gap", v: prop(dash[1]) },
      { n: "o", nm: "offset", v: prop(offset) },
    ];
  }
  return shape;
}

export const trim = (start = 0, end = 100, offset = 0) => ({ ty: "tm", s: prop(start), e: prop(end), o: prop(offset), m: 1 });

export function group(items, { p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100 } = {}) {
  return {
    ty: "gr",
    it: [
      ...items,
      { ty: "tr", p: prop(p), a: prop(a), s: prop(s), r: prop(r), o: prop(o), sk: prop(0), sa: prop(0) },
    ],
  };
}

let layerIndex = 0;
export function layer(name, shapes, { p = [0, 0], a = [0, 0], s = [100, 100], r = 0, o = 100, parent, ip = 0, op } = {}) {
  layerIndex += 1;
  const l = {
    ddd: 0,
    ind: layerIndex,
    ty: 4,
    nm: name,
    sr: 1,
    ks: { o: prop(o), r: prop(r), p: with3d(p), a: with3d(a), s: with3d(s) },
    ao: 0,
    shapes: asArray(shapes),
    ip,
    op,
    st: 0,
    bm: 0,
  };
  if (parent) l.parent = parent;
  return l;
}

/** Layer null (tanpa gambar) untuk menggerakkan beberapa layer sekaligus. */
export function nullLayer(name, transform = {}) {
  const l = layer(name, [], transform);
  l.ty = 3;
  delete l.shapes;
  return l;
}

export function composition(name, { w, h, frames, layers }) {
  // Layer pertama di array dirender paling atas — tulis daftar dari belakang ke depan agar mudah dibaca.
  const ordered = [...layers].reverse().map((l) => ({ ...l, op: l.op ?? frames }));
  layerIndex = 0;
  return { v: "5.7.4", fr: FPS, ip: 0, op: frames, w, h, nm: name, ddd: 0, assets: [], layers: ordered };
}

/** Loop ping-pong sederhana: nilai a → b → a dalam satu siklus. */
export const pingPong = (a, b, frames, offset = 0, easing = ease.inOut) =>
  anim([[offset, a], [offset + frames / 2, b], [offset + frames, a]], easing);
