<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Design system (wajib)

Semua UI mengikuti `docs/design-system.md` (versi interaktif: `/design-system`). Ringkasnya:

- Komponen: **shadcn/ui** di `components/ui` + pola aplikasi di `components/blocks`. Tambah dengan `pnpm dlx shadcn@latest add <nama>`.
- Animasi & micro-interaction: **GSAP** lewat `@/components/motion/gsap` (`useGSAP`, `MOTION_OK`). Hormati `prefers-reduced-motion`. Referensi pola dari **21st.dev**.
- Ikon: **Hugeicons** lewat `<Icon icon={...}/>` (`@/components/icon`). Jangan overuse: hanya untuk navigasi, aksi, dan input. Jangan pakai lucide-react.
- Ilustrasi: **Lottie** lewat `<Illustration/>` / `<EmptyState/>`. Untuk keadaan kosong, sukses, error, 404, dan sambutan pakai ilustrasi, bukan ikon besar. Ilustrasi baru dibuat di `scripts/lottie/build.mjs`, lalu jalankan `pnpm illustrations`.
- Grafik: **Chart.js** lewat `@/components/charts` (`BarChart`, `DoughnutChart`, `Sparkline`), warna seri pakai token (`"--brand-teal"`).
- Loading: `loading.tsx` per segmen, `Button loading`, `<Loader/>`, `<Skeleton/>`.
- Warna: palet Diskominfo (`#BBDEF0 #00A6A6 #EFCA08 #F49F0A #F08700 #2D2D2F`) hanya lewat token di `app/globals.css` (`bg-brand-*`, `bg-primary`, …). Jangan menulis hex di komponen.
- Modal (`DetailDialog`), toast (`toast`, `toast.promise`, aksi Urungkan), dan banner (`<Banner/>`) memakai gaya design system. Jangan membuat varian sendiri.
- Logo: `<Logo/>` / `<LogoMark/>` dari `@/components/brand/logo`.
- Tulis seringkas mungkin: jangan mengulang judul header, periode, atau deskripsi yang sudah tersirat.
