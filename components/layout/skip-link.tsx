import { MAIN_CONTENT_ID } from "@/lib/constants";

/** Tautan pertama di halaman untuk pengguna keyboard & pembaca layar; hanya tampil saat difokus. */
export function SkipLink() {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="fixed left-4 top-3 z-50 -translate-y-[200%] rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-lg transition-transform focus-visible:translate-y-0"
    >
      Lewati ke konten utama
    </a>
  );
}
