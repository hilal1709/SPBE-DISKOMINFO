/** UUID kosong: cakupan OPD yang pasti tidak cocok dengan baris mana pun (pengguna tanpa OPD). */
export const NIL_UUID = "00000000-0000-0000-0000-000000000000";

/** Parameter rute `[id]` berbentuk UUID; selain itu langsung 404 tanpa query ke database. */
export const isUuid = (value: string) => /^[0-9a-f-]{36}$/i.test(value);

/** Target tautan "Lewati ke konten utama" di kerangka portal dan CMS. */
export const MAIN_CONTENT_ID = "konten";
