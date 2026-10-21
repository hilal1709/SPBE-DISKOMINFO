import type { Metadata } from "next";
import { noIndex } from "@/lib/seo";

// Halaman login berupa komponen klien, jadi metadatanya dipasang di sini.
export const metadata: Metadata = { title: "Masuk", ...noIndex };

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
