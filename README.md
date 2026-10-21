## SPBE Kabupaten Gresik

Portal arsitektur SPBE (dashboard publik) dan CMS. Modul dibangun bertahap; saat ini **Proses Bisnis**, **Layanan**, **Data**, **Aplikasi**, **Infrastruktur**, dan **Keamanan** sudah lengkap; Gap Analysis dan Peta Rencana menyusul (notulen: Gap Analysis wajib sebelum Peta Rencana).

### Menjalankan

1. Salin `.env.example` menjadi `.env.local`, isi `DATABASE_URL` dan `AUTH_SECRET` (wajib untuk `pnpm build && pnpm start`).
2. `pnpm migrate` — skema dasar (bila database kosong) lalu migrasi di `database/migrations/` (dicatat di tabel `schema_migrations`).
   Superadmin pertama: `pnpm admin:buat <email> "<nama>"` (sandi sementara acak, wajib diganti saat masuk).
3. (Opsional) `pnpm seed:contoh` mengisi 3.501 probis contoh dan `pnpm seed:layanan` ±460 layanan contoh (status Tervalidasi, ditandai *contoh*; jalankan probis dulu agar tautan layanan → probis terisi). Tambahkan `--hapus` untuk menghapus; tim Diskominfo juga bisa menghapus keduanya dari banner di CMS.
4. `pnpm dev`.

Di production `/cms` selalu wajib login; `AUTH_REQUIRED=false` hanya membuka mode demo di `pnpm dev`. Semua akun dengan sandi demo yang tertulis di repositori dinonaktifkan oleh migrasi 019 dan 021. Keamanan (header, rate limit, pengujian Strix): lihat `docs/security-testing.md`.

### CMS Proses Bisnis

- Alur: Operator OPD (draf → ajukan) → **Verifikasi** oleh tim Bagian Organisasi → **Validasi** oleh tim Diskominfo → tampil di dashboard publik. Tiap tim punya menu dan antreannya sendiri; dikembalikan wajib dengan catatan dan tercatat di riwayat.
- Periode arsitektur dikelola di *Pengaturan › Periode Arsitektur* (2–5 tahun, satu periode aktif). Kode probis unik per periode.
- Form: pilih RAB Level 3 dan Level 1–2 terisi otomatis. Tombol **Isi dengan AI** memakai Gemini (gratis) bila `GEMINI_API_KEY` diisi, selain itu heuristik lokal.
- Impor/ekspor memakai kolom template `public/templates/proses-bisnis.xlsx` (bisa .xlsx atau .zip paket arsitektur).
- **Referensi RAB berversi** (Level 1–5) disimpan di database dan dikelola di *Pengaturan › Referensi RAB*:
  - Perubahan nama/kode/induk/status dilakukan pada **versi draf** (salinan versi terbit), lalu **diterbitkan**. Versi terbit hanya boleh koreksi nama.
  - Tiap periode memakai satu versi (*Periode Arsitektur › Versi RAB*). Saat diganti, RAB setiap probis dipetakan otomatis lewat asal-usul node; yang tidak punya padanan ditandai **Perlu pemetaan RAB**. Periode lama tetap menampilkan RAB versinya sendiri.
  - Semua perubahan tercatat di riwayat versi.
  - Opsional: `node scripts/extract-reference.mjs --db --versi "Nama"` membuat versi draf dari template Excel (mis. bila analis mengisi sheet RAB Level 4/5). `lib/probis/rab-reference.json` hanya cadangan bawaan.

### CMS Layanan

- Kolom mengikuti template analis `public/templates/layanan.xlsx` (Domain Arsitektur Layanan): tujuan, fungsi, unit pelaksana, target, metode, RAL L1–L5, urusan (RAB L2), K/L terkait, manfaat, potensi ekonomi, risiko & mitigasi, dan proses bisnis yang dilayani.
- Target (Masyarakat / Pelaku Usaha / ASN / Pemerintah) dan metode (Elektronik / Hybrid / Tatap muka) berupa pilihan tetap; Elektronik & Hybrid dihitung terdigitalisasi di dashboard `/layanan`.
- Alur sama dengan probis: Operator OPD → **Verifikasi** Bagian Organisasi → **Validasi** Diskominfo → tayang di `/layanan`. ID otomatis `GSK-LYN <kode RAL L3>.<urutan>`.
- **Referensi RAL berversi** di *Pengaturan › Referensi RAL* bekerja persis seperti RAB (mesinnya sama: `lib/reference/versioned.ts`). Tiap periode memilih versi RAB dan versi RAL di *Periode Arsitektur*; saat versi RAL diganti, RAL setiap layanan dipetakan otomatis dan yang tak berpadanan ditandai **Perlu pemetaan RAL**.
- Impor/ekspor memakai kolom template analis (`/cms/layanan/impor`); kolom target/metode teks bebas dibaca otomatis (ditandai bila ditebak), proses bisnis dicocokkan lewat ID atau nama. **Isi dengan AI** memakai Gemini bila `GEMINI_API_KEY` diisi.
- `pnpm referensi:ral` membuat ulang `lib/layanan/ral-reference.json` dari template analis.

