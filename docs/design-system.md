# Design System SPBE Gresik

Panduan visual dan teknis untuk seluruh UI portal publik dan CMS. Versi interaktifnya ada di **`/design-system`**.

## Stack

| Kebutuhan | Pakai | Lokasi |
| --- | --- | --- |
| Komponen UI | **shadcn/ui** (style `radix-nova`, Radix UI) | `components/ui/*` |
| Animasi & micro-interaction | **GSAP** + `@gsap/react` (`useGSAP`), ScrollTrigger | `components/motion/*` |
| Ikon | **Hugeicons** (`@hugeicons/core-free-icons`) lewat `<Icon/>` | `components/icon.tsx` |
| Ilustrasi & animasi ilustrasi | **Lottie** (`lottie-react`, build svg) | `components/illustrations/*` |
| Referensi pola UI & animasi | **21st.dev** (spotlight card, number ticker, sliding nav, shimmer) | — |
| Notifikasi | `sonner` via `toast()` | `components/ui/sonner.tsx` |

Tambah komponen shadcn baru dengan `pnpm dlx shadcn@latest add <nama>`. `components.json` sudah memakai `iconLibrary: "hugeicons"`, jadi komponen baru langsung memakai Hugeicons. Setelah menambah komponen, pastikan import `cn` mengarah ke `@/lib/utils`.

## Prinsip

1. **Amber untuk aksi, navy untuk struktur.** Amber (`primary`) hanya untuk aksi utama, item aktif, dan sorotan data. Navy (`panel`) untuk sidebar CMS dan panel sambutan.
2. **Ikon seperlunya.** Ikon dipakai hanya untuk navigasi, aksi (export, simpan, kirim, keluar), dan fungsi input (cari, tampilkan sandi). **Jangan** pasang ikon dekoratif di kartu statistik, judul section, atau badge.
3. **Ilustrasi, bukan ikon besar.** Keadaan kosong, sukses, error, 404, modul belum siap, dan panel sambutan memakai `<Illustration/>` atau `<EmptyState/>`.
4. **Gerak yang bermakna.** Animasi menjelaskan perubahan (data masuk, item disetujui, langkah form maju). Durasi 0,2–0,6 s, ease `power3.out`. Semua animasi dekoratif mati otomatis saat `prefers-reduced-motion`.
5. **Selalu ada umpan balik loading.** Route punya `loading.tsx`, tombol async memakai prop `loading`, dan link sidebar menampilkan titik berdenyut selama halaman tujuan dimuat (`useLinkStatus`).

## Token

Semua token didefinisikan di `app/globals.css` (`:root` dan `.dark`) dan tersedia sebagai utilitas Tailwind. **Jangan menulis warna hex di komponen.**

| Token | Utilitas | Pemakaian |
| --- | --- | --- |
| `--primary` `#FFB000` | `bg-primary text-primary-foreground` | Tombol utama, nav aktif, heat map |
| `--secondary` | `bg-secondary text-secondary-foreground` | Badge lembut, link teks aksen |
| `--accent` | `bg-accent` | Permukaan bernuansa amber (kartu sorotan) |
| `--panel` | `bg-panel text-panel-foreground` | Sidebar CMS, panel login |
| `--success` / `--warning` / `--destructive` | `text-success bg-success-soft`, dst. | Status |
| `--muted` / `--muted-foreground` | `bg-muted text-muted-foreground` | Latar netral & teks pendukung |
| `--shadow-card` / `--shadow-raised` | `shadow-card` / `shadow-raised` | Kartu diam / kartu terangkat (hover, loader) |
| `--radius` `0.75rem` | `rounded-lg` (dan turunannya) | Sudut |

Teks di atas amber memakai `text-primary-foreground` (cokelat gelap). Teks putih di atas amber tidak memenuhi kontras WCAG.

**Tipografi:** Plus Jakarta Sans (`--font-jakarta`).
- `.eyebrow`: label 11px kapital.
- `text-2xl font-bold`: judul halaman.
- `.section-title`: judul section dengan aksen amber.
- `text-3xl font-bold tabular-nums`: angka statistik.

## Struktur komponen

