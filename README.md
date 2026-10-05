## SPBE Kabupaten Gresik

Portal arsitektur SPBE (dashboard publik) dan CMS. Modul dibangun bertahap; saat ini **Proses Bisnis** dan **Layanan** sudah lengkap, domain lain menyusul.

### Menjalankan

1. Salin `.env.example` menjadi `.env.local`, isi `DATABASE_URL` dan `AUTH_SECRET` (wajib untuk `pnpm build && pnpm start`).
2. `pnpm migrate` — skema dasar (bila database kosong) lalu migrasi di `database/migrations/` (dicatat di tabel `schema_migrations`).
3. (Opsional) `pnpm seed:contoh` mengisi 3.501 probis contoh dan `pnpm seed:layanan` ±460 layanan contoh (status Tervalidasi, ditandai *contoh*; jalankan probis dulu agar tautan layanan → probis terisi). Tambahkan `--hapus` untuk menghapus; tim Diskominfo juga bisa menghapus keduanya dari banner di CMS.
4. `pnpm dev`.

`AUTH_REQUIRED=true` mewajibkan login di `/cms`. Akun demo per peran (operator, organisasi, validator, pimpinan `@gresikkab.go.id`) dan kata sandinya ada di `database/migrations/004_opd_and_demo_users.sql` — ganti sebelum produksi.

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

- Kolom mengikuti template analis `public/templates/data.xlsx` (Domain Arsitektur Data dan Informasi): uraian, tujuan, produsen & wali data, informasi terkait (output/input), RAD L1–L4, sifat (Terbuka/Terbatas/Tertutup), jenis, validitas (frekuensi pemutakhiran), interoperabilitas, ← proses bisnis, → layanan, dan 7 dependensi Keamanan SPBE (teks, ditautkan saat modul Keamanan tersedia).
- Alur: Operator OPD → **Verifikasi** Verifikator Data Diskominfo (peran `validator_data`, sesuai Detailing Requirement & notulen) → **Validasi** Diskominfo → tayang di `/data`. Probis adalah master: data wajib ditautkan ke minimal satu proses bisnis. ID otomatis `GSK-DAT <kode RAD>.<urutan>`.
- **Referensi RAD berversi** di *Pengaturan › Referensi RAD* (mesin sama dengan RAB/RAL). Tiap periode memilih versi RAD di *Periode Arsitektur*; RAD Level 2 tanpa turunan (mis. RAD.10.04) boleh dipakai langsung.
- Impor/ekspor di `/cms/data/impor`: unggah template Data atau zip paket arsitektur semua domain (berkas Data dibaca, domain lain dilewati).
- Dashboard `/data` membaca data tervalidasi; bila kosong memakai data contoh (`lib/data/generate.ts`). `pnpm seed:data` mengisi data contoh ke database (`--hapus` untuk menghapus).
- `pnpm referensi:rad` membuat ulang `lib/data/rad-reference.json` dari template analis (`--sql` mencetak INSERT untuk migrasi).
- Akun demo Verifikator Data: `walidata@gresikkab.go.id` (kata sandi sama dengan akun demo lain).

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
