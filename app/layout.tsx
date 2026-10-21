import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-jakarta" });

/** Sembunyikan kartu petunjuk dashboard yang pernah ditutup sebelum halaman tampil (components/dashboards/probis/explore-hint.tsx). */
const HINT_SCRIPT = `try{var c="";for(var i=0;i<localStorage.length;i++){var k=localStorage.key(i);if(/-hint$/.test(k)&&localStorage.getItem(k)==="1")c+='[data-hint="'+k.replace(/"/g,"")+'"]{display:none!important}'}if(c){var s=document.createElement("style");s.textContent=c;document.head.appendChild(s)}}catch(e){}`;

export const metadata: Metadata = { title: "SPBE Gresik", description: "CMS Arsitektur SPBE Kabupaten Gresik" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={jakarta.variable}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HINT_SCRIPT }} />
      </head>
      <body>
        {/* Tanpa JavaScript, elemen beranimasi tetap harus terlihat. */}
        <noscript>
          <style>{"[data-reveal],[data-aos]{opacity:1!important;transform:none!important;filter:none!important}"}</style>
        </noscript>
        <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" closeButton />
      </body>
    </html>
  );
}