```
components/
  ui/            shadcn (boleh disesuaikan: Button.loading, Badge success/warning/muted)
  icon.tsx       <Icon icon={...}/>, pembungkus tunggal Hugeicons
  motion/        GSAP: Reveal, CountUp, Meter, SpotlightCard, PageTransition, gsap.ts
  illustrations/ <Illustration name=.../> + data/*.json (hasil generator)
  loader.tsx     Loader bermerek (Lottie "loader")
  blocks/        Pola tingkat aplikasi: StatCard, FilterBar, DataTable, DetailDialog,
                 StatusBadge, HeatTile, PageHeader, EmptyState, DashboardSkeleton
  layout/        PublicShell, CmsShell, SidebarNav, Brand
  dashboards/    Dashboard domain portal publik
  portal/        Halaman portal lain (katalog, pengajuan, verifikasi, …)
  cms/           Halaman CMS
```

Halaman (`app/**/page.tsx`) cukup merangkai komponen. Shell dipasang di layout: `app/(public)/layout.tsx` dan `app/cms/layout.tsx`.

## Animasi (GSAP)

- Selalu impor dari `@/components/motion/gsap`. File itu sudah mendaftarkan `useGSAP` dan `ScrollTrigger` serta menyediakan `MOTION_OK`.
- Bungkus animasi dekoratif dengan `gsap.matchMedia().add(MOTION_OK, …)`.
- Animasi saat render/mount pakai `useGSAP`. Untuk event handler cukup panggil `gsap.to(...)` langsung; jangan pakai `contextSafe` karena dilarang oleh aturan lint React Compiler.
- **Reveal:** bungkus halaman dengan `<Reveal>` dan beri `data-reveal` pada section yang selalu dirender. Section muncul berurutan saat masuk viewport. Elemen yang baru muncul belakangan (hasil filter, tab) jangan diberi `data-reveal`, karena akan tetap tersembunyi.
- Pola micro-interaction (referensi 21st.dev) dan tempat pakainya:

| Pola | Dipakai di |
| --- | --- |
| Spotlight card (sorotan mengikuti kursor + angkat) | `StatCard` |
| Number ticker (`CountUp`) | Angka statistik |
| Sliding highlight | `SidebarNav` |
| Progress grow (`Meter`) | Bar persentase |
| Stepper progress | `ServiceForm` |
| Shake | Login gagal |
| Collapse & slide | Item verifikasi disetujui/dikembalikan |
| Nudge ikon panah saat hover | `group-hover:translate-x-0.5` |
| Press scale | Semua `Button` |

## Ilustrasi (Lottie)

Ilustrasi dibuat dari kode, bukan aset unduhan, agar ringan (6–21 KB) dan konsisten dengan palet.

| Nama | Dipakai untuk |
| --- | --- |
| `loader` | Loading route & `<Loader/>` |
| `empty` | Data kosong / hasil pencarian kosong |
| `login-hero` | Panel sambutan login (latar navy) |
| `not-found` | Halaman 404 |
| `error` | `error.tsx` |
| `building` | Modul CMS yang belum siap |
| `success` | Pengajuan berhasil (`loop={false}`) |

Cara menambah atau mengubah ilustrasi:
1. Edit atau tambah fungsi di `scripts/lottie/build.mjs`. Helper ada di `scripts/lottie/lib.mjs`, dan warna wajib dari `palette`.
2. Jalankan `pnpm illustrations` untuk menghasilkan `components/illustrations/data/*.json`.
3. Daftarkan nama baru di `catalog` pada `components/illustrations/illustration.tsx`, lengkap dengan `ratio` dan frame `still` untuk reduced motion.

`<Illustration/>` memuat JSON secara lazy dan hanya di klien. Saat reduced motion aktif, ilustrasi berhenti di frame `still`. Beri `label` bila ilustrasi menyampaikan informasi; kosongkan bila dekoratif.

## Loading

| Situasi | Pakai |
| --- | --- |
| Pindah route | `loading.tsx` → `<DashboardSkeleton/>` (skeleton + Loader) atau `<Loader/>` |
| Tombol async | `<Button loading={pending}>` |
| Submit form server action | `useActionState` / `useFormStatus` → `loading` |
| Link navigasi | `PendingHint` di `SidebarNav` (`useLinkStatus`) |
| Konten parsial | `<Skeleton/>` |

## Checklist halaman baru

- [ ] Memakai komponen `ui/` dan `blocks/`, bukan elemen HTML bergaya manual.
- [ ] Warna hanya lewat token.
- [ ] Ikon hanya untuk navigasi, aksi, atau input.
- [ ] Keadaan kosong, sukses, dan error memakai ilustrasi.
- [ ] Section dibungkus `<Reveal>` + `data-reveal`.
- [ ] Ada `loading` untuk aksi async.
- [ ] Grid berkolom memberi `*:min-w-0` agar konten panjang tidak meluber.
- [ ] Dicek di lebar 375 px (gutter 16 px, tanpa scroll horizontal).
