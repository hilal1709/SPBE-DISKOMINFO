/**
 * Geometri logo "Gapura Lapisan": lima lapisan arsitektur (bisnis, layanan, data, aplikasi, infrastruktur)
 * bertumpuk menjadi gapura paduraksa bertingkat, dengan pintu yang membelah dua lapisan dasar.
 * Satu sumber untuk komponen, favicon, dan apple-icon. Hex di sini adalah aset merek (bukan UI), jadi boleh ditulis langsung.
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

type Cut = { size: number; height: number; gap: number; widths: number[]; door: number; lift: number };

const order: LogoBar["color"][] = ["teal", "yellow", "amber", "orange", "sky"];
const round = (n: number) => Math.round(n * 100) / 100;

function build({ size, height, gap, widths, door, lift }: Cut): LogoBar[] {
  const top = (size - (5 * height + 4 * gap)) / 2 - lift;
  const cx = size / 2;
  return widths.flatMap((w, row) => {
    const y = round(top + row * (height + gap));
    const color = order[row];
    if (row < 3) return [{ row, x: round(cx - w / 2), y, w, color }];
    // Dua lapisan dasar dibelah pintu gapura.
    const half = round((w - door) / 2);
    return [
      { row, x: round(cx - w / 2), y, w: half, color },
      { row, x: round(cx + door / 2), y, w: half, color },
    ];
  });
}

/** Potongan utama (petak 40), naik 0,4 agar tampak berada di tengah secara optis. */
const main: Cut = { size: 40, height: 4.4, gap: 1.2, widths: [8, 13, 18, 23, 28], door: 4.4, lift: 0.4 };
/** Potongan kecil (petak 32) yang jatuh tepat di piksel pada 16 dan 32 px; untuk favicon. */
const small: Cut = { size: 32, height: 4, gap: 2, widths: [8, 12, 18, 22, 28], door: 4, lift: 0 };

export const LOGO_BAR_HEIGHT = main.height;
export const LOGO_VIEWBOX = main.size;
export const logoBars = build(main);

/**
 * Markup SVG mandiri (untuk favicon, ImageResponse, data URI). `cut="small"` untuk ukuran ≤ 32 px;
 * `rounded=false` untuk petak penuh (apple-icon, karena iOS membulatkan sudutnya sendiri).
 */
export function logoSvg(size = 40, cut: "main" | "small" = "main", rounded = true) {
  const spec = cut === "small" ? small : main;
  const bars = build(spec)
    .map((b) => `<rect x="${b.x}" y="${b.y}" width="${b.w}" height="${spec.height}" rx="${spec.height / 2}" fill="${logoColors[b.color]}"/>`)
    .join("");
  const s = spec.size;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${s} ${s}"><rect width="${s}" height="${s}" rx="${rounded ? s / 4 : 0}" fill="${logoColors.tile}"/>${bars}</svg>`;
}