### CMS Data

- Kolom mengikuti template analis `public/templates/data.xlsx` (Domain Arsitektur Data dan Informasi): uraian, tujuan, produsen & wali data, informasi terkait (output/input), RAD L1–L4, sifat (Terbuka/Terbatas/Tertutup), jenis, validitas (frekuensi pemutakhiran), interoperabilitas, ← proses bisnis, → layanan, dan 7 dependensi Keamanan SPBE (ditautkan ke kegiatan keamanan, lihat CMS Keamanan).
- Alur: Operator OPD → **Verifikasi** Verifikator Data Diskominfo (peran `validator_data`, sesuai Detailing Requirement & notulen) → **Validasi** Diskominfo → tayang di `/data`. Probis adalah master: data wajib ditautkan ke minimal satu proses bisnis. ID otomatis `GSK-DAT <kode RAD>.<urutan>`.
- **Referensi RAD berversi** di *Pengaturan › Referensi RAD* (mesin sama dengan RAB/RAL). Tiap periode memilih versi RAD di *Periode Arsitektur*; RAD Level 2 tanpa turunan (mis. RAD.10.04) boleh dipakai langsung.
- Impor/ekspor di `/cms/data/impor`: unggah template Data atau zip paket arsitektur semua domain (berkas Data dibaca, domain lain dilewati).
- Dashboard `/data` membaca data tervalidasi; bila kosong memakai data contoh (`lib/data/generate.ts`). `pnpm seed:data` mengisi data contoh ke database (`--hapus` untuk menghapus).
- `pnpm referensi:rad` membuat ulang `lib/data/rad-reference.json` dari template analis (`--sql` mencetak INSERT untuk migrasi).

### CMS Aplikasi

- Kolom mengikuti template analis `public/templates/aplikasi.xlsx` (Domain Arsitektur Aplikasi, 32 kolom): uraian, fungsi, luaran, **mesin basis data** (notulen: bukan "nama basis data"), basis (Web Based/Desktop/Mobile/Cloud), lisensi, bahasa & kerangka, RAA, → layanan, → data, ← proses bisnis, aliran data (inputan, supplier, luaran, customer), dependensi infrastruktur (komputasi awan, server, SPLP, JIP), unit pengembang, unit operasional teknologi, dan 7 dependensi Keamanan SPBE (ditautkan ke kegiatan keamanan).
- Alur: Operator OPD (unit operasional) → **Verifikasi** Admin Verifikator Aplikasi Diskominfo (peran `validator_aplikasi`) → **Validasi** Diskominfo → tayang di `/aplikasi`. ID otomatis `GSK-APL <kode RAA>.<urutan>`.
- Sesuai notulen, aplikasi **wajib selaras proses bisnis yang sudah disetujui**: pilihan probis hanya yang tervalidasi, simpan ditolak bila probis belum disetujui, dan ajuan/verifikasi/validasi ditolak bila tautan probis tervalidasi hilang. Tabel hanya kolom inti; kolom lain di pop-up detail.
- **Kepemilikan** (Pemda / Instansi Pusat / Pihak Ketiga) tidak ada di template; diturunkan dari unit pengembang (`kepemilikanOf` di `lib/aplikasi/reference.ts`).
- Form **Isi dengan AI** (`lib/ai/aplikasi-suggest.ts`): uraian, fungsi, luaran, RAA, basis, serta proses bisnis & layanan yang paling selaras (Gemini bila `GEMINI_API_KEY` ada, selain itu heuristik lokal).
- **Referensi RAA berversi** di *Pengaturan › Referensi RAA* (mesin sama dengan RAB/RAL/RAD; template baru sampai Level 2, jadi RAA L2 tanpa turunan dipakai langsung). Tiap periode memilih versi RAA di *Periode Arsitektur*. `pnpm referensi:raa` membuat ulang `lib/aplikasi/raa-reference.json` (`--sql` mencetak INSERT untuk migrasi).
- Impor/ekspor di `/cms/aplikasi/impor`: unggah template Aplikasi atau zip paket arsitektur; ekspor memakai 32 kolom template (+ periode & status).
- Dashboard `/aplikasi` membaca aplikasi tervalidasi; bila kosong memakai data contoh (`lib/aplikasi/generate.ts`). `pnpm seed:aplikasi` mengisi aplikasi contoh ke database (`--hapus` untuk menghapus; jalankan `seed:contoh`, `seed:layanan`, `seed:data` dulu agar tautannya terisi).

