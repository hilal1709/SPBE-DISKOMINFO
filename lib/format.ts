const numberFormat = new Intl.NumberFormat("id-ID");

/** Angka dengan pemisah ribuan Indonesia, mis. 12.345. */
export const formatNumber = (value: number) => numberFormat.format(value);

/** Persentase bulat `part` terhadap `whole` (0–100); `whole` 0 dianggap 1 agar tidak membagi nol. */
export const percent = (part: number, whole: number) => Math.round((part / (whole || 1)) * 100);
