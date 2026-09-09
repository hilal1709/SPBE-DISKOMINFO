import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "SPBE Gresik", description: "CMS Arsitektur SPBE Kabupaten Gresik" };
export default function RootLayout({ children }: LayoutProps<"/">) { return <html lang="id"><body>{children}</body></html>; }
