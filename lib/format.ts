const numberFormat = new Intl.NumberFormat("id-ID");

/** Angka dengan pemisah ribuan Indonesia, mis. 12.345. */
export const formatNumber = (value: number) => numberFormat.format(value);

/**
 * Persentase `part` terhadap `whole` (0–100) dengan satu desimal, sama di semua kartu, gauge, dan teks (F7:
 * 57 dari 103 = 55,3%). `whole` 0 dianggap 1 agar tidak membagi nol.
 */
export const percent = (part: number, whole: number) => Math.round((part / (whole || 1)) * 1000) / 10;

const percentFormat = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

/** Teks persentase satu desimal, mis. "55,3%". */
export const formatPercent = (part: number, whole: number) => `${percentFormat.format(percent(part, whole))}%`;