### CMS Infrastruktur

- Mengikuti **10 template analis** "Domain Arsitektur Infrastruktur - *.xlsx" (asli di `public/templates/infrastruktur/`): Fasilitas Komputasi, Komputasi Awan, Perangkat Keras Server/Jaringan/Keamanan/Media Penyimpan/Periferal, Perangkat Lunak Platform, Jaringan Intra Pemerintah (JIP), dan Sistem Penghubung Layanan Pemerintah (SPLP).
- Satu tabel `infrastructures`: kolom bersama (nama, deskripsi, pemilik, status kepemilikan, unit pengelola, RAI, instansi, 7 dependensi Keamanan SPBE) + kolom khusus tiap komponen di `attributes`. Konfigurasi komponen (kolom, pilihan, relasi yang diizinkan, header template) ada di `lib/infrastruktur/jenis.ts` dan dipakai form, impor, ekspor, detail, serta dashboard.
- Relasi mengikuti kolom template: antarkomponen (mis. server → platform → fasilitas), ← aplikasi, data, → proses bisnis tervalidasi. Relasi ke jenis yang tidak ada di template ditolak.
- Dashboard `/infrastruktur` juga mencocokkan aplikasi lewat kolom infrastruktur aplikasi (komputasi awan, server, SPLP, JIP) dengan nama komponen.
- Alur: Operator OPD → **Verifikasi** Admin Verifikator Infrastruktur Diskominfo (`validator_infrastruktur`) → **Validasi** Diskominfo → tayang. ID otomatis `GSK-INF <kode RAI>.<urutan>`.
- **Referensi RAI berversi** di *Pengaturan › Referensi RAI* (mesin sama dengan RAB/RAL/RAD/RAA; L2 tanpa turunan dipakai langsung). Template analis memberi kode ganda `RAI.02.01` untuk JIP dan SPLP; ekstraksi menomori SPLP menjadi `RAI.02.02`. `pnpm referensi:rai` membuat ulang `lib/infrastruktur/rai-reference.json` (`--sql` mencetak INSERT).
- Impor di `/cms/infrastruktur/impor`: satu workbook komponen, workbook gabungan `public/templates/infrastruktur.xlsx` (`pnpm template:infrastruktur`), atau zip folder Infrastruktur / paket arsitektur. Komponen dikenali dari nama berkas/sheet; relasi dalam satu unggahan ditautkan lewat nama. Ekspor satu sheet per komponen dan bisa diimpor ulang.
- `pnpm seed:infrastruktur` mengisi komponen contoh (`--hapus` untuk menghapus).

### CMS Keamanan

- Mengikuti **7 template analis** Domain Arsitektur Keamanan (asli di `public/templates/keamanan/`): Standar Teknis dan Prosedur; Penerapan (edukasi kesadaran, identifikasi kerentanan, peningkatan, penanganan insiden, audit); Kelaikan. Kuncinya sama dengan `securityFields` (dependensi keamanan di Data, Aplikasi, Infrastruktur).
- Tabel `security_activities`: nama, deskripsi, tanggal, instansi, kolom khusus (`lib/keamanan/jenis.ts`) — jenis & tanggal akhir standar, jenis/hasil/tindak lanjut audit, nilai kematangan penanganan insiden (0–5).
- Alur: Operator OPD → **Verifikasi** Admin Verifikator Keamanan Diskominfo (`validator_keamanan`) → **Validasi** Diskominfo → tayang di `/keamanan`. ID otomatis `GSK-KAM <STD|EDU|KRT|PNK|INS|AUD|KLK>.<urutan>`.
- Dashboard `/keamanan` **wajib login** (proxy mengarahkan ke `/login?callbackUrl=/keamanan`) dan hanya untuk tim Diskominfo & pimpinan (`can.viewKeamanan`); operator OPD dan Bagian Organisasi melihat pesan akses ditolak. Isinya: siklus 7 kegiatan, kegiatan per tahun, standar berlaku, dan **cakupan dependensi** (berapa persen data, aplikasi, infrastruktur tervalidasi yang mencantumkan tiap kegiatan keamanan).
- **Tautan dependensi keamanan**: form Data, Aplikasi, dan Infrastruktur memilih kegiatan keamanan tervalidasi pada periode yang sama; kolom `security` menyimpan kode kegiatan (`lib/keamanan/link.ts`). Isian teks lama tetap tampil apa adanya. Impor mencocokkan kode, "kode nama", atau nama kegiatan; ekspor menulis "kode nama".
- Impor menerima tanggal Excel maupun teks (12/03/2025, 12 Maret 2025); template gabungan `public/templates/keamanan.xlsx` (`pnpm template:keamanan`). `pnpm seed:keamanan` mengisi kegiatan contoh dan menautkannya ke data, aplikasi, serta infrastruktur contoh.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
