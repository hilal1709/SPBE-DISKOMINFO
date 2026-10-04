/**
 * Geometri logo "Lapisan arsitektur": lima lapisan (bisnis, layanan, data, aplikasi, infrastruktur)
 * bertumpuk di atas petak charcoal dan membentuk huruf G. Satu sumber untuk komponen, favicon, dan apple-icon.
 * Hex di sini adalah aset merek (bukan UI), jadi boleh ditulis langsung.
 */
export const logoColors = {
  tile: "#2D2D2F",
  teal: "#00A6A6",
  yellow: "#EFCA08",
  amber: "#F49F0A",
  orange: "#F08700",
  sky: "#BBDEF0",
} as const;

export type LogoBar = { x: number; y: number; w: number; color: keyof typeof logoColors; row: number };

const H = 4.4;
const rowY = (row: number) => Math.round((7 + row * (H + 1)) * 10) / 10;

export const LOGO_BAR_HEIGHT = H;
export const LOGO_VIEWBOX = 40;

export const logoBars: LogoBar[] = [
  { row: 0, x: 11, y: rowY(0), w: 22, color: "teal" },
  { row: 1, x: 7, y: rowY(1), w: 9, color: "yellow" },
  { row: 2, x: 7, y: rowY(2), w: 9, color: "amber" },
  { row: 2, x: 21, y: rowY(2), w: 12, color: "amber" },
  { row: 3, x: 7, y: rowY(3), w: 26, color: "orange" },
  { row: 4, x: 11, y: rowY(4), w: 18, color: "sky" },
];

/** Markup SVG mandiri (untuk ImageResponse / data URI). */
export function logoSvg(size = 40) {
  const bars = logoBars
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${H}" rx="${H / 2}" fill="${logoColors[b.color]}"/>`)
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 40"><rect width="40" height="40" rx="10" fill="${logoColors.tile}"/>${bars}</svg>`;
}
